import { createHash } from 'node:crypto';
import { createConnection } from 'node:net';

const SERVICES = ['jellyfin', 'jellyseerr', 'ubuntu'];
const POLL_INTERVAL_MS = 60_000;
const STALE_AFTER_MS = 150_000;
const MAX_BODY_BYTES = 16 * 1024;
const TIMEOUT_MS = 5_000;
const OPERATIONAL_THRESHOLD_MS = 1_500;

export function mediaTargetFingerprint(target) {
  if (!target) return null;
  return createHash('sha256').update(target).digest('hex');
}

function endpointFor(service, target) {
  const path = service === 'jellyfin' ? '/health' : '/api/v1/status';
  return `${new URL(target).origin}${path}`;
}

async function readBoundedBody(response, maxBytes) {
  if (!response.body?.getReader) throw new Error('invalid_response');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error('body_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(body);
}

function checkTcp(target, signal) {
  const url = new URL(target);
  if (url.protocol !== 'tcp:' || !url.hostname || !url.port) throw new Error('invalid_response');
  return new Promise((resolve, reject) => {
    const socket = createConnection({
      host: url.hostname.replace(/^\[|\]$/g, ''), port: Number(url.port), signal
    });
    socket.once('error', (error) => { socket.destroy(); reject(error); });
    socket.once('connect', () => { socket.destroy(); resolve(); });
  });
}

async function checkTarget(service, target, options) {
  const startedAt = options.clock();
  const controller = new AbortController();
  let timer;
  let abortFromMonitor;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, options.timeoutMs);
  });
  const stopped = options.signal && new Promise((_, reject) => {
    abortFromMonitor = () => {
      controller.abort();
      reject(new Error('stopped'));
    };
    if (options.signal.aborted) abortFromMonitor();
    else options.signal.addEventListener('abort', abortFromMonitor, { once: true });
  });
  const check = (async () => {
    if (service === 'ubuntu') {
      await checkTcp(target, controller.signal);
      return;
    }
    const response = await options.fetchImpl(endpointFor(service, target), {
      method: 'GET',
      redirect: 'manual',
      credentials: 'omit',
      signal: controller.signal,
      headers: { accept: service === 'jellyfin' ? 'text/plain' : 'application/json' }
    });
    if (response.status < 200 || response.status >= 300) throw new Error('http_failure');
    const body = await readBoundedBody(response, options.maxBodyBytes);
    if (service === 'jellyfin') {
      if (body.trim() !== 'Healthy') throw new Error('invalid_response');
    } else {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error('invalid_response');
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
          typeof parsed.version !== 'string' || !parsed.version.trim()) {
        throw new Error('invalid_response');
      }
    }
  })();
  try {
    await Promise.race([check, timeout, ...(stopped ? [stopped] : [])]);
    return { ok: true, responseMs: Math.max(0, options.clock() - startedAt) };
  } catch (error) {
    if (error?.message === 'stopped') return { aborted: true };
    const reason = error?.message === 'timeout' ? 'timeout' :
      ['http_failure', 'invalid_response', 'body_too_large'].includes(error?.message)
        ? error.message
        : 'network_failure';
    return { ok: false, reason, responseMs: Math.max(0, options.clock() - startedAt) };
  } finally {
    clearTimeout(timer);
    if (abortFromMonitor) options.signal.removeEventListener('abort', abortFromMonitor);
    controller.abort();
  }
}

export function mediaStatusView(service, target, row, now = Date.now()) {
  if (!target) {
    return {
      status_source: 'manual', checked_at: null, response_ms: null,
      stale: false, failure_count: 0
    };
  }
  if (!row || row.target_fingerprint !== mediaTargetFingerprint(target)) {
    return {
      status_source: 'automatic', status: 'unknown', checked_at: null,
      response_ms: null, stale: true, failure_count: 0
    };
  }
  const checkedTime = row.checked_at ? new Date(row.checked_at).getTime() : NaN;
  const checkedAt = Number.isFinite(checkedTime) ? new Date(checkedTime).toISOString() : null;
  const stale = !Number.isFinite(checkedTime) || now - checkedTime > STALE_AFTER_MS;
  return {
    status_source: 'automatic',
    status: stale ? 'unknown' : row.status,
    checked_at: checkedAt,
    response_ms: row.response_ms,
    stale,
    failure_count: row.failure_count
  };
}

