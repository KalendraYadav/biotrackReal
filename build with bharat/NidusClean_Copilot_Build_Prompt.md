# NidusClean (BioTrace) — Full-Stack Build Prompt for GitHub Copilot

Copy everything below into Copilot Chat (or paste into your repo as `PROJECT_BRIEF.md` and reference it in prompts) to scaffold the project.

---

## 1. Project Overview

Build a full-stack web application called **NidusClean** (product login screen name: **BioTrace**) — a **digital chain-of-custody platform for biomedical waste (BMW)** that gives every waste batch a verifiable digital identity from the moment it is generated inside a hospital to its final treatment and disposal.

**Problem it solves:** Once biomedical waste leaves a hospital's gates today, there is no reliable way to verify that it was collected, transported, and treated correctly. This enables illegal dumping, broken chain of custody, quantity mismatches, and delayed disposal — causing environmental contamination and public health risk, despite BMW Rules 2016 requiring proper handling.

**Core idea:** Every custody handover (Generation → Collection → Transport → Treatment → Disposal) must be verified with **QR scan + authenticated user identity + live photo evidence + geolocation + timestamp + quantity confirmation** before the system marks that stage complete. An AI/rule-based risk engine continuously watches this chain and auto-triggers an inspection case the moment something looks wrong.

Build this as a working prototype with a real backend and database, seeded with realistic **demo data** so every dashboard looks alive out of the box (no empty states).

---

## 2. Tech Stack (use exactly this stack)

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React.js + Tailwind CSS, built as a PWA (installable, works with basic offline caching) |
| **Backend** | Node.js + Express.js, REST API architecture |
| **Authentication** | JWT-based auth, Role-Based Access Control (RBAC), bcrypt for password hashing |
| **Maps / QR / Evidence** | QR Code generation & scanning (e.g. `qrcode` + a scanner lib like `html5-qrcode`), Camera API for live photo capture, Geolocation API, Google Maps JS API (or Leaflet + OpenStreetMap if no API key available), geofencing logic |
| **Database** | PostgreSQL with the **PostGIS** extension (for storing geolocation points, routes, and geofence polygons) |
| **Risk Engine / AI** | Rule-based anomaly detection engine + composite risk scoring (0–100), designed so an AI agent / LLM call can later be swapped in for narrative risk summaries |
| **Cloud / Storage** | Firebase Storage (or local `/uploads` folder for the prototype) for photo evidence |
| **Realtime (optional but ideal)** | WebSockets (Socket.IO) for live GPS position updates and live risk-score alerts on dashboards |

Set up the repo as a monorepo:

```
/nidusclean
  /backend   (Express API, Prisma or Sequelize ORM, PostgreSQL)
  /frontend  (React + Tailwind + Vite, PWA config)
  /seed      (scripts to generate demo data)
```

---

## 3. Roles & Role-Based Login (RBAC)

Build a single login screen ("BioTrace — Biomedical Waste Compliance & Risk Monitoring") with a dropdown/button list of demo roles so judges can instantly switch context. Each role redirects to its own dashboard after JWT auth.

1. **Hospital Authority** — registers waste, checks local limits
2. **Collection Officer** — records QR handover, verifies tags
3. **Transport Officer** — transit GPS checkpoints, route tracking
4. **Treatment Facility (CBWTF)** — receives, reconciles weight & processes
5. **Government / Regulatory Authority** — central dashboards, dispatch overview (SPCB/CPCB/DHA level)
6. **Compliance Inspector** — field audit anomalies, inspection case log & evidence

Implement RBAC middleware on the backend so each API route checks the JWT's role claim before allowing access — don't just hide UI elements on the frontend.

---

## 4. Core Data Model (suggested schema — adapt as needed)

```
users (id, name, email, password_hash, role, facility_id, created_at)

facilities (id, name, type[HOSPITAL|CBWTF], city, address, lat, lng, bed_count, cpcb_registration_no)

waste_batches (
  id, batch_code (e.g. BMW-2026-00124), hospital_id, generating_department,
  cpcb_waste_category, cpcb_waste_type, quantity_kg, unit,
  qr_code_value, status [GENERATED|COLLECTED|IN_TRANSIT|RECEIVED|TREATED|DISPOSED],
  assigned_cbwtf_id, compliance_deadline_at, created_at
)

custody_events (
  id, batch_id, stage [GENERATION|COLLECTION|TRANSPORT_PICKUP|TRANSPORT_DROPOFF|TREATMENT|DISPOSAL],
  performed_by_user_id, verified_by_scan (bool), photo_url,
  latitude, longitude, geofence_valid (bool), timestamp,
  quantity_at_stage_kg, notes
)

vehicles (id, plate_no, transport_officer_id, current_lat, current_lng, last_ping_at)

hospital_activity_logs (id, hospital_id, date, bed_occupancy, surgeries_count, ops_count, expected_waste_kg)

risk_cases (
  id, batch_id, case_code (e.g. INS-2026-0042), risk_score (0-100),
  triggers (jsonb array: e.g. ["quantity_discrepancy_28kg","route_deviation","missing_verification"]),
  status [ASSIGNED|UNDER_INVESTIGATION|RESOLVED], assigned_inspector_id,
  created_at, resolved_at
)

audit_log (id, actor_user_id, action, entity, entity_id, timestamp)
```

