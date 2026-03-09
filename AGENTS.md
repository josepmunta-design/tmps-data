# AGENTS.md

## Repository policy (IMPORTANT)

This repository is currently **READ-ONLY for AI agents**.

Agents must **NOT modify, create, delete, rename, or commit any files** in this repository.

Allowed actions:
- read files
- analyze repository structure
- explain code or data
- propose changes in chat

Not allowed:
- editing files
- creating pull requests
- committing changes
- modifying generated indices
- rewriting JSON files

If a change is required, the agent must:

1. explain the change  
2. provide the modified code or JSON snippet  
3. let the human user apply the change manually  

---

# Project overview

This repository contains the **data and static apps** for the TMPS ecosystem.

The project is **data-driven** and organized around psychotherapy models.

Main components:

- psychotherapy model data
- generated indices
- static HTML apps that visualize the data

This repository functions primarily as a **structured knowledge base**, not as a traditional application.

---

# Repository structure

## Model data

data/Core/modelos/

Canonical JSON files describing psychotherapy models.

These files contain **content and metadata**, not application logic.

They are organized by psychotherapy school.

---

## Schools

data/Core/escuelas/

School-level files referencing model files.

Used for building temporal graphs and indices.

---

## Generated indices

indices/subprocesos/  
indices/temporal/

These files are **generated artifacts** derived from model JSON files.

They should normally **not be edited directly**.

Changes should be applied to source data and then regenerated.

---

## Generator scripts

tools/

Scripts that build index files from model JSON data.

Main scripts:

- build-subprocesos-index.mjs
- build-temporal-index.mjs

---

## Static apps

apps/modelos/  
apps/mapamundi/

Simple static applications that consume repository data.

---

# Source of truth

Canonical source files:

data/Core/modelos/**  
data/Core/escuelas/**

Derived artifacts:

indices/subprocesos/**  
indices/temporal/index.json

Always prefer editing **source files** rather than generated artifacts.

---

# Data vs logic

Important distinction:

JSON files under `data/Core/modelos/` are **data**.

Application logic lives in:

- apps/
- tools/

Agents should avoid scanning many model JSON files unless the task specifically concerns model content.

---

# Editing rules

Reminder: **this repository is read-only for agents.**

Agents must not modify files.

When proposing edits:

- make minimal changes
- preserve field names
- preserve IDs
- preserve references
- avoid reformatting large JSON files

All edits must be **proposed, not applied**.

---

# Safe working strategy for agents

1. Identify task type:

- data content
- generated indices
- UI / apps
- generator scripts

2. Inspect the **smallest relevant set of files**

3. Avoid loading large numbers of JSON model files unless required.

---

# Notes

This repository is best understood as a **structured psychotherapy knowledge base with thin visualization layers**.

Efficient agents should:

- minimize context consumption
- read only relevant files
- treat model JSON files as structured data.
