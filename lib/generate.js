import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");

/** Datum 'vandaag' in NL-tijd als YYYY-MM-DD. */
export function todayNL(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function loadJSON(name) {
  return JSON.parse(await readFile(join(DATA, name), "utf8"));
}

/**
 * Kies de wedstrijden voor 'vandaag'; zo niet, de eerstvolgende speeldag.
 * Retourneert { date, matches } of null als er niets (meer) is.
 */
export async function pickMatchday(fixtures, refDate = todayNL()) {
  const dates = Object.keys(fixtures)
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .sort();
  const chosen = dates.find((d) => d >= refDate);
  if (!chosen) return null;
  return { date: chosen, matches: fixtures[chosen] };
}

/** Bouw een compacte spelers-context voor alleen de landen van vandaag. */
function buildPlayerContext(matches, keyplayers) {
  const teams = new Set();
  for (const m of matches) {
    teams.add(m.home);
    teams.add(m.away);
  }
  const lines = [];
  for (const team of teams) {
    const info = keyplayers[team];
    if (!info || info.verified === false) {
      lines.push(`${team}: (geen geverifieerde spelers — gebruik GEEN namen voor dit team)`);
      continue;
    }
    const parts = [];
    if (info.players?.length) parts.push(`spelers: ${info.players.join(", ")}`);
    if (info.facts?.length) parts.push(`feiten: ${info.facts.join("; ")}`);
    lines.push(`${team}: ${parts.join(" | ") || "(geen details)"}`);
  }
  return lines.join("\n");
}

const SYSTEM_PROMPT = `Je bent Nostradamus, de ziener, die met droge humor en een knipoog het WK voetbal 2026 voorspelt. Je schrijft in het Nederlands.

HARDE REGELS:
- Maximaal 400 tekens (inclusief emoji's en spaties). Liever korter.
- Gebruik passende emoji's/icons (vlaggen, ⚽, 🔮, ✨ etc.), maar overdrijf niet.
- Humor staat voorop: profetisch maar speels, nooit droog opsommen.
- WK-REGELS (groepsfase): winst = 3 punten, gelijkspel = 1, verlies = 0. Er zijn GEEN strafschoppenseries in de groepsfase; een gelijkspel blijft gewoon staan. Verzin dus geen penalty's of verlenging bij groepswedstrijden.
- SPAARZAAM met namen: gebruik HOOGUIT af en toe één spelersnaam, en lang niet in elk bericht. Stop een bericht NOOIT vol met namen.
- Gebruik ALLEEN spelersnamen en feiten die expliciet in de meegeleverde context staan. Verzin NOOIT namen, feiten of statistieken. Bij twijfel: geen naam.
- Geef per wedstrijd een plausibele voorspelde uitslag.
- Antwoord met UITSLUITEND de berichttekst, zonder aanhalingstekens of uitleg.`;

/**
 * Genereer het bericht. Geeft { date, matches, text } terug.
 */
export async function generateMessage({
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_MODEL || "gpt-4o",
  refDate = todayNL(),
} = {}) {
  const [fixtures, keyplayers] = await Promise.all([
    loadJSON("fixtures.json"),
    loadJSON("keyplayers.json"),
  ]);

  const day = await pickMatchday(fixtures, refDate);
  if (!day) {
    return { date: null, matches: [], text: null, reason: "geen wedstrijden meer in fixtures.json" };
  }

  const matchList = day.matches
    .map((m) => `- ${m.home} – ${m.away}${m.group ? ` (groep ${m.group})` : ""}`)
    .join("\n");
  const playerContext = buildPlayerContext(day.matches, keyplayers);

  const userPrompt = `Datum: ${day.date}\n\nWedstrijden van deze dag:\n${matchList}\n\nGeverifieerde spelers/feiten (alleen deze gebruiken):\n${playerContext}\n\nSchrijf nu één Nostradamus-bericht (max 400 tekens) over deze speeldag.`;

  const openai = new OpenAI({ apiKey });
  const res = await openai.chat.completions.create({
    model,
    temperature: 0.9,
    max_tokens: 300,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  let text = (res.choices?.[0]?.message?.content || "").trim();

  // Veiligheidsnet: hard afkappen als het toch >400 tekens is.
  if ([...text].length > 400) {
    text = [...text].slice(0, 397).join("") + "…";
  }

  return { date: day.date, matches: day.matches, text };
}