export async function runMediaMonitorCycle(db, {
  config,
  fetchImpl = globalThis.fetch,
  clock = () => Date.now(),
  timeoutMs = TIMEOUT_MS,
  maxBodyBytes = MAX_BODY_BYTES,
  signal,
  log = () => {}
}) {
  const options = { fetchImpl, clock, timeoutMs, maxBodyBytes, signal };
  for (const service of SERVICES) {
    if (signal?.aborted) return;
    const target = config.mediaTargets?.[service];
    if (!target) continue;
    const fingerprint = mediaTargetFingerprint(target);
    const previous = (await db.query(
      'SELECT target_fingerprint, last_success_at, failure_count FROM media_service_health WHERE service = $1',
      [service]
    )).rows[0];
    const sameTarget = previous?.target_fingerprint === fingerprint;
    if (previous && !sameTarget) {
      await db.query(
        `UPDATE media_service_health
            SET target_fingerprint = $2,
                status = 'unknown',
                checked_at = NULL,
                last_success_at = NULL,
                response_ms = NULL,
                failure_count = 0
          WHERE service = $1`,
        [service, fingerprint]
      );
    }
    const result = await checkTarget(service, target, options);
    if (result.aborted) return;
    const checkedAt = new Date(clock()).toISOString();
    const failureCount = result.ok ? 0 : (sameTarget ? previous.failure_count : 0) + 1;
    const lastSuccessAt = result.ok
      ? checkedAt
      : sameTarget ? previous.last_success_at : null;
    const status = result.ok
      ? result.responseMs < OPERATIONAL_THRESHOLD_MS ? 'operational' : 'degraded'
      : failureCount >= 2 ? 'offline' : 'degraded';
    await db.query(
      `INSERT INTO media_service_health
         (service, target_fingerprint, status, checked_at, last_success_at, response_ms, failure_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (service) DO UPDATE SET
         target_fingerprint = EXCLUDED.target_fingerprint,
         status = EXCLUDED.status,
         checked_at = EXCLUDED.checked_at,
         last_success_at = EXCLUDED.last_success_at,
         response_ms = EXCLUDED.response_ms,
         failure_count = EXCLUDED.failure_count`,
      [service, fingerprint, status, checkedAt, lastSuccessAt, result.responseMs, failureCount]
    );
    if (!result.ok) {
      log({
        level: 'warn',
        msg: `Media monitor check failed for ${service}: ${result.reason}.`
      });
    }
  }
}

export function createMediaMonitor({ db, config, log = () => {}, ...options }) {
  let interval;
  let running = false;
  let stopped = false;
  let activeCycle;
  let cycleAbortController;
  const cycleOptions = { ...options, config, log };

  async function cycle() {
    if (running || stopped) return activeCycle;
    running = true;
    cycleAbortController = new AbortController();
    activeCycle = runMediaMonitorCycle(db, { ...cycleOptions, signal: cycleAbortController.signal })
      .catch((error) => {
        log({ level: 'error', msg: 'Media monitor cycle could not be completed.' });
        throw error;
      })
      .finally(() => { running = false; activeCycle = null; cycleAbortController = null; });
    return activeCycle;
  }

  return {
    start() {
      if (interval || stopped) return;
      void cycle().catch(() => {});
      interval = setInterval(() => { void cycle().catch(() => {}); }, POLL_INTERVAL_MS);
      interval.unref?.();
    },
    async stop() {
      stopped = true;
      clearInterval(interval);
      cycleAbortController?.abort();
      if (activeCycle) await activeCycle.catch(() => {});
    }
  };
}
