import { generateMessage, todayNL } from "../../lib/generate.js";
import { sendMail } from "../../lib/mailer.js";

/**
 * Vercel Cron endpoint. Draait dagelijks (zie vercel.json: "0 5 * * *" = 07:00 NL zomertijd).
 * Genereert de Nostradamus-voorspelling en mailt die via eigen SMTP.
 */
export default async function handler(req, res) {
  // Beveiliging: Vercel Cron stuurt 'Authorization: Bearer <CRON_SECRET>' mee als die env-var is gezet.
  if (process.env.CRON_SECRET) {
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    const { date, text } = await generateMessage();

    if (!text) {
      return res.status(200).json({ ok: true, skipped: true, reason: "geen wedstrijden voor vandaag" });
    }

    // 'preview=1' => alleen tonen, niet versturen (handig om te testen).
    const preview = req.query?.preview === "1";
    if (preview) {
      return res.status(200).json({ ok: true, preview: true, date, length: [...text].length, text });
    }

    await sendMail({
      subject: `🔮 Nostradamus voorspelt — WK ${date}`,
      text,
    });

    return res.status(200).json({ ok: true, sent: true, date, length: [...text].length });
  } catch (err) {
    console.error("[nostradamus]", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