Every stage transition in `custody_events` must reference the *previous* verified event — enforce at the database/service layer that a stage cannot be marked complete unless the prior stage's evidence (QR scan + photo + GPS + timestamp) already exists. Reject the update otherwise ("Enforced chain-of-custody logic").

---

## 5. Dashboards — Design Brief

**General UI direction:** Keep it simple yet attractive — clean card-based layouts, generous white space, a light neutral background, one accent color per module (use the brand palette: orange `#F1602A`, deep green `#1F5C3B`, and a purple/teal accent for risk elements), rounded-corner cards, subtle shadows, clear status pills/badges (green = compliant, amber = warning, red = high risk). Avoid clutter — 3–4 stat cards up top, then a focused table or map below. Use icons (lucide-react) instead of walls of text. Mobile-responsive since field/transport roles will use it on phones.

### 5.1 Hospital Dashboard (Hospital Authority)

- **Header stats:** No. of beds, surgeries/operations today, waste generated today (kg), compliance status
- **Waste Registration form:** hospital facility, generating department, CPCB waste category & type, quantity + unit, assigned CBWTF, capture GPS coordinates, biometric/staff authentication of the person logging it, photo evidence capture
- **Packing/Tagging step:** generate a unique QR code for the new batch (visually show the QR to print/stick on the bag)
- **Waste Tracking table:** list of this hospital's batches with live status (Generated → Collected → In Transit → Received → Treated → Disposed), batch code, quantity, assigned facility, days-to-deadline countdown
- **Activity correlation panel:** show bed occupancy & surgery count vs. expected/actual waste generated (the "Activity-Based Waste Validation" chart) — flag if actual waste is abnormally higher/lower than expected for that activity level

### 5.2 Transport Dashboard (Transport Officer)

- **Live map view:** vehicle's current GPS position, planned route, geofenced safe corridor overlay
- **Assigned pickups list:** batches to collect, with QR scan-to-confirm action
- **Handover verification flow:** at both pickup and drop-off — scan QR → authenticate the officer (login/biometric/PIN) → capture live photo → auto-capture GPS + timestamp → confirm quantity → submit (this creates a `custody_events` row)
- **Route deviation alert:** if GPS strays outside the geofenced corridor, flag it in real time and log it as a risk trigger

### 5.3 Treatment Facility Dashboard (CBWTF)

- Incoming batches queue (scan waste in)
- Quantity reconciliation: compare received weight vs. generation-stage recorded weight, show discrepancy %
- Mark batch Treated → Disposed, with final audit record (hash-chained record ready for inspection)

### 5.4 Government / Regulatory Authority Dashboard

- Central, read-only aggregated view across all hospitals/CBWTFs/transporters in their jurisdiction
- Map of all active batches and their live status
- Compliance stats: % BMW disposed treated on time, breach rate by facility, states/regions with violations
- Drill-down into any facility's history

### 5.5 Compliance Inspector Dashboard

- **Assigned Audit Cases** (from the AI risk engine), **High Priority Audits**, **Under Investigation**, **Resolved Audits** stat cards
- Case detail view: batch cargo ID, composite risk score, list of triggers (e.g. "Quantity discrepancy of 28 kg between Generated and Received weight"), cargo verification metrics (outbound weight vs. collection weight vs. weighbridge receipt), uploaded field evidence photos, full audit-log timeline of actions taken on the case
- Action buttons: escalate, request more evidence, close case

### 5.6 AI Risk Engine (backend service + a small "Risk Center" UI)

Implement a rule-based anomaly detection service that runs whenever a custody event is created or a deadline check runs. It should evaluate:

- **Missing verification** — a required QR scan/photo/GPS wasn't captured
- **Quantity mismatch** — weight at one stage differs from the previous stage beyond a configurable tolerance %
- **Route deviation** — transport GPS ping falls outside the geofenced corridor
- **Unauthorized activity** — an event logged by a user/role not authorized for that facility/stage
- **Time/SLA violation** — a stage wasn't completed within its configurable compliance timer (e.g. must be collected within 24 hrs of generation, treated within X hrs of collection)

