# Database Seed Scripts

This folder contains idempotent database seeding scripts for populating NidusClean (BioTrace) with realistic demo data:
- 4–6 Hospitals across India (varying bed counts & locations)
- 2–3 Common Bio-medical Waste Treatment Facilities (CBWTFs)
- 15 demo users spanning all 6 RBAC roles
- 30–50 waste batches across all lifecycle states
- Matching verified custody events (QR, GPS, photo evidence)
- 90 days of hospital activity logs (with injected anomalies for validation demo)
- 5–8 AI risk cases with trigger arrays and evidence
- Vehicle GPS coordinates along geofenced corridors

Run via:
```bash
npm run seed
```
