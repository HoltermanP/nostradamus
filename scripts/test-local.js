// Lokaal testen zonder mail te versturen:
//   OPENAI_API_KEY=sk-... node scripts/test-local.js
//   OPENAI_API_KEY=sk-... node scripts/test-local.js 2026-06-14   (specifieke datum)
//
// Met --send stuurt 'ie ook echt (vereist SMTP_* en MAIL_TO env-vars):
//   ... node scripts/test-local.js 2026-06-14 --send
import { generateMessage } from "../lib/generate.js";
import { sendMail } from "../lib/mailer.js";

const args = process.argv.slice(2);
const send = args.includes("--send");
const refDate = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));

const { date, text, reason } = await generateMessage(refDate ? { refDate } : {});

if (!text) {
  console.log("Geen bericht:", reason);
  process.exit(0);
}

console.log(`\n=== Speeldag ${date} — ${[...text].length} tekens ===\n`);
console.log(text);
console.log("\n========================================\n");

if (send) {
  await sendMail({ subject: `🔮 Nostradamus voorspelt — WK ${date}`, text });
  console.log("✅ Verzonden naar", process.env.MAIL_TO);
}