Combine triggered flags into a **composite risk score (0–100)** using simple weighted rules (e.g. quantity mismatch = +30, route deviation = +25, missing verification = +20, SLA breach = +15 each, stacking). When the score crosses a threshold (e.g. ≥70), auto-create a `risk_cases` row, assign it to an inspector (round robin or by region), and push a real-time alert to the Government and Inspector dashboards.
Leave a clean interface/service boundary (e.g. `riskEngine.evaluate(batchId)`) so an LLM call could later be swapped in to generate a plain-English risk narrative for each case.

---

## 6. Chain-of-Custody Flow to Implement End-to-End

1. **Generation** — Waste bagged & tagged with a unique QR at the point of generation inside the hospital.
2. **Collection** — Handler scans QR, photo, geolocation & timestamp logged as first custody event.
3. **Transport** — Vehicle GPS + geofencing confirm route; each handover re-verified by scan.
4. **Treatment** — CBWTF scans waste in, quantity reconciled against the generation record.
5. **Disposal & Audit** — Final disposal logged; full hash-chained record available for inspection.

Enforce that **no stage can be marked complete until the previous stage's evidence is recorded** — build this as a hard backend validation, not just a UI restriction.

---

## 7. Demo Data Generation

Write a `/seed` script (Node.js, run via `npm run seed`) that populates the database with realistic demo data so the app looks fully alive on first run:

- 4–6 hospitals with varying bed counts (50–500 beds) and city/lat-lng across India
- 2–3 CBWTFs (treatment facilities)
- ~15 demo users covering all 6 roles, with simple demo passwords (e.g. `password123`) clearly labeled for judges
- 30–50 `waste_batches` in a healthy mix of statuses across the lifecycle (some fully disposed with clean records, some mid-transit, a few stuck/overdue)
- Corresponding `custody_events` for each batch consistent with its current status
- 90 days of `hospital_activity_logs` (bed occupancy, surgeries, ops) with waste generated correlated to activity, but inject a few anomalous days (spike/drop) to demonstrate the Activity-Based Validation feature
- 5–8 `risk_cases` in different states (Assigned, High Priority, Under Investigation, Resolved) with realistic trigger arrays (e.g. "Quantity discrepancy of 28 kg between Generated and Received weight", "Vehicle deviated from safe green corridor rules") and 1–2 sample evidence photo placeholders per case
- Sample vehicle GPS trails (a short array of lat/lng points per active transport batch) so the live map has something to animate/plot

Make the seed script idempotent (safe to re-run: clears and reseeds) and print a summary table of demo login credentials to the console when done.

---

## 8. API Endpoints to Scaffold (minimum set)

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/facilities
POST   /api/waste-batches
GET    /api/waste-batches            (filterable by facility, status)
GET    /api/waste-batches/:id
POST   /api/waste-batches/:id/custody-event   (the generic "scan+photo+gps+qty" handover endpoint, stage-aware)

GET    /api/vehicles/:id/location
POST   /api/vehicles/:id/ping        (GPS ping from transport officer's device)

GET    /api/hospitals/:id/activity   (beds/surgeries vs waste generated)

GET    /api/risk-cases
GET    /api/risk-cases/:id
POST   /api/risk-cases/:id/action    (escalate / resolve / request-evidence)

GET    /api/dashboard/summary?role=  (role-aware aggregate stats for header cards)
```

---

## 9. Build Order (tell Copilot to do this step by step)

1. Scaffold monorepo, Express server, PostgreSQL + PostGIS connection, Prisma/Sequelize models from the schema above.
2. Build auth (JWT + bcrypt + RBAC middleware) and the role-picker login screen.
3. Build the seed script and get demo data into the DB.
4. Build the waste-batch lifecycle APIs + the generic custody-event handover API with the chain-of-custody enforcement rule.
5. Build the rule-based Risk Engine service and wire it to run after every custody event + a scheduled SLA check.
6. Build the React frontend shell (routing, auth context, Tailwind theme with the brand colors) and then each of the 6 dashboards one at a time (§5).
7. Add the QR generation/scanning flow and camera/geolocation capture components (reused across Hospital, Collection, Transport, Treatment screens).
8. Add the live map (Google Maps or Leaflet) for Transport and Government dashboards, plotting vehicle trails and geofence polygons.
9. Wire up Socket.IO (or polling as a fallback) for live GPS + live risk alerts.
10. Polish UI: stat cards, status badges, empty/loading states, mobile responsiveness, and a PWA manifest so it's installable.

---

## 10. Naming Notes

- Product/login screen name: **BioTrace**
- Underlying platform/brand name used in written materials: **NidusClean**
- Team: VyomCare — keep this out of the actual app UI; it's only for the hackathon submission cover.
