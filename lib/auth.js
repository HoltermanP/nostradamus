/** Controleer Bearer-token tegen CRON_SECRET (open als secret niet gezet). */
export function checkCronAuth(req) {
  if (!process.env.CRON_SECRET) return true;
  const auth = req.headers["authorization"];
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}
