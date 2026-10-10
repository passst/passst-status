// Passst Status – prüft die Dienste und schreibt current.json und history.json in den angegebenen Ordner.
// Aufruf: node scripts/check.mjs <datenordner>
// Beendet sich nie mit Fehler, damit die Seite auch bei einem Ausfall aktualisiert wird.
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'data';
fs.mkdirSync(dir, { recursive: true });

const TIMEOUT_MS = 10000;
const SLOW_MS = 4000;
const KEEP_DAYS = 90;

async function get(url) {
  const t0 = Date.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow', headers: { 'User-Agent': 'passst-status/1.0' } });
  const text = await res.text();
  return { status: res.status, text, ms: Date.now() - t0 };
}
// zwei Versuche, damit ein einzelner Aussetzer keinen Alarm auslöst
async function getRetry(url) {
  try { const r = await get(url); if (r.status < 500) return r; } catch { /* nochmals */ }
  await new Promise((r) => setTimeout(r, 4000));
  try { return await get(url); } catch (e) { return { status: 0, text: '', ms: TIMEOUT_MS, error: String(e.name || e) }; }
}

const rate = (r, ok) => (!ok ? 'down' : r.ms > SLOW_MS ? 'slow' : 'up');

const [site, app] = await Promise.all([getRetry('https://passst.com/'), getRetry('https://app.passst.com/api/health')]);
let health = null;
try { health = JSON.parse(app.text); } catch { /* keine gültige Antwort */ }

const components = {
  website: { status: rate(site, site.status >= 200 && site.status < 400), ms: site.ms },
  app: { status: rate(app, app.status === 200 && health?.ok === true), ms: app.ms },
  db: { status: health?.db ? (health.db.ok ? 'up' : 'down') : 'unknown', ms: app.ms },
  mail: { status: health?.mail && health.mail.enabled && health.mail.ok !== null ? (health.mail.ok ? 'up' : 'down') : 'unknown', ms: app.ms },
};
// Ist die App nicht erreichbar, ist über Datenbank und Mail nichts bekannt
if (components.app.status === 'down' && !health) { components.db.status = 'unknown'; components.mail.status = 'unknown'; }

const now = new Date();
const current = { checked: now.toISOString(), components };
fs.writeFileSync(path.join(dir, 'current.json'), JSON.stringify(current));

// Verlauf je Tag und Dienst: Prüfungen gesamt / davon in Ordnung (langsam zählt als in Ordnung)
const hf = path.join(dir, 'history.json');
let hist = { days: {} };
try { hist = JSON.parse(fs.readFileSync(hf, 'utf8')); } catch { /* neu beginnen */ }
const day = now.toISOString().slice(0, 10);
hist.days[day] ||= {};
for (const [id, c] of Object.entries(components)) {
  if (c.status === 'unknown') continue;
  const d = (hist.days[day][id] ||= { n: 0, ok: 0 });
  d.n += 1;
  if (c.status !== 'down') d.ok += 1;
}
const cutoff = new Date(now.getTime() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
for (const k of Object.keys(hist.days)) if (k < cutoff) delete hist.days[k];
fs.writeFileSync(hf, JSON.stringify(hist));

console.log(JSON.stringify(current));
