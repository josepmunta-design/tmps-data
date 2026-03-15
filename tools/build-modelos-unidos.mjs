import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const MODELOS_DIR = path.join(ROOT, "data", "Core", "modelos");
const OUTPUT_DIR = path.join(ROOT, "data", "indices");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "modelos-unidos.txt");

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

function build() {
  if (!fs.existsSync(MODELOS_DIR)) {
    throw new Error(`No existe la carpeta de modelos: ${MODELOS_DIR}`);
  }

  ensureDir(OUTPUT_DIR);

  const files = walkJsonFiles(MODELOS_DIR);
  const blocks = [];

  for (const file of files) {
    const relativePath = path.relative(ROOT, file).replace(/\\/g, "/");
    const raw = fs.readFileSync(file, "utf8").trim();

    blocks.push(`### FILE: ${relativePath}`);
    blocks.push(raw);
    blocks.push("");
  }

  fs.writeFileSync(OUTPUT_FILE, blocks.join("\n"), "utf8");
  console.log(`Generado: ${OUTPUT_FILE} (${files.length} archivos)`);
}

build();
