// Programa en Supabase (pg_cron + pg_net) la llamada a /api/cron/orders cada 5 minutos,
// para vencer pedidos y mandar recordatorios. Se puede correr más de una vez.
// Uso: node --env-file=.env.local scripts/setup-cron.mjs [url-del-sitio]
import postgres from "postgres";

const siteUrl = (process.argv[2] ?? "https://www.magosdelsur.com.ar").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("Falta CRON_SECRET en .env.local");
  process.exit(1);
}

const JOB = "magos-pedidos";
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
try {
  await sql`create extension if not exists pg_cron`;
  await sql`create extension if not exists pg_net`;

  const command = `select net.http_post(
    url := '${siteUrl}/api/cron/orders',
    headers := jsonb_build_object('Authorization', 'Bearer ${secret}', 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )`;
  // cron.schedule con el mismo nombre reemplaza la tarea existente.
  await sql`select cron.schedule(${JOB}, '*/5 * * * *', ${command})`;
  const [job] = await sql`select jobname, schedule, active from cron.job where jobname = ${JOB}`;
  console.log(`Tarea programada: ${job.jobname} (${job.schedule}, activa: ${job.active}) → ${siteUrl}/api/cron/orders`);
} finally {
  await sql.end();
}
