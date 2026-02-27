import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "..");
const CORE_DIR = path.join(REPO_ROOT, "data", "Core");
const ESCUELAS_INDEX = path.join(CORE_DIR, "escuelas", "index.json");
const OUT_DIR = path.join(REPO_ROOT, "indices", "temporal");
const OUT_FILE = path.join(OUT_DIR, "index.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonSafe(filePath) {
  try {
    return readJson(filePath);
  } catch (_) {
    return null;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (_) {
    return false;
  }
}

function slugify(v) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function norm(v) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

function uniqStrings(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const s = String(value ?? "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function canonicalGroup(raw) {
  const k = norm(raw);
  const map = {
    psicoanalisis: "Psicoanálisis",
    conductismo: "Conductista",
    conductista: "Conductista",
    cognitivo: "Cognitivo",
    humanista: "Humanista",
    sistemico: "Sistémico",
    constructivista: "Constructivista",
    integrativo: "Integrativo",
    transversal: "Transversal",
    epistemologico: "Epistemológico",
    otros: "Otros",
    "no occidentales": "Otros",
    "no occidental": "Otros",
  };
  return map[k] || "Otros";
}

function schoolFileCandidates(entry) {
  const out = [];
  const add = (p) => {
    if (p && !out.includes(p)) out.push(p);
  };

  const rawFile = String(entry?.file ?? "").trim().replace(/^\/+/, "");
  if (rawFile) {
    const p1 = path.join(CORE_DIR, rawFile.replace(/^Core\//, ""));
    add(p1);

    if (!rawFile.endsWith(".json")) {
      add(`${p1}.json`);
    }
  }

  const slug = slugify(entry?.id || entry?.label);
  if (slug) {
    add(path.join(CORE_DIR, "escuelas", `${slug}.json`));
  }

  return out;
}

function modelFileCandidates(file, model = {}, schoolEntry = {}) {
  const out = [];
  const add = (p) => {
    if (p && !out.includes(p)) out.push(p);
  };

  const raw = String(file ?? "").trim().replace(/^\/+/, "");
  if (!raw) return out;

  add(path.join(CORE_DIR, raw.replace(/^Core\//, "")));

  if (!raw.includes(path.sep) && !raw.includes("/")) {
    const schoolSlug = slugify(schoolEntry?.id || schoolEntry?.label || model?.grupo || model?.group);
    if (schoolSlug) add(path.join(CORE_DIR, "modelos", schoolSlug, raw));
    add(path.join(CORE_DIR, "modelos", raw));
  }

  return out;
}

function pickModelList(school) {
  if (Array.isArray(school?.modelos)) return school.modelos;
  if (Array.isArray(school?.models)) return school.models;
  if (school?.modelos && typeof school.modelos === "object") return Object.values(school.modelos);
  if (school?.models && typeof school.models === "object") return Object.values(school.models);
  if (Array.isArray(school)) return school;
  return [];
}

function resolveSchool(entry) {
  for (const filePath of schoolFileCandidates(entry)) {
    if (!fileExists(filePath)) continue;
    const school = readJsonSafe(filePath);
    if (school) return school;
  }

  if (Array.isArray(entry?.modelos)) {
    return { id: entry.id, label: entry.label, modelos: entry.modelos };
  }
  if (Array.isArray(entry?.models)) {
    return { id: entry.id, label: entry.label, modelos: entry.models };
  }

  return null;
}

function resolveModelDetail(model, schoolEntry) {
  const file = String(model?.file ?? "").trim();
  if (!file) return null;

  for (const filePath of modelFileCandidates(file, model, schoolEntry)) {
    if (!fileExists(filePath)) continue;
    const full = readJsonSafe(filePath);
    if (full) return full;
  }
  return null;
}

function collectInfluences(obj) {
  return uniqStrings([
    ...asArray(obj?.influencias),
    ...asArray(obj?.derivesFrom),
    ...asArray(obj?.influences),
  ]);
}

function collectRefs(obj) {
  return uniqStrings([
    ...asArray(obj?.refs),
    ...asArray(obj?.books),
    ...asArray(obj?.referencias),
  ]);
}

function makeNode(model, detail, schoolLabel) {
  const merged = { ...(model || {}), ...(detail || {}) };

  const id = String(merged.id || "").trim() || `${slugify(merged.label)}-${merged.year || "na"}`;
  const label = String(merged.label || merged.nombre || id).trim();
  const year = Number(merged.year);
  const group = canonicalGroup(merged.group || merged.grupo || schoolLabel);

  const typeRaw = String(merged.type || merged.tipo || "").trim().toLowerCase();
  const isMarco = merged.isMarco === true || merged.marco === true || typeRaw === "marco";

  const authors = String(merged.authors || merged.autores || "").trim();
  const summary = String(merged.summary || merged.descripcion || merged.description || "").trim();

  return {
    id,
    label,
    year: Number.isFinite(year) ? year : null,
    group,
    importance: Number.isFinite(Number(merged.importance)) ? Number(merged.importance) : null,
    type: isMarco ? "marco" : "modelo",
    isMarco,
    file: merged.file || null,
    authors: authors || null,
    summary: summary || null,
    influencias: collectInfluences(merged),
    refs: collectRefs(merged),
    lat: Number.isFinite(Number(merged.lat)) ? Number(merged.lat) : null,
    lon: Number.isFinite(Number(merged.lon)) ? Number(merged.lon) : null,
    ciudad: merged.ciudad || null,
    pais: merged.pais || null,
    escuelaId: schoolLabel ? slugify(schoolLabel) : null,
  };
}

function main() {
  ensureDir(OUT_DIR);

  const idx = readJsonSafe(ESCUELAS_INDEX);
  const schools = Array.isArray(idx) ? idx : (Array.isArray(idx?.escuelas) ? idx.escuelas : []);
  if (!schools.length) {
    throw new Error(`No se pudo leer listado de escuelas en ${ESCUELAS_INDEX}`);
  }

  const nodes = [];

  for (const entry of schools) {
    const school = resolveSchool(entry);
    if (!school) continue;

    const schoolLabel = String(school?.label || entry?.label || entry?.id || "Otros").trim();
    const list = pickModelList(school).filter((m) => m && typeof m === "object");

    for (const model of list) {
      const detail = resolveModelDetail(model, entry);
      nodes.push(makeNode(model, detail, schoolLabel));
    }
  }

  const seen = new Set();
  const dedupedNodes = nodes.filter((n) => {
    const k = String(n.id).toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const byId = new Map();
  const byLabel = new Map();
  for (const n of dedupedNodes) {
    byId.set(norm(n.id), n.id);
    byLabel.set(norm(n.label), n.id);
  }

  const links = [];
  const unresolvedInfluences = [];
  const seenLink = new Set();

  for (const n of dedupedNodes) {
    for (const infl of n.influencias) {
      const key = norm(infl);
      const srcId = byId.get(key) || byLabel.get(key) || null;
      if (!srcId) {
        unresolvedInfluences.push({ target: n.id, influence: infl });
        continue;
      }

      const lk = `${srcId}=>${n.id}`;
      if (seenLink.has(lk)) continue;
      seenLink.add(lk);

      links.push({ source: srcId, target: n.id });
    }
  }

  dedupedNodes.sort((a, b) => {
    const ya = Number.isFinite(a.year) ? a.year : 9999;
    const yb = Number.isFinite(b.year) ? b.year : 9999;
    if (ya !== yb) return ya - yb;
    return String(a.label).localeCompare(String(b.label), "es");
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "data/Core/escuelas + data/Core/modelos",
    stats: {
      escuelas: schools.length,
      modelos: dedupedNodes.length,
      links: links.length,
      unresolvedInfluences: unresolvedInfluences.length,
    },
    nodes: dedupedNodes,
    links,
    unresolvedInfluences,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`✅ Temporal index generado: ${OUT_FILE}`);
  console.log(`   modelos=${payload.stats.modelos} links=${payload.stats.links} unresolved=${payload.stats.unresolvedInfluences}`);
}

main();
