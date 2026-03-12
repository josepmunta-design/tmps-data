const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const MODELS_DIR = path.join(ROOT, "data", "Core", "modelos");
const ISO_SOURCE_DIR = path.join(ROOT, "data", "indices", "isomorfismos", "fuente");

const OUT_LOOKUP = path.join(ROOT, "data", "indices", "isomorfismos", "iso_lookup.json");
const OUT_MISSING = path.join(ROOT, "data", "indices", "isomorfismos", "iso_missing.json");
const OUT_REPORT = path.join(ROOT, "data", "indices", "isomorfismos", "iso_report.md");

// Copia espejo temporal por compatibilidad
const OUT_LOOKUP_MIRROR = path.join(ROOT, "indices", "isomorfismos", "iso_lookup.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function toRelativeRepoPath(filePath) {
  if (!filePath) return null;
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function walkJsonFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkJsonFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      out.push(full);
    }
  }
  return out;
}

function indexModelTechniques(model, sourceFile) {
  const result = new Map();

  const buckets = [
    { key: "procedimientos", tipo: "procedimiento" },
    { key: "micros", tipo: "micro" },
    { key: "tecnicas", tipo: "tecnica" }
  ];

  for (const bucket of buckets) {
    const arr = Array.isArray(model[bucket.key]) ? model[bucket.key] : [];
    for (const item of arr) {
      if (item && item.codigo) {
        result.set(item.codigo, {
          tecnicaId: item.codigo,
          tecnicaLabel: item.nombre || item.label || item.codigo,
          tecnicaTipo: bucket.tipo,
          sourceFile: toRelativeRepoPath(sourceFile)
        });
      }
    }
  }

  return result;
}

function loadModels() {
  const files = walkJsonFiles(MODELS_DIR);
  const byModelId = new Map();

  for (const file of files) {
    let model;
    try {
      model = readJson(file);
    } catch (e) {
      console.warn(`No se pudo leer JSON de modelo: ${file}`);
      continue;
    }

    if (!model || !model.id) continue;

    byModelId.set(model.id, {
      model,
      file: toRelativeRepoPath(file),
      techniques: indexModelTechniques(model, file)
    });
  }

  return byModelId;
}

function loadIsomorfismosSource() {
  const files = walkJsonFiles(ISO_SOURCE_DIR);
  const isos = [];

  for (const file of files) {
    let iso;
    try {
      iso = readJson(file);
    } catch (e) {
      console.warn(`No se pudo leer JSON de isomorfismo: ${file}`);
      continue;
    }

    if (!iso || !iso.id || !Array.isArray(iso.links)) continue;
    isos.push({ ...iso, __file: toRelativeRepoPath(file) });
  }

  return isos;
}

function pushIndexArray(obj, key, value) {
  if (!key) return;
  if (!obj[key]) obj[key] = [];
  obj[key].push(value);
}

