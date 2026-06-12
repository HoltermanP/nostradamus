import { checkCronAuth } from "../../lib/auth.js";
import { generateMessage, todayNL } from "../../lib/generate.js";
import { sendMail } from "../../lib/mailer.js";

function unauthorized(res) {
  return res.status(401).json({ ok: false, error: "Unauthorized" });
}

/** GET: standaardconfig voor de test-UI. POST: preview of versturen. */
export default async function handler(req, res) {
  if (!checkCronAuth(req)) {
    return unauthorized(res);
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      today: todayNL(),
      defaultMailTo: process.env.MAIL_TO || "",
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const action = body.action === "send" ? "send" : "preview";
    const refDate = body.date || todayNL();
    const mailTo = (body.mailTo || "").trim() || process.env.MAIL_TO || "";

    const { date, text, reason } = await generateMessage({ refDate });

    if (!text) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: reason || "geen wedstrijden voor deze datum",
        date: refDate,
      });
    }

    if (action === "preview") {
      return res.status(200).json({
        ok: true,
        preview: true,
        date,
        length: [...text].length,
        text,
      });
    }

    if (!mailTo) {
      return res.status(400).json({ ok: false, error: "Geen ontvanger ingevuld." });
    }

    await sendMail({
      subject: `🔮 Nostradamus voorspelt — WK ${date}`,
      text,
      to: mailTo,
    });

    return res.status(200).json({
      ok: true,
      sent: true,
      date,
      mailTo,
      length: [...text].length,
      text,
    });
  } catch (err) {
    console.error("[test/nostradamus]", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
