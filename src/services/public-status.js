const CACHE_MS = 15_000;
const TIMEOUT_MS = 5_000;
const MAX_BODY_BYTES = 64 * 1024;
const DEGRADED_AFTER_MS = 1_500;

async function readBody(response) {
  if (!response.body?.getReader) throw new Error('invalid_response');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error('body_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(body);
}

async function fetchPage(url, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      redirect: 'manual',
      credentials: 'omit',
      signal: controller.signal,
      headers: { accept: 'text/html,application/json,text/plain' }
    });
    if (response.status !== 200 || response.redirected || response.type === 'opaqueredirect') {
      throw new Error('http_failure');
    }
    const body = await readBody(response);
    return { response, body };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

async function checkSystem(id, urls, validate, options) {
  const started = options.clock();
  try {
    for (const url of urls) {
      const result = await fetchPage(url, options);
      if (!validate(url, result)) throw new Error('invalid_response');
    }
    const responseMs = Math.max(0, options.clock() - started);
    return { status: responseMs >= DEGRADED_AFTER_MS ? 'degraded' : 'operational', response_ms: responseMs };
  } catch (error) {
    options.log({
      level: 'warn',
      msg: 'Public status check failed.',
      system: id,
      code: error.name === 'AbortError' ? 'PUBLIC_STATUS_TIMEOUT' : 'PUBLIC_STATUS_CHECK_FAILED'
    });
    return { status: 'outage', response_ms: Math.max(0, options.clock() - started) };
  }
}

const htmlPage = (_url, { response, body }) =>
  (response.headers.get('content-type') || '').toLowerCase().includes('text/html') &&
  /<!doctype html|<html[\s>]/i.test(body);

export function createPublicStatusChecker({
  config,
  fetchImpl = globalThis.fetch,
  clock = () => Date.now(),
  timeoutMs = TIMEOUT_MS,
  log = () => {},
  checkEmailStatus = async () => 'maintenance'
}) {
  let cached;
  let cacheExpires = 0;
  let inFlight;
  const options = { fetchImpl, clock, timeoutMs, log };

  return async function getPublicStatus() {
    const now = clock();
    if (cached && now < cacheExpires) return cached;
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const site = new URL(config.publicStatusSite);
      const apps = config.mediaTargets?.jellyfin
        ? new URL(config.mediaTargets.jellyfin).origin
        : null;
      const [website, application, portal, email] = await Promise.all([
        checkSystem(
          'website',
          [new URL('/', site).href, new URL('/about/', site).href],
          htmlPage,
          options
        ),
        apps
          ? checkSystem(
            'apps',
            [new URL('/health', `${apps}/`).href],
            (_url, { body }) => body.trim() === 'Healthy',
            options
          )
          : Promise.resolve({ status: 'outage', response_ms: null }),
        checkSystem(
          'portal',
          [new URL('/portal/', site).href, new URL('/api/auth/me', site).href],
          (url, result) => {
            if (url.endsWith('/api/auth/me')) {
              try {
                const data = JSON.parse(result.body);
                return data.state === 'anonymous' && data.user === null;
              } catch {
                return false;
              }
            }
            return htmlPage(url, result);
          },
          options
        ),
        checkEmailStatus()
      ]);
      const checkedAt = new Date(clock()).toISOString();
      cached = {
        checked_at: checkedAt,
        refresh_interval_seconds: 60,
        services: [
          { id: 'website', status: website.status, checked_at: checkedAt, response_ms: website.response_ms },
          { id: 'apps', status: application.status, checked_at: checkedAt, response_ms: application.response_ms },
          { id: 'portal', status: portal.status, checked_at: checkedAt, response_ms: portal.response_ms },
          { id: 'email', status: email, checked_at: checkedAt, response_ms: null },
          { id: 'billing', status: portal.status, checked_at: checkedAt, response_ms: portal.response_ms }
        ]
      };
      cacheExpires = clock() + CACHE_MS;
      return cached;
    })();
    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  };
}
