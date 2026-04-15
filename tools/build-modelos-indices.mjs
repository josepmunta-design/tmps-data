import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const MODELOS_DIR = path.join(ROOT, "data", "Core", "modelos");
const OUTPUT_DIR = path.join(ROOT, "data", "indices");
const NDJSON_FILE = path.join(OUTPUT_DIR, "modelos-unidos.ndjson");
const INDEX_FILE = path.join(OUTPUT_DIR, "modelos-index.json");

function walkJsonFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(walkJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b, "es"));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function compactText(value, maxLength = 320) {
  const text = normalizeWhitespace(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => normalizeWhitespace(value)).filter(Boolean))];
}

function pickText(item) {
  if (typeof item === "string" || typeof item === "number") {
    return normalizeWhitespace(item);
  }

  if (item && typeof item === "object") {
    return normalizeWhitespace(
      item.label || item.nombre || item.titulo || item.title || item.id || item.codigo || item.descripcion || item.texto || ""
    );
  }

  return "";
}

function collectTexts(items) {
  if (!Array.isArray(items)) return [];
  return items.map(pickText).filter(Boolean);
}

function buildIndexEntry(model, relativePath) {
  const summary = compactText(model.descripcion || model.definicion || model.definición || model.frase || "");
  const keywords = uniqueStrings([
    ...collectTexts(model.conceptosClave),
    ...collectTexts(model.influencias),
    ...collectTexts(model.procedimientos),
    ...collectTexts(model.micros),
    ...collectTexts(model.ideasPrincipales),
    ...collectTexts(model.mjps)
  ]).slice(0, 80);

  const searchText = uniqueStrings([
    model.id,
    model.label,
    model.grupo,
    model.autores,
    model.universidad,
    model.ciudad,
    model.pais,
    model.frase,
    model.descripcion,
    ...keywords
  ]).join(" | ");

  return {
    id: normalizeWhitespace(model.id),
    label: normalizeWhitespace(model.label),
    grupo: normalizeWhitespace(model.grupo),
    year: Number.isFinite(model.year) ? model.year : null,
    autores: normalizeWhitespace(model.autores),
    importance: Number.isFinite(model.importance) ? model.importance : null,
    path: relativePath,
    summary,
    keywords,
    searchText
  };
}

function build() {
  if (!fs.existsSync(MODELOS_DIR)) {
    throw new Error(`No existe la carpeta de modelos: ${MODELOS_DIR}`);
  }

  ensureDir(OUTPUT_DIR);

  const files = walkJsonFiles(MODELOS_DIR);
  const ndjsonLines = [];
  const indexEntries = [];

  for (const file of files) {
    const relativePath = path.relative(ROOT, file).replace(/\\/g, "/");
    const raw = fs.readFileSync(file, "utf8");
    const model = JSON.parse(raw);

    ndjsonLines.push(JSON.stringify({ sourcePath: relativePath, ...model }));
    indexEntries.push(buildIndexEntry(model, relativePath));
  }

  const indexPayload = {
    total: indexEntries.length,
    models: indexEntries
  };

  fs.writeFileSync(NDJSON_FILE, `${ndjsonLines.join("\n")}\n`, "utf8");
  fs.writeFileSync(INDEX_FILE, `${JSON.stringify(indexPayload, null, 2)}\n`, "utf8");

  console.log(`Generado: ${NDJSON_FILE} (${indexEntries.length} modelos)`);
  console.log(`Generado: ${INDEX_FILE} (${indexEntries.length} modelos)`);
}

build();
