# VectorNet — IDE AI Agent Context & Development Guide

> **Notice for AI Assistants & IDE Agents (Cursor, Claude Code, Copilot, Antigravity, Windsurf):**  
> This document is the single source of truth for the codebase architecture, design decisions, tech stack, and progress history. Read this file first before making changes or proposing code.

---

## 1. Project Overview

- **Project Name:** VectorNet (Team Vector)
- **Hackathon:** Smart India Hackathon (SIH) 2026
- **Problem Statement ID:** PS 26155 (Ministry / Organization: NTRO / NCIIPC)
- **Goal:** A defense-grade, multi-vendor network configuration compliance auditor that normalizes heterogeneous device configurations (Cisco, Juniper, Palo Alto, Fortinet, Arista, SONiC, AWS SG) into a canonical common schema, audits them against security baselines (CIS Benchmarks, NIST SP 800-53, DISA STIG), anchors results onto an immutable blockchain ledger, and automatically generates syntax-checked remediation scripts and team tasks.

---

## 2. Core Architecture & Design Decisions

### A. Universal Common Schema (Vendor-Agnostic Normalization)
- Raw network device configurations (CLI dumps, set commands, JSON logs) are parsed into a normalized **Security Baseline Model (SBM)** using **Pydantic v2**.
- Standardizes SSH versions, cleartext protocols (Telnet, HTTP, SNMPv1/v2c), idle session timeouts, ACLs, and password encryption types across all vendors.
- Supported Vendors: Cisco IOS/IOS-XE, Juniper Junos, Palo Alto PAN-OS, Fortinet FortiOS, Arista EOS, MikroTik RouterOS, SONiC OS, AWS Security Groups.

### B. Deterministic 5-State Compliance Evaluation
- Compliance is evaluated deterministically using AST and Regex rules—**not** by unconstrained LLM guessing.
- 5 Compliance States:
  - `PASS`: Configuration satisfies the standard.
  - `FAIL`: Violation detected with line number evidence.
  - `WARNING`: Sub-optimal setting or missing non-critical control.
  - `UNKNOWN`: Unrecognized or novel syntax requiring training.
  - `NOT_APPLICABLE`: Rule not relevant to the detected device type.
- Standards Mapped: CIS Benchmarks, NIST SP 800-53 Rev 5, DISA STIG, ISO 27001.

### C. Blockchain Audit Ledger & Cryptographic Proofs
- **Smart Contract:** `contracts/NetworkAuditLedger.sol` (Solidity 0.8.20).
- **Audit Anchoring:** Computes a SHA-256 Merkle root from all rule findings and binds it with the configuration's SHA-256 fingerprint (`source_hash`) and auditor public key.
- **EVM Compatibility:** Deployed/anchored against Polygon Amoy Testnet (Chain ID 80002) / local verifiable cryptographic ledger.
- **Non-Repudiation:** Prevents internal database tampering. If any finding row is altered in the database, the Merkle root check fails with a `TAMPER WARNING`.
- **Endpoints:**
  - `/api/v1/blockchain/records` (Retrieve committed blocks)
  - `/api/v1/blockchain/verify` (Verify live config integrity against on-chain proof)

### D. Dual-Tier AI & LLM Engine
- **Air-Gapped Local Tier:** Ollama (`qwen2.5-coder:7b`, `mistral:7b`) for classified/sensitive defense networks with zero outbound traffic.
- **Cloud Tier:** OpenRouter API (NVIDIA Nemotron 3.5, Google Gemma 2) with automated key pooling, failover, and circuit breakers.
- **Data Redaction:** Regex-based credential scrubber automatically masks passwords, pre-shared keys, and SNMP community strings before sending text to any LLM.

### E. Agentic Dynamic Skills System (`backend/skills/*.md`)
- Compliance rules and vendor syntaxes are defined in Markdown files with YAML frontmatter.
- Changes to rule definitions hot-reload immediately in the running engine without recompilation or server restarts.

### F. Automated Team Tasking
- Critical and high severity violations automatically generate structured tasks (Jira / Microsoft Teams).
- Supports on-premise Jira Data Center via local LAN as well as offline CSV/JSON batch exports for completely disconnected environments.

---

## 3. Tech Stack Matrix

