import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ ajusta si tu repo es distinto
const REPO_ROOT = path.resolve(__dirname, "..");
const MODELOS_DIR = path.join(REPO_ROOT, "data", "Core", "modelos");
const OUT_DIR = path.join(REPO_ROOT, "indices", "subprocesos");

// ---------------------------
// helpers
// ---------------------------
function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walkJsonFiles(dir) {
  const out = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...walkJsonFiles(p));
    else if (it.isFile() && it.name.toLowerCase().endsWith(".json")) out.push(p);
  }
  return out;
}

// Normaliza campos posibles donde guardas subproceso
function extractSubIds(x) {
  if (!x) return [];

  // ✅ TU ESTRUCTURA REAL (lo más importante)
  // En procedimientos/micros: "procesos": ["N_metacognicion", ...]
  if (typeof x === "object" && Array.isArray(x.procesos)) {
    return x.procesos.map(String).filter(Boolean);
  }

  // Compat: si te pasan directamente el array/string
  if (typeof x === "string") return [x].filter(Boolean);
  if (Array.isArray(x)) return x.map(String).filter(Boolean);

  // Compat: otros nombres posibles
  if (typeof x === "object") {
    if (x.subproceso) return extractSubIds(x.subproceso);
    if (x.subprocesos) return extractSubIds(x.subprocesos);
    if (x.mjps) return extractSubIds(x.mjps);
  }

  return [];
}


// Coge técnicas/micros desde campos típicos
function listItems(model, key) {
  const v = model?.[key];
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [];
}

function minimalModelHeader(model, relFile) {
  return {
    id: model?.id ?? null,
    label: model?.label ?? null,
    year: model?.year ?? null,
    autores: model?.autores ?? model?.authors ?? null,
    grupo: model?.grupo ?? model?.group ?? null,
    file: relFile
  };
}

// ---------------------------
// main
// ---------------------------
ensureDir(OUT_DIR);

const modelFiles = walkJsonFiles(MODELOS_DIR);

const bySub = new Map(); // subId -> array de modelos con matches

for (const abs of modelFiles) {
  const rel = path.relative(REPO_ROOT, abs).replaceAll("\\", "/");

  let model;
  try {
    model = readJson(abs);
  } catch (e) {
    console.error("❌ JSON inválido:", rel, e.message);
    continue;
  }

  const head = minimalModelHeader(model, rel);

  // Ajusta aquí si tus claves reales son otras:
const tecnicas = [
  ...listItems(model, "procedimientos"),
  ...listItems(model, "tecnicas") // compatibilidad con modelos antiguos
];

const micros = listItems(model, "micros");


  // mapa subId -> {tecnicas:[], micros:[]}
  const matches = new Map();

  // técnicas
  for (const t of tecnicas) {
    const subIds = extractSubIds(t);

    for (const subId of subIds) {
      if (!matches.has(subId)) matches.set(subId, { tecnicas: [], micros: [] });
      matches.get(subId).tecnicas.push({
        id: t?.id ?? null,
        label: t?.label ?? t?.nombre ?? null,
        sub: subId
      });
    }
  }

  // micros
  for (const m of micros) {
    const subIds = extractSubIds(m);

    for (const subId of subIds) {
      if (!matches.has(subId)) matches.set(subId, { tecnicas: [], micros: [] });
      matches.get(subId).micros.push({
        id: m?.id ?? null,
        label: m?.label ?? m?.nombre ?? null,
        sub: subId
      });
    }
  }

  // vuelca a bySub
  for (const [subId, mm] of matches.entries()) {
    if (!subId) continue;

    const entry = {
      ...head,
      matches: mm
    };

    if (!bySub.has(subId)) bySub.set(subId, []);
    bySub.get(subId).push(entry);
  }
}

// escribe archivos por subproceso
const now = new Date().toISOString();

const index = [];
for (const [subId, modelos] of bySub.entries()) {
  // ordena por year (si hay)
  modelos.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));

  const payload = {
    subprocesoId: subId,
    updatedAt: now,
    totalModelos: modelos.length,
    modelos
  };

  fs.writeFileSync(
    path.join(OUT_DIR, `${subId}.json`),
    JSON.stringify(payload, null, 2),
    "utf8"
  );

  index.push({ subprocesoId: subId, totalModelos: modelos.length, file: `indices/subprocesos/${subId}.json` });
}

// index general
index.sort((a, b) => a.subprocesoId.localeCompare(b.subprocesoId));

fs.writeFileSync(
  path.join(OUT_DIR, "index.json"),
  JSON.stringify({ updatedAt: now, items: index }, null, 2),
  "utf8"
);

console.log(`✅ Generado: ${index.length} subprocesos en ${OUT_DIR}`);


