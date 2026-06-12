# 🔮 Nostradamus WK 2026

Dagelijkse WK-2026 voorspelling in Nostradamus-stijl (humor, icons, max 400 tekens), automatisch verstuurd via **Vercel Cron + je eigen SMTP** (AI-Group.nl). Draait 24/7 los van je laptop.

## Hoe het werkt

Elke ochtend om 07:00 (NL) draait `/api/cron/nostradamus`:

1. Pakt de wedstrijden van vandaag uit `data/fixtures.json`.
2. Laat de OpenAI API een Nostradamus-bericht schrijven, met de WK-regels en accuratesse-checks ingebakken.
3. Verstuurt het via je eigen SMTP-server.

Accuratesse zit in twee lagen vast: de **prompt** (`lib/generate.js`) verbiedt verzonnen namen en respecteert de groepsfase-regels (winst 3 / gelijk 1 / 0 punten, geen strafschoppenseries, gelijkspel blijft staan), en het model mag **alleen** namen uit `data/keyplayers.json` gebruiken. Namen worden bewust spaarzaam ingezet — hooguit af en toe één.

## Mappen

```
api/cron/nostradamus.js   Vercel Cron endpoint
lib/generate.js           Bericht genereren (fixtures + spelers -> OpenAI)
lib/mailer.js             SMTP-verzending (nodemailer)
data/fixtures.json        Speelschema (datum -> wedstrijden)
data/keyplayers.json      Geverifieerde spelers/feiten per land
scripts/test-local.js     Lokaal testen
vercel.json               Cron-config
```

## Setup

```bash
npm install
```

Maak een `.env` (zie `.env.example`) en vul je OpenAI-key, SMTP-gegevens en `MAIL_TO` (ontvanger) in.

### Lokaal testen (zonder mail te sturen)

```bash
OPENAI_API_KEY=sk-... node scripts/test-local.js 2026-06-13
```

Toont het bericht + het aantal tekens. Met `--send` erachter verstuurt 'ie ook echt (vereist SMTP_* en MAIL_TO).

### Deployen op Vercel

```bash
vercel
vercel --prod
```

Zet daarna alle env-vars uit `.env.example` in **Vercel → Project → Settings → Environment Variables**. De cron staat al in `vercel.json`.

> **Tijdzone:** Vercel Cron draait in **UTC**. `0 5 * * *` = 07:00 NL zomertijd (CEST, UTC+2). In de wintertijd (CET, UTC+1) wordt dat 06:00 NL — pas dan aan naar `0 6 * * *` als je per se 07:00 wilt. Voor het WK (juni/juli) klopt `0 5 * * *`.

### Endpoint los testen (preview, verstuurt niets)

```
https://<jouw-project>.vercel.app/api/cron/nostradamus?preview=1
```

## Onderhoud

- **`data/fixtures.json`** is geverifieerd t/m 15 juni. Vul de rest van de groepsfase aan; voor de knockoutfase vul je de affiches in zodra ze bekend zijn (die hangen van uitslagen af).
- **`data/keyplayers.json`**: voeg landen toe naarmate ze aan de beurt zijn. Zet `"verified": false` of laat `players` leeg als je iets niet zeker weet — dan gebruikt het model géén namen voor dat team.

## Beveiliging

Zet `CRON_SECRET` (een lange random string) als env-var. Vercel Cron stuurt die automatisch mee als Bearer-token, zodat alleen de cron je endpoint kan triggeren.
