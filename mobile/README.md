# BIOTrace (NidusClean) — Android Mobile Application

Dedicated Flutter Android mobile application for the **BIOTrace / NidusClean** Biomedical Waste Digital Chain-of-Custody & Statutory Compliance Platform.

---

## 1. Architecture Overview

The mobile application acts as a native field client communicating directly with the common, existing BIOTrace backend:

```
                    ┌─────────────────────────┐
                    │   BIOTrace Backend      │
                    │                         │
                    │ Express.js (Node.js)    │
                    │ Prisma ORM              │
                    │ Supabase PostgreSQL     │
                    │ REST API & Socket.IO    │
                    │ JWT / RBAC Engine       │
                    │ Supabase Storage        │
                    └────────────┬────────────┘
                                 │
                     ┌───────────┴───────────┐
                     │                       │
              ┌──────▼───────┐       ┌──────▼───────┐
              │ React / Vite │       │ Flutter      │
              │ Web App      │       │ Android App  │
              └──────────────┘       └──────────────┘
```

The application preserves 100% of the existing production architecture. No duplicate backend or database is created.

---

## 2. Prerequisites & Environment Requirements

| Component | Minimum Requirement | Recommended / Verified |
| :--- | :--- | :--- |
| **Flutter SDK** | `>= 3.32.0` | `Flutter 3.32.4` (Channel stable) |
| **Dart SDK** | `>= 3.8.0` | `Dart 3.8.1` |
| **Java JDK** | `Java 17` or `Java 21 LTS` | `JBR 21.0.11` (Android Studio JBR) |
| **Android SDK** | API Level 23+ (Android 6.0+) | Target SDK 34 / 36 |
| **Gradle** | `8.12` | `8.12` (via Gradle Wrapper) |

---

## 3. Application Identity & Permissions

- **Application ID:** `com.nidusclean.biotrace`
- **Application Name:** `BIOTrace`
- **Branding:** Forest Green (`#1F5C3B`), Hazmat Amber (`#F1602A`), Deep Executive Navy (`#0B132B`).

### Declared Android Permissions (`AndroidManifest.xml`):
- `android.permission.INTERNET`: REST API queries and Socket.IO real-time event streaming.
- `android.permission.ACCESS_NETWORK_STATE`: Network availability and offline detection.
- `android.permission.ACCESS_FINE_LOCATION`: Point-of-generation and custody handover GPS verification.
- `android.permission.ACCESS_COARSE_LOCATION`: Cell/WiFi triangulation fallback.
- `android.permission.CAMERA`: Live QR tag barcode scanning and sealed waste bag evidence capture.
- `android:usesCleartextTraffic="true"`: Seamless local development support across emulator (`10.0.2.2`) and physical phones on local WiFi.

---

## 4. Layered Directory Structure

```
mobile/
├── android/                   # Native Android Gradle project (Gradle 8.12, Java 21)
├── lib/
│   ├── core/
│   │   ├── config/            # AppConfig (Environment & URL management)
│   │   ├── constants/         # AppRoles, AppConstants, DemoAccounts
│   │   ├── network/           # ApiClient (HTTP, Bearer JWT, error mapping)
│   │   ├── services/          # LocationService (GPS), EvidenceService (Camera)
│   │   ├── socket/            # SocketService (Socket.IO client & stream)
│   │   ├── storage/           # SecureStorageService (Android EncryptedSharedPreferences)
│   │   └── theme/             # AppColors, AppTheme (Material 3)
│   │
│   ├── features/
│   │   ├── auth/              # LoginScreen (Form + 1-Click Role Switcher)
│   │   ├── collection/        # CollectionDashboardScreen (QR handover & custody)
│   │   ├── government/        # GovernmentDashboardScreen (Statewide CPCB gateway)
│   │   ├── hospital/          # HospitalDashboardScreen (Manifest logging & stats)
│   │   ├── inspector/         # InspectorDashboardScreen (Risk dossiers & audits)
│   │   ├── navigation/        # MainShellScreen (Role routing & bottom nav)
│   │   ├── personnel/         # PersonnelDirectoryScreen (Staff verification)
│   │   ├── transport/         # TransportDashboardScreen (OSM map & telemetry)
│   │   └── treatment/         # TreatmentDashboardScreen (Weighbridge & autoclave)
│   │
│   ├── shared/
│   │   ├── models/            # User, WasteBatch, CustodyEvent, Vehicle, RiskCase, Facility
│   │   └── widgets/           # AppHeader, StatCard, Badges, QrScannerSheet, EvidencePicker
│   │
│   └── main.dart              # Entrypoint, theme bootstrap & auth guard
│
├── test/
│   └── widget_test.dart       # Unit & widget test suite (5 passing tests)
└── pubspec.yaml               # Flutter package dependencies
```

