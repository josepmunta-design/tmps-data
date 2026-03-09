# TMPS Data Repository

This repository contains the structured data used by the **TMPS
ecosystem (Tu Mentor Psicología)**.

It stores psychotherapy models, conceptual relationships, and generated
indices used by several visualization and learning applications.

The repository functions primarily as a **structured knowledge base**.

------------------------------------------------------------------------

# Repository purpose

The goal of this repository is to organize psychotherapy knowledge in a
structured and machine-readable format.

It includes:

-   psychotherapy models
-   theoretical influences
-   psychotherapy processes
-   clinical procedures
-   micro-interventions
-   conceptual summaries

These data are used to generate visualizations, learning tools, and
interactive applications.

------------------------------------------------------------------------

# Repository structure

Main directories:

    data/Core/modelos/

Canonical JSON files describing psychotherapy models.

    data/Core/escuelas/

School-level files referencing models.

    indices/subprocesos/
    indices/temporal/

Generated indices derived from model data.

    tools/

Scripts used to generate indices.

    apps/

Static visualization applications.

------------------------------------------------------------------------

# Source of truth

Canonical data lives in:

    data/Core/modelos/
    data/Core/escuelas/

Generated files live in:

    indices/

If changes are required, modify the source data and regenerate indices.

------------------------------------------------------------------------

# Working with the repository

Typical workflow:

1.  edit model JSON files
2.  run generator scripts
3.  verify generated indices
4.  update applications if necessary

------------------------------------------------------------------------

# Important note for AI agents

This repository is currently **READ-ONLY for AI agents**.

Agents may:

-   read files
-   analyze repository structure
-   propose modifications

Agents must NOT:

-   modify files
-   commit changes
-   create pull requests
-   rewrite JSON files

All modifications must be proposed and applied manually by a human.

------------------------------------------------------------------------

# About the TMPS ecosystem

The TMPS ecosystem organizes psychotherapy knowledge across multiple
dimensions:

-   theoretical schools
-   psychotherapy models
-   psychological processes
-   clinical procedures
-   micro-interventions

The goal is to create a **structured and explorable map of psychotherapy
knowledge**.