| Layer | Technologies / Libraries Used |
| :--- | :--- |
| **Frontend UI** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React |
| **Data Visualization** | Recharts (Compliance scorecards, framework distribution charts) |
| **Client Fallback** | `frontend/lib/compliance_evaluator.ts` (Full browser-side audit & Merkle generator) |
| **PDF Reporting** | `pdf-lib` (Client-side) & ReportLab (Python backend) |
| **Backend API** | FastAPI (Python 3.11), Uvicorn, Pydantic v2 |
| **Parsers** | CiscoConfParse, Python Regex AST engine |
| **Blockchain** | Solidity 0.8.20, Web3.py, SHA-256 Merkle Tree (`hashlib`) |
| **Local AI** | Ollama (`qwen2.5-coder`, `mistral`) |
| **Cloud AI** | OpenRouter API (Nemotron 3.5, Gemma 2, Nex N2.5) |
| **Databases** | PostgreSQL (`psycopg2-binary`), Redis (Cache & Celery broker), Firebase Firestore |
| **Storage** | AWS S3 / MinIO (Config snapshot backups) |
| **DevOps** | Docker, Docker Compose, GitHub Actions CI/CD |

---

## 4. Repository Directory Structure

```text
sih_mock/
├── CONTEXT.md                  # <-- THIS FILE: Living context for IDE AI agents
├── README.md                   # Public repository documentation
├── docker-compose.yml          # Container orchestration (API, Redis, Postgres)
├── run_audit.py                # Standalone CLI audit runner
│
├── contracts/                  # Blockchain Smart Contracts
│   └── NetworkAuditLedger.sol  # Solidity contract for immutable audit certificates
│
├── backend/                    # Python FastAPI Backend
│   ├── main.py                 # Application entry point & router mounting
│   ├── audit_orchestrator.py   # Multi-engine coordinator
│   ├── vendor_detector.py      # Tier 1 regex banner & Tier 2 keyword classifier
│   ├── requirements.txt        # Python dependencies
│   │
│   ├── app/
│   │   ├── api/                # API Routers
│   │   │   ├── audit_router.py     # Evaluation, normalization, & blockchain endpoints
│   │   │   ├── ai_router.py        # AI remediation & vector queries
│   │   │   ├── task_router.py      # Jira/Teams task management
│   │   │   └── report_router.py    # Report generation
│   │   ├── core/
│   │   │   └── models.py           # Pydantic schemas (SBM, ComplianceSummary, BlockchainAuditRecord)
│   │   ├── engines/
│   │   │   ├── compliance.py       # Deterministic rule evaluator
│   │   │   ├── normalizer.py       # SBM canonical normalization
│   │   │   ├── remediation.py      # Syntax-checked CLI fix generator
│   │   │   └── vector_store.py     # Embeddings & CLI similarity matching
│   │   ├── providers/          # LLM Provider abstraction & IntelligentRouter
│   │   └── services/
│   │       ├── blockchain_service.py # SHA-256 Merkle tree & EVM block sealer
│   │       ├── skills_service.py     # Markdown (.md) skills hot-reload engine
│   │       └── firestore_service.py  # Local/remote Firestore persistence
│   │
│   └── skills/                 # Hot-Reloadable Agentic Skill Profiles
│       ├── global.md           # Universal NIST/CIS/DISA baseline rules
│       ├── cisco_ios.md        # Cisco IOS/IOS-XE rule profile
│       ├── juniper_junos.md    # Juniper Junos rule profile
│       ├── palo_alto.md        # Palo Alto PAN-OS rule profile
│       └── fortinet_fortios.md # Fortinet FortiOS rule profile
│
├── frontend/                   # Next.js 14 Web Application
│   ├── package.json            # Node.js dependencies
│   ├── app/
│   │   ├── layout.tsx          # Root layout & styling
│   │   ├── page.tsx            # Main application shell with tab switcher
│   │   └── api/
│   │       ├── evaluate/route.ts   # Evaluation proxy / client fallback
│   │       └── export-pdf/route.ts # PDF export handler
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx      # Platform header with status & role switcher
│   │   │   └── Sidebar.tsx     # Navigation sidebar (8 core views)
│   │   ├── views/
│   │   │   ├── IngestionView.tsx   # Config upload, text editor, demo sample loader
│   │   │   ├── AuditorView.tsx     # Findings matrix, Blockchain Audit Stamp, OSCAL lines
│   │   │   ├── OverviewView.tsx    # High-level posture & compliance scorecards
│   │   │   ├── RemediationView.tsx # Verified CLI fix proposals & rollback scripts
│   │   │   ├── ReportsView.tsx     # Executive PDF verification preview & download
│   │   │   ├── TasksView.tsx       # Automated team ticketing (Jira/Teams)
│   │   │   ├── SkillsView.tsx      # Interactive Markdown skill editor
│   │   │   └── WorkbenchView.tsx   # AI vector training loop for novel syntax
│   │   └── modals/
│   │       └── SamplesModal.tsx    # Multi-vendor sample configuration picker
│   └── lib/
│       ├── compliance_evaluator.ts # Standalone browser-side deterministic evaluator
│       ├── demo_samples.ts         # 10 curated test configs (clean & vulnerable)
│       └── types.ts                # Shared TypeScript interfaces
│
└── demo_test_cases/            # Verification Config Dumps
    ├── cisco/                  # Cisco sample configurations
    ├── juniper/                # Juniper Junos samples
    ├── paloalto/               # Palo Alto samples
    ├── fortinet/               # Fortinet samples
    └── combinations/           # Multi-vendor hybrid test configs
```

