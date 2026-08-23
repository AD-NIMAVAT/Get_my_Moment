# Get My Moment — Frontend Performance & Web Vitals Baseline (P1-BASELINE-01)

**Framework:** Next.js (App Router, `use client` SPA mode)  
**Styling:** Tailwind CSS + Neomorphic design system  

---

## 1. WEB VITALS LAB PROFILE (GUEST GALLERY EXPERIENCE)

| Metric | Target | Current Lab Value (Stockholm Origin) | Projected with CloudFront CDN (India Edge) | Status |
| :--- | :---: | :---: | :---: | :--- |
| **TTFB (Time to First Byte)** | `< 200 ms` | **~620 ms** | **~25 ms** | `NEEDS_CDN` |
| **LCP (Largest Contentful Paint)**| `< 2.5 s` | **~1.8 s** | **~0.6 s** | `GOOD (LAB)` |
| **CLS (Cumulative Layout Shift)**| `< 0.1` | **0.02** | **0.02** | `EXCELLENT` |
| **INP (Interaction to Next Paint)**| `< 200 ms` | **~45 ms** | **~45 ms** | `EXCELLENT` |

---

## 2. FRONTEND OPTIMIZATION OPPORTUNITIES FOR PHASE 1

1. **Virtual Grid Rendering for Galleries:** Add virtualization for events with > 100 photos to eliminate DOM bloat on low-end mobile devices.
2. **Next.js `<Image>` Component with WebP/AVIF:** Upgrade raw `<img>` tags to Next.js optimized image loading with progressive blur placeholders.
3. **CloudFront Static Asset Offloading:** Serve `/public/`, JavaScript bundles, and CSS directly from CDN edge.

