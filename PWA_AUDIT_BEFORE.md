# PWA_AUDIT_BEFORE.md — Get My Moment PWA & Standalone App Audit (Pre-Implementation)

**Date:** August 25, 2026  
**Auditor:** Antigravity PWA & Mobile UX Engine  
**Platform:** Get My Moment (Production Web Application)

---

## 📱 1. Existing PWA Configuration & Manifest Review

| Parameter | Current Value | Assessment |
| :--- | :--- | :--- |
| **Manifest Path** | /manifest.json | Present in pps/web/public/manifest.json. Referenced in layout.tsx. |
| **App Name** | Get My Moment - Studio OS | Clear & descriptive. |
| **Short Name** | GetMyMoment | Correct (< 12 chars). |
| **Display Mode** | standalone | Defined in manifest. |
| **Scope** | *Missing explicit scope* | Recommended to declare scope: / for complete route coverage. |
| **Start URL** | /dashboard | Functional for photographers. |
| **Theme Color** | #E86A5B | Terracotta Coral brand color. |
| **Background Color** | #FAF9F7 | Soft Cream Stone neomorphic background. |
| **Icons** | /icon.svg (192x192, 512x512, any maskable) | Valid SVG vector icon. |
| **Apple Web App** | capable: true, statusBarStyle: 'default' | Configured in Next.js layout.tsx metadata. |

---

## ⚙️ 2. Existing Service Worker & Registration

- **Status:** No custom sw.js was registered.
- **Impact:** Modern Chromium/Safari browsers require an active service worker and manifest to trigger standard PWA install banners and enable offline shell caching.
- **Remediation Plan:** Provide a resilient, non-intrusive sw.js that registers silently in Providers.tsx and passes all network API requests (/api/*, uploads, downloads, websockets) directly to the network without interfering with auth tokens or dynamic data.

---

## 🔍 3. Existing Standalone vs. Browser Presentation

- **Detection:** The codebase currently has **no runtime standalone detection** (display-mode: standalone / 
avigator.standalone).
- **Consequence:**
  1. When launched from the device home screen as an installed PWA, the UI renders the exact same broad layout as the desktop/mobile browser tab without taking advantage of native app shell mechanics.
  2. The mobile header occupies standard browser margins and displays website-oriented navigation instead of a compact, native app header.
  3. Safe-area insets (env(safe-area-inset-top), env(safe-area-inset-bottom)) are partially applied in utility classes but not synchronized dynamically with standalone viewport bounds.

---

## 🎨 4. Problems Discovered Across Key Portals in Mobile/PWA Viewports

### A. Studio Master Workspace (/dashboard):
- Header on mobile standalone feels like a website top bar rather than an app navigation bar.
- Event list cards have slightly wide paddings that push content below the fold.

### B. Guest AI Discovery Portal (/e/[token]):
- Fullscreen camera viewfinder does not adapt to full viewport height in standalone mode.
- Lightbox controls are traditional overlays rather than thumb-friendly floating actions.

### C. Client Album Proofing (/selection/[token]):
- Good sticky selection tray exists, but needs native-like touch feedback (spring scale, active states) and safe bottom padding in standalone mode.

### D. Crew Field Portal (/crew/dashboard):
- Ceremony switcher buttons are functional, but need high-contrast active ring and thumb-accessible positioning for single-handed use during fast wedding ceremonies.

---

## 🛠️ 5. Recommended PWA UI/UX Improvements

1. **Runtime Standalone Detection Hook & Context:**
   - Create useStandalone() hook detecting window.matchMedia('(display-mode: standalone)').matches and 
avigator.standalone.
   - Add .is-standalone / .is-pwa class to document.documentElement for CSS scoped overrides.

2. **Standalone-Optimized App Shell:**
   - Compact h-14 header with status-bar top padding (pt-safe) when installed.
   - Enhanced MobileTabBar with native spring feedback and seamless bottom safe-area cushion (pb-safe).

3. **Bottom Sheets & Modal Polish:**
   - Ensure all dialogs cleanly transition to tactile bottom sheets with drag handles on mobile and standalone viewports.

4. **Service Worker Shell Registration:**
   - Register a zero-conflict sw.js that immediately caches the icon and shell, while passing 100% of API/auth calls straight to the network.

5. **Strict Invariant Verification:**
   - Zero modifications to FastAPI, PostgreSQL, face vectors, camera FTP, or token auth.
   - Ensure 140/140 tests pass on production.

---

## 🚫 FUNCTIONAL ISSUES — OUT OF SCOPE
- None identified that violate PWA presentation. All backend systems, camera FTP ingest, and face-matching algorithms are operating normally.
