import json
import os
import re
from difflib import get_close_matches
from pathlib import Path

ROOT = Path(".")  # ejecuta desde la raíz del repo
MODELOS_DIR = ROOT / "modelos"

# 1) Aliases manuales (lo importante: abreviaturas y variantes típicas)
ALIASES = {
    "DBT": "Terapia dialéctico–conductual (DBT)",
    "MBCT": "CBT 3ª ola – MBCT",
    "CFT": "Compassion Focused Therapy (CFT)",
    "ACT": "Terapia de Aceptación y Compromiso (ACT)",
    "RFT": "Teoría de los Marcos Relacionales (RFT)",
    "Construccionismo social": "Construccionismo social (Kenneth Gergen)",
    "Terapia narrativa": "Terapia Narrativa",
    "Contextualismo funcional (Hayes)": "Contextualismo funcional",
    "Terapia cognitivo conductual estándar": "Terapia cognitivo-conductual estándar",
}

def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path: Path, data):
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

def norm(s: str) -> str:
    s = s.strip()
    s = re.sub(r"\s+", " ", s)
    return s

def build_label_index(model_files):
    labels = set()
    for p in model_files:
        try:
            d = load_json(p)
        except Exception:
            continue
        label = d.get("label")
        if isinstance(label, str) and label.strip():
            labels.add(norm(label))
    return labels

def normalize_influences(influences, labels):
    """Devuelve (nuevas_influencias, cambios, ambiguas)"""
    out = []
    changes = []
    ambiguous = []

    for infl in influences:
        if not isinstance(infl, str):
            out.append(infl)
            continue

        original = infl
        infl_n = norm(infl)

        # Alias directo
        if infl_n in ALIASES:
            target = ALIASES[infl_n]
            out.append(target)
            if target != original:
                changes.append((original, target))
            continue

        # Match exacto por label
        if infl_n in labels:
            out.append(infl_n)
            if infl_n != original:
                changes.append((original, infl_n))
            continue

        # Fuzzy match (solo si hay un match claro)
        candidates = get_close_matches(infl_n, labels, n=3, cutoff=0.90)
        if len(candidates) == 1:
            out.append(candidates[0])
            if candidates[0] != original:
                changes.append((original, candidates[0]))
        elif len(candidates) > 1:
            out.append(original)  # no tocamos
            ambiguous.append((original, candidates))
        else:
            out.append(original)  # no tocamos

    return out, changes, ambiguous

def main():
    model_files = list(MODELOS_DIR.rglob("*.json"))
    labels = build_label_index(model_files)

    report = {
        "files_modified": [],
        "ambiguous": [],
        "errors": []
    }

    for p in model_files:
        try:
            d = load_json(p)
        except Exception as e:
            report["errors"].append({"file": str(p), "error": str(e)})
            continue

        infl = d.get("influencias")
        if not isinstance(infl, list) or not infl:
            continue

        new_infl, changes, ambiguous = normalize_influences(infl, labels)

        if changes:
            d["influencias"] = new_infl
            save_json(p, d)
            report["files_modified"].append({
                "file": str(p),
                "changes": [{"from": a, "to": b} for a, b in changes]
            })

        if ambiguous:
            report["ambiguous"].append({
                "file": str(p),
                "items": [{"value": v, "candidates": c} for v, c in ambiguous]
            })

    # informe
    out_path = ROOT / "reporte_normalizacion_influencias.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("OK. Modificados:", len(report["files_modified"]))
    print("Ambiguos:", len(report["ambiguous"]))
    print("Informe:", out_path)

if __name__ == "__main__":
    main()
