# NidusClean (BioTrace)

> **Digital Chain-of-Custody & Intelligent Compliance Platform for Biomedical Waste (BMW)**  
> Product Login Screen: **BioTrace**

---

## 📌 Project Overview
NidusClean (BioTrace) provides a tamper-evident, digital chain-of-custody tracking platform for biomedical waste. From the instant waste is bagged in a hospital ward to its final treatment and disposal at a Common Bio-medical Waste Treatment Facility (CBWTF), every physical handover requires:
- **QR scan verification**
- **Authenticated officer credentials (RBAC)**
- **Live photo evidence**
- **GPS geolocation & timestamp logging**
- **Quantity weight reconciliation**

An integrated **AI / Rule-Based Risk Engine** calculates composite risk scores (0–100) and automatically flags inspection cases upon detecting quantity discrepancies, route deviations, missing verification steps, or SLA deadline breaches.

---

## 🏗️ Monorepo Structure

```
/nidusclean
  ├── /backend        # Node.js + Express.js REST API, PostgreSQL + PostGIS (Prisma)
  ├── /frontend       # React + Vite + Tailwind CSS PWA, Lucide icons, Leaflet
  ├── /seed           # Database seed scripts for demo data (15+ users, 30+ batches, cases)
  ├── package.json    # Root scripts to orchestrate backend & frontend
  └── README.md
```

---

## 🚀 Getting Started

### ⚠️ CRITICAL RUNNING REQUIREMENT: REAL SERVER ORIGIN ONLY
> **DO NOT OPEN BY DOUBLE-CLICKING HTML OR VIA `file://` URL!**
> 
> Browsers strictly enforce security sandboxes on `file://` origins:
> 1. **Camera API** (`navigator.mediaDevices.getUserMedia`): Blocked on `file://`; QR scanning and live photo capture will fail.
> 2. **Geolocation API** (`navigator.geolocation.getCurrentPosition`): Blocked on non-localhost/non-HTTPS origins.
> 3. **API Requests** (`fetch`): Blocked by browser CORS policy (`Origin: null` is rejected).
> 
> Always start the application server using `npm run dev` and navigate to **`http://localhost:5173`**.

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20/v22)
- **npm**: v9+
- **Database**: Persistent PostgreSQL engine managed automatically on port 5432 in `backend/data/pg_data`.

### 2. Installation
Install dependencies across the monorepo:
```bash
npm run install:all
```

### 3. Running the Development Servers
Run both backend and frontend concurrently from the project root:
```bash
npm run dev
```
*(Windows shortcut: double-click `start-biotrace.bat`)*

- **Frontend Application**: `http://localhost:5173`
- **Backend API & WebSockets**: `http://localhost:5000`

---

## 👥 Supported Roles (RBAC)
1. **Hospital Authority** (registers waste batches, activity correlation)
2. **Collection Officer** (QR scan, collection tag validation)
3. **Transport Officer** (transit GPS tracking, route corridor validation)
4. **Treatment Facility (CBWTF)** (weight reconciliation, treatment & disposal audit)
5. **Government / Regulatory Authority** (jurisdiction overview, compliance monitoring)
6. **Compliance Inspector** (risk case investigation, evidence review, escalation)