function build() {
  const models = loadModels();
  const isos = loadIsomorfismosSource();
  const generatedAt = new Date().toISOString();

  const lookup = {
    meta: {
      version: 2,
      generatedAt,
      sourceDir: "data/indices/isomorfismos/fuente",
      modelsDir: "data/Core/modelos",
      runtimeSource: "data/indices/isomorfismos/iso_lookup.json"
    },

    // formato principal
    isomorfismos: [],

    // compatibilidad / acceso rápido
    groups: [],
    records: [],
    byIsomorfismoId: {},
    byCategoria: {},
    byModeloId: {},
    byTecnicaId: {},
    byModelTechniqueId: {},

    stats: {
      totalIsomorfismos: 0,
      totalEntries: 0,
      totalOk: 0,
      totalFaltaId: 0,
      totalFaltaModelo: 0,
      totalDudoso: 0,
      totalDescartado: 0
    }
  };

  const missing = [];
  const reportLines = [
    "# Informe de isomorfismos",
    "",
    `Generado: ${generatedAt}`,
    ""
  ];

  isos.sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id, "es"));

  isos.forEach((iso) => {
    const isoOut = {
      id: iso.id,
      label: iso.label || iso.id,
      definicion: iso.definicion || "",
      categoria: iso.categoria || "",
      tags: Array.isArray(iso.tags) ? iso.tags : [],
      sourceFile: iso.__file || null,
      entries: []
    };

    for (const link of iso.links) {
      const modelRef = models.get(link.modeloId);

      const entry = {
        // claves principales
        modeloId: link.modeloId || null,
        tecnicaId: link.tecnicaId || null,

        // alias de compatibilidad
        modelId: link.modeloId || null,
        techniqueId: link.tecnicaId || null,

        modeloLabel: null,
        modelLabel: null,
        grupo: null,
        tecnicaLabel: null,
        techniqueLabel: null,
        tecnicaTipo: null,
        techniqueType: null,

        estado: link.estado || "ok",
        nota: link.nota || "",
        sourceFile: null
      };

      if (!modelRef) {
        entry.estado = "falta_modelo";
        entry.nota = entry.nota || "modeloId no encontrado en data/Core/modelos";
      } else {
        const { model, file, techniques } = modelRef;
        entry.modeloLabel = model.label || model.id;
        entry.modelLabel = model.label || model.id;
        entry.grupo = model.grupo || null;
        entry.sourceFile = file;

        if (link.tecnicaId) {
          const tech = techniques.get(link.tecnicaId);
          if (tech) {
            entry.tecnicaLabel = tech.tecnicaLabel;
            entry.techniqueLabel = tech.tecnicaLabel;
            entry.tecnicaTipo = tech.tecnicaTipo;
            entry.techniqueType = tech.tecnicaTipo;
          } else {
            entry.estado = "falta_id";
            entry.nota = entry.nota || "tecnicaId no encontrado en el JSON del modelo";
          }
        }
      }

      isoOut.entries.push(entry);

      lookup.stats.totalEntries += 1;
      if (entry.estado === "ok") lookup.stats.totalOk += 1;
      else if (entry.estado === "falta_id") lookup.stats.totalFaltaId += 1;
      else if (entry.estado === "falta_modelo") lookup.stats.totalFaltaModelo += 1;
      else if (entry.estado === "dudoso") lookup.stats.totalDudoso += 1;
      else if (entry.estado === "descartado") lookup.stats.totalDescartado += 1;

      if (entry.estado !== "ok") {
        missing.push({
          isomorfismoId: isoOut.id,
          isomorfismoLabel: isoOut.label,
          categoria: isoOut.categoria,
          modeloId: entry.modeloId,
          modeloLabel: entry.modeloLabel,
          tecnicaId: entry.tecnicaId,
          tecnicaLabel: entry.tecnicaLabel,
          estado: entry.estado,
          nota: entry.nota,
          sourceFile: entry.sourceFile
        });
      }

      // índices por modelo y técnica: solo relaciones válidas
      if (entry.estado === "ok" && entry.modeloId && entry.tecnicaId) {
        const byModelRow = {
          isomorfismoId: isoOut.id,
          isomorfismoLabel: isoOut.label,
          categoria: isoOut.categoria,
          tecnicaId: entry.tecnicaId,
          tecnicaLabel: entry.tecnicaLabel,
          tecnicaTipo: entry.tecnicaTipo
        };

        pushIndexArray(lookup.byModeloId, entry.modeloId, byModelRow);
        pushIndexArray(lookup.byTecnicaId, entry.tecnicaId, {
          isomorfismoId: isoOut.id,
          isomorfismoLabel: isoOut.label,
          categoria: isoOut.categoria,
          modeloId: entry.modeloId,
          modeloLabel: entry.modeloLabel,
          tecnicaId: entry.tecnicaId,
          tecnicaLabel: entry.tecnicaLabel,
          tecnicaTipo: entry.tecnicaTipo
        });

        const modelTechniqueKey = `${entry.modeloId}::${entry.tecnicaId}`;
        pushIndexArray(lookup.byModelTechniqueId, modelTechniqueKey, {
          isomorfismoId: isoOut.id,
          isomorfismoLabel: isoOut.label,
          categoria: isoOut.categoria,
          modeloId: entry.modeloId,
          modeloLabel: entry.modeloLabel,
          tecnicaId: entry.tecnicaId,
          tecnicaLabel: entry.tecnicaLabel,
          tecnicaTipo: entry.tecnicaTipo
        });

        // records planos para compatibilidad máxima con loaders antiguos
        lookup.records.push({
          isomorfismoId: isoOut.id,
          isomorfismoLabel: isoOut.label,
          categoria: isoOut.categoria,
          definicion: isoOut.definicion,
          tags: isoOut.tags,

          modeloId: entry.modeloId,
          modelId: entry.modeloId,
          modeloLabel: entry.modeloLabel,
          modelLabel: entry.modeloLabel,
          grupo: entry.grupo,

          tecnicaId: entry.tecnicaId,
          techniqueId: entry.tecnicaId,
          tecnicaLabel: entry.tecnicaLabel,
          techniqueLabel: entry.tecnicaLabel,
          tecnicaTipo: entry.tecnicaTipo,
          techniqueType: entry.tecnicaTipo,

          estado: entry.estado,
          nota: entry.nota,
          sourceFile: entry.sourceFile
        });
      }
    }

    lookup.byIsomorfismoId[isoOut.id] = isoOut;

    if (isoOut.categoria) {
      pushIndexArray(lookup.byCategoria, isoOut.categoria, isoOut.id);
    }

    lookup.isomorfismos.push(isoOut);

    reportLines.push(`## ${isoOut.label}`);
    reportLines.push("");
    reportLines.push(`- ID: \`${isoOut.id}\``);
    if (isoOut.categoria) reportLines.push(`- Categoría: ${isoOut.categoria}`);
    reportLines.push(`- Archivo fuente: \`${isoOut.sourceFile || "N/D"}\``);
    reportLines.push(`- Entradas: ${isoOut.entries.length}`);
    reportLines.push("");

    for (const e of isoOut.entries) {
      reportLines.push(
        `- ${e.modeloLabel || e.modeloId} — ${e.tecnicaLabel || e.tecnicaId || "SIN ID"} [${e.estado}]`
      );
    }
    reportLines.push("");
  });

  // groups de compatibilidad derivados de categoría
  lookup.groups = lookup.isomorfismos.map((iso) => ({
    id: iso.id,
    label: iso.label,
    categoria: iso.categoria,
    definicion: iso.definicion,
    tags: iso.tags,
    records: lookup.records.filter((r) => r.isomorfismoId === iso.id)
  }));

  lookup.stats.totalIsomorfismos = lookup.isomorfismos.length;

  writeJson(OUT_LOOKUP, lookup);
  writeJson(OUT_MISSING, missing);

  fs.mkdirSync(path.dirname(OUT_REPORT), { recursive: true });
  fs.writeFileSync(OUT_REPORT, reportLines.join("\n"), "utf8");

  // espejo temporal
  writeJson(OUT_LOOKUP_MIRROR, lookup);

  console.log("OK: generado iso_lookup.json, iso_missing.json e iso_report.md");
  console.log(
    `Isomorfismos: ${lookup.stats.totalIsomorfismos} | Entradas OK: ${lookup.stats.totalOk} | Falta ID: ${lookup.stats.totalFaltaId} | Falta modelo: ${lookup.stats.totalFaltaModelo}`
  );
}

build();
