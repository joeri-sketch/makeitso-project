export function nextDueDate(dateText, frequency, anchorDay, anchorMonth) {
  const [year, month, day] = dateText.split('-').map(Number);
  const months = { monthly: 1, quarterly: 3, yearly: 12 }[frequency];
  const targetMonthIndex = frequency === 'yearly' ? anchorMonth - 1 : month - 1 + months;
  const targetYear = frequency === 'yearly' ? year + 1 : year + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(Math.min(anchorDay || day, lastDay)).padStart(2, '0')}`;
}

export async function processDueMaintenancePlans(db) {
  return db.tx(async (t) => {
    const { rows: plans } = await t.query(
      `SELECT mp.id, mp.project_id, mp.title, mp.description, mp.frequency, mp.next_due_date,
              mp.anchor_day, mp.anchor_month, CURRENT_DATE::text AS today
         FROM maintenance_plans mp
         JOIN projects p ON p.id = mp.project_id
         JOIN clients c ON c.id = p.client_id
        WHERE mp.active AND p.archived_at IS NULL AND c.archived_at IS NULL AND mp.next_due_date <= CURRENT_DATE
        ORDER BY next_due_date, id
         LIMIT 50
         FOR UPDATE SKIP LOCKED`
    );
    for (const plan of plans) {
      await t.query(
        `INSERT INTO work_items (project_id, title, description, due_date, maintenance_plan_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (maintenance_plan_id, due_date) WHERE maintenance_plan_id IS NOT NULL DO NOTHING`,
        [plan.project_id, plan.title, plan.description, plan.next_due_date, plan.id]
      );
      let nextDate = nextDueDate(String(plan.next_due_date).slice(0, 10), plan.frequency, plan.anchor_day, plan.anchor_month);
      while (nextDate <= String(plan.today).slice(0, 10)) {
        nextDate = nextDueDate(nextDate, plan.frequency, plan.anchor_day, plan.anchor_month);
      }
      await t.query('UPDATE maintenance_plans SET next_due_date = $2, updated_at = now() WHERE id = $1', [plan.id, nextDate]);
    }
    return plans.length;
  });
}

export function createMaintenanceScheduler({ db, log = () => {}, intervalMs = 60_000 }) {
  let timer = null;
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      const created = await processDueMaintenancePlans(db);
      if (created) log({ level: 'info', msg: 'Recurring maintenance tasks generated.', count: created });
    } catch (error) {
      log({ level: 'error', msg: 'Recurring maintenance scheduler failed.', code: error.code || 'MAINTENANCE_SCHEDULER_FAILED' });
    } finally {
      running = false;
    }
  };

  return {
    start() {
      if (timer) return;
      void run();
      timer = setInterval(run, intervalMs);
      timer.unref?.();
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    },
    run
  };
}
