import nodemailer from "nodemailer";

/** Maak een SMTP-transport op basis van env-variabelen (eigen AI-Group SMTP). */
export function makeTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/** Verstuur het WK-bericht als e-mail. */
export async function sendMail({ subject, text }) {
  const transport = makeTransport();
  return transport.sendMail({
    from: process.env.MAIL_FROM || "Nostradamus <nostradamus@ai-group.nl>",
    to: process.env.MAIL_TO,
    subject,
    text,
  });
}
