# SCHEMA.md

## Overview

This repository stores structured JSON files describing psychotherapy
models.

These files represent **data objects**, not executable code.

Each model JSON combines:

-   metadata
-   theoretical description
-   influence relationships
-   psychotherapy processes
-   clinical procedures
-   micro-interventions
-   conceptual summaries

The files are used to generate indices and visualizations.

------------------------------------------------------------------------

# Basic model metadata

Typical metadata fields:

    id
    grupo
    label
    year
    autores
    ciudad
    pais
    lat
    lon
    frase
    descripcion

Descriptions are written in Spanish.

------------------------------------------------------------------------

# Influences

Models may reference theoretical influences.

    influencias

Example:

    "influencias": [
      "Psicoanálisis clásico",
      "Relaciones de objeto (Klein)",
      "Psicología del yo"
    ]

These are used to construct theoretical relationship networks.

------------------------------------------------------------------------

# Process distribution

Each model contains a distribution across psychotherapy processes.

    graficaProcesos

Example:

    {
      "RF": 0,
      "RE": 3,
      "AP": 0,
      "RI": 2,
      "N": 4,
      "I": 3,
      "AG": 3,
      "R": 0
    }

These codes represent higher-level processes used in the TMPS framework.

------------------------------------------------------------------------

# Process justification

Optional explanation of the process distribution.

    graficaProcesosJustificacion

Each process key may include explanatory text.

------------------------------------------------------------------------

# Conceptual sections

Models often include conceptual summaries.

Common fields:

    conceptosClave
    ideasPrincipales

These contain lists of conceptual insights describing the model.

------------------------------------------------------------------------

# Clinical procedures

Structured therapeutic procedures.

    procedimientos

These describe structured therapeutic operations or intervention
formats.

------------------------------------------------------------------------

# Micro-interventions

Fine-grained clinical actions used within procedures.

    micros

Micros usually include process tags linking them to psychological change
processes.

------------------------------------------------------------------------

# Process tags

Process tags identify psychological mechanisms.

Examples:

    RF
    RE
    AP
    RI
    N
    I
    AG
    R

These tags are used when generating indices and process maps.

------------------------------------------------------------------------

# Generated indices

Indices are generated from model data.

Main generator scripts:

    tools/build-subprocesos-index.mjs
    tools/build-temporal-index.mjs

Generated outputs include:

    indices/subprocesos/
    indices/temporal/index.json

Agents should modify **source model files**, not generated indices.

------------------------------------------------------------------------

# Important principle

Model JSON files represent **knowledge content**.

They should be treated as structured data rather than application logic.

When analyzing the repository, agents should inspect only a **small
number of representative model files** unless broader analysis is
necessary.