---

## 5. Development & Production Configuration

The application defaults to **Production Cloud** on real devices and fresh APK installations:

1. **Production Cloud (Default):**
   - API Base: `https://biotrace-backend-aniv.onrender.com/api`
   - WebSocket: `https://biotrace-backend-aniv.onrender.com`
   - Directly connects physical devices to the live deployed Render backend.
   - Includes automatic cold-start handling (40s timeout cushion) with in-app status updates during cloud standby wake-up.

2. **Local WiFi / LAN IP (For Local Testing on Physical Phone):**
   - API Base: `http://<YOUR_PC_IP>:5000/api`
   - WebSocket: `http://<YOUR_PC_IP>:5000`

3. **Android Emulator:**
   - API Base: `http://10.0.2.2:5000/api`
   - WebSocket: `http://10.0.2.2:5000`
   - Only for Android Studio virtual devices.

The app features an interactive **Environment Switcher** and **Server Health Probe** directly on the login screen. Tapping "Probe Server Health" performs an immediate zero-credential HTTP verification against `/api/health`.

---

## 6. How to Build & Run

### A. Install Dependencies
```bash
cd mobile
flutter pub get
```

### B. Run Static Analysis & Tests
```bash
flutter analyze
flutter test
```

### C. Run on Connected Device or Emulator
```bash
flutter run
```

### D. Build Debug APK (For Direct Phone Installation)
```bash
flutter build apk --debug
```
**Output Location:**
`mobile/build/app/outputs/flutter-apk/app-debug.apk`

### E. Build Release APK
```bash
flutter build apk --release
```
**Output Location:**
`mobile/build/app/outputs/flutter-apk/app-release.apk`

---

## 7. Installing onto a Physical Android Phone

1. Enable **Developer Options** on your Android phone (Settings → About Phone → Tap *Build Number* 7 times).
2. Enable **USB Debugging** in Developer Options.
3. Connect your phone via USB cable and verify connection:
   ```bash
   adb devices
   ```
4. Install the debug APK directly:
   ```bash
   adb install -r build/app/outputs/flutter-apk/app-debug.apk
   ```
   *(Alternatively, transfer `app-debug.apk` via WhatsApp, Google Drive, or USB file transfer and tap to install).*

---

## 8. Role-Based Demonstration Testing

On the login screen, tap any of the **1-Click Demo Testing Roles** to immediately authenticate and test full field workflows:

- **Dr. Aarav Mehta** (`hospital@demo.com`) — Hospital Authority
- **Meera Iyer** (`collection@demo.com`) — Collection Officer
- **Vikram Singh** (`transport@demo.com`) — Transport Officer
- **Rajesh Patel** (`treatment@demo.com`) — Treatment Facility (CBWTF)
- **Sunita Sharma** (`government@demo.com`) — Government Authority (CPCB)
- **Amit Deshmukh** (`inspector@demo.com`) — Compliance Inspector

Standard demo password: `password123`.

To switch context while inside the app, tap the **Switch Duty Role** icon in the top header.