---

## 5. Development & Running Guide

### Local Development (Frontend + Backend):
```bash
# 1. Start Python Backend (Port 8000)
uvicorn backend.main:app --reload --port 8000

# 2. Start Next.js Frontend (Port 3000)
cd frontend
npm run dev
```

### Vercel Deployment Settings:
- **Root Directory:** `frontend`
- **Framework Preset:** `Next.js`
- **Build Command:** `next build`
- **Output Directory:** `.next`
- *Note:* The frontend is self-contained. If the backend is offline or deployed standalone on Vercel, `frontend/lib/compliance_evaluator.ts` handles all evaluations, Merkle tree proofs, and remediation generations seamlessly in the browser.

---

## 6. Critical Rules & Development Gotchas

1. **Monorepo `.gitignore` Trap:**  
   Never put a generic `lib/` in the root `.gitignore`. Python environments use `lib/`, but Next.js stores critical code in `frontend/lib/`. The root `.gitignore` contains `!frontend/lib/**` to protect it.
2. **Zero AI Buzzwords in UI / Copy:**  
   Do not write marketing filler words ("seamless", "cutting-edge", "revolutionary", "powered by AI", "next-gen"). Use concrete engineering terms ("deterministic", "OSCAL-aligned", "SHA-256 Merkle proof", "AST parser").
3. **No Unhandled Circular Imports:**  
   In `backend/app/engines/compliance.py` and `backend/app/services/skills_service.py`, import cross-dependent singletons lazily inside methods if circular dependencies arise.
4. **Always Push to Both Remotes:**  
   - `origin`: `https://github.com/priyankarpadhy-eng/sih-mock.git`
   - `upstream`: `https://github.com/VECTOR-SIH/sih-_2026.git`

---

## 7. Changelog & Revision History

### Version 2.2.0 (2026-09-15) — Current Update
- **Created `CONTEXT.md`:** Added universal development and architecture guide for team AI IDE agents.
- **Implemented Blockchain Audit Ledger:**
  - Created `contracts/NetworkAuditLedger.sol` (Solidity smart contract for on-chain audit certificates).
  - Built `backend/app/services/blockchain_service.py` with SHA-256 Merkle root calculation and block hashing.
  - Added on-chain verification routes (`/api/v1/blockchain/records` and `/api/v1/blockchain/verify`).
  - Added live "Immutable Blockchain Audit Stamp" card in `AuditorView.tsx` with block number, TxID, Merkle root, and on-chain verification badge.
  - Added deterministic Merkle generator to `frontend/lib/compliance_evaluator.ts` for standalone Vercel deployments.
- **Clarified Offline Team Tasking:** Documented on-premise private LAN Jira Data Center integration and offline CSV work order exports.

---

### Version 2.1.0 (2026-09-14) — Previous Update
- **Removed Inventory & Telemetry Tabs:** Cleaned up sidebar navigation and UI to strictly focus on core compliance auditing and remediation.
- **Added Demo Samples Modal:** Added dedicated `FlaskConical` Samples button and modal with 10 multi-vendor test configs (Cisco, Palo Alto, Junos, FortiOS, combos).
- **Status Badges on Samples:** Added instant status indicators (`Clean • 0 Errors` vs `Errors Found • X Violations`) so evaluators immediately know expected test outcomes.
- **Fixed Blank Analysis on Vercel:** Created `compliance_evaluator.ts` and `/api/evaluate` route to ensure audit findings and remediation scripts never render blank.

---

### Version 2.0.0 (2026-09-09) — Initial Architecture Stabilization
- Initial setup of modular FastAPI backend (`backend/app/`).
- Implemented `IntelligentRouter` with local Ollama provider and OpenRouter failover.
- Built dynamic Markdown (`.md`) Agentic Skills hot-reload engine.
- Created Next.js 14 frontend with Tailwind CSS and dark/light engineering theme.
