import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const ESCUELAS_DIR = path.join(ROOT, "data", "Core", "escuelas");
const OUTPUT_DIR = path.join(ROOT, "data", "indices");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "escuelas-unidas.json");
const OUTPUT_VALIDATION = path.join(OUTPUT_DIR, "escuelas-validacion.json");

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

function normalizePath(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function parseJsonFile(file) {
  const raw = fs.readFileSync(file, "utf8");

  try {
    return {
      raw,
      data: JSON.parse(raw)
    };
  } catch (error) {
    throw new Error(`JSON inválido en ${normalizePath(file)}: ${error.message}`);
  }
}

function collectValidation(data, relativePath, state) {
  if (Array.isArray(data)) {
    if (relativePath.endsWith("/index.json")) {
      for (const item of data) {
        if (!item || typeof item !== "object") {
          state.errors.push(`${relativePath}: index.json contiene una entrada no válida.`);
          continue;
        }

        if (!item.id) state.errors.push(`${relativePath}: falta id en una entrada del índice.`);
        if (!item.label) state.errors.push(`${relativePath}: falta label en una entrada del índice (${item.id || "sin-id"}).`);
        if (!item.file) state.errors.push(`${relativePath}: falta file en una entrada del índice (${item.id || "sin-id"}).`);

        if (item.id) {
          if (state.indexIds.has(item.id)) {
            state.errors.push(`${relativePath}: id duplicado en index.json -> ${item.id}`);
          }
          state.indexIds.add(item.id);
        }
      }
    }

    return;
  }

  if (!data || typeof data !== "object") {
    state.errors.push(`${relativePath}: el contenido raíz debe ser un objeto o array.`);
    return;
  }

  if (!data.id) state.errors.push(`${relativePath}: falta id.`);
  if (!data.label) state.errors.push(`${relativePath}: falta label.`);

  if (data.id) {
    if (state.schoolIds.has(data.id)) {
      state.errors.push(`${relativePath}: id de escuela duplicado -> ${data.id}`);
    }
    state.schoolIds.add(data.id);
  }

  if (!Array.isArray(data.modelos)) {
    state.errors.push(`${relativePath}: falta array modelos.`);
    return;
  }

  const localModelIds = new Set();

  for (const modelo of data.modelos) {
    if (!modelo || typeof modelo !== "object") {
      state.errors.push(`${relativePath}: hay una entrada de modelo no válida.`);
      continue;
    }

    if (!modelo.id) state.errors.push(`${relativePath}: un modelo no tiene id.`);
    if (!modelo.label) state.errors.push(`${relativePath}: un modelo no tiene label (${modelo.id || "sin-id"}).`);
    if (!modelo.file) state.errors.push(`${relativePath}: un modelo no tiene file (${modelo.id || "sin-id"}).`);

    if (modelo.id) {
      if (localModelIds.has(modelo.id)) {
        state.errors.push(`${relativePath}: modelo duplicado dentro de la escuela -> ${modelo.id}`);
      }
      localModelIds.add(modelo.id);

      if (state.globalModelIds.has(modelo.id)) {
        state.errors.push(`${relativePath}: modelo duplicado entre escuelas -> ${modelo.id}`);
      }
      state.globalModelIds.add(modelo.id);
    }
  }
}

function build() {
  if (!fs.existsSync(ESCUELAS_DIR)) {
    throw new Error(`No existe la carpeta de escuelas: ${ESCUELAS_DIR}`);
  }

  ensureDir(OUTPUT_DIR);

  const files = walkJsonFiles(ESCUELAS_DIR);
  const merged = [];
  const validationState = {
    errors: [],
    schoolIds: new Set(),
    indexIds: new Set(),
    globalModelIds: new Set()
  };

  for (const file of files) {
    const relativePath = normalizePath(file);
    const { data } = parseJsonFile(file);

    collectValidation(data, relativePath, validationState);

    merged.push({
      path: relativePath,
      data
    });
  }

  const validation = {
    ok: validationState.errors.length === 0,
    totalFiles: files.length,
    totalEscuelas: merged.filter((item) => !item.path.endsWith("/index.json")).length,
    totalIndices: merged.filter((item) => item.path.endsWith("/index.json")).length,
    totalModelIds: validationState.globalModelIds.size,
    errors: validationState.errors
  };

  if (!validation.ok) {
    fs.writeFileSync(OUTPUT_VALIDATION, JSON.stringify(validation, null, 2) + "\n", "utf8");
    throw new Error(`Validación fallida de escuelas. Errores: ${validation.errors.length}`);
  }

  const output = {
    source: "data/Core/escuelas",
    totalFiles: files.length,
    files: merged
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2) + "\n", "utf8");
  fs.writeFileSync(OUTPUT_VALIDATION, JSON.stringify(validation, null, 2) + "\n", "utf8");

  console.log(`Generado: ${OUTPUT_JSON} (${files.length} archivos)`);
  console.log(`Validación OK: ${OUTPUT_VALIDATION}`);
}

build();
