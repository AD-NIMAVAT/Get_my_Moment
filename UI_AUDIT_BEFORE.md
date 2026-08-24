# UI_AUDIT_BEFORE.md — Get My Moment UI/UX Master Audit (Pre-Implementation)

**Date:** August 25, 2026  
**Auditor:** Antigravity UI/UX Master Engine  
**Target:** Get My Moment (Production Photography OS & AI Face Matching Platform)

---

## 🎯 Executive Summary & Audit Baseline

Get My Moment has an approved luxury design identity rooted in **Soft Neomorphism**, **Terracotta Coral (#E86A5B)**, **Warm Gold (#D9A441)**, and **Soft Cream Stone (#FAF9F7 / #F3F1EC)**.

This audit inspects every screen and shared component to identify areas where visual polish, spacing rhythm, typographic scale, card density, photo presentation, and responsive alignment can be elevated to meet luxury editorial standards **WITHOUT changing any underlying backend, API, or business logic**.

---

## 📋 Comprehensive Audit Matrix

| Page / Component | UI Issue Identified | Category | Severity | Recommended UI Improvement |
| :--- | :--- | :--- | :--- | :--- |
| **Global Layout & CSS** (globals.css) | Heavy shadow values on small screens can cause visual muddying | Neomorphism & Shadows | Low | Refine dual-shadow blur and spread values to be softer and more subtle (shadow-[4px_4px_10px_#E2DDD5,-4px_-4px_10px_#FFFFFF]). |
| **Studio Dashboard** (/dashboard) | Event cards have slightly uneven vertical padding between cover and action buttons | Spacing & Alignment | Medium | Standardize card padding (p-4 sm:p-5), ensure 16:9 cover aspect ratio, and align action buttons with equal gap (gap-2). |
| **Studio Dashboard** (/dashboard) | Stat cards in header ribbon lack visual breathing room on tablet viewports (768px - 1024px) | Responsive & Spacing | Medium | Implement fluid auto-fit metrics grid with responsive gap (gap-3 sm:gap-4) and refined typography. |
| **Event Command Center** (/dashboard/events/[id]) | Ceremony folder pills list can overflow awkwardly when many folders exist | Navigation & Layout | High | Ensure horizontal scrollbar-hidden container with snap alignment and subtle fade gradient indicators on left/right. |
| **Event Command Center** (/dashboard/events/[id]) | Photo grid items have dense borders that compete with high-res photographs | Photo Presentation | High | Make photos the primary hero: clean borderless cards with subtle rounded corners (ounded-2xl), smooth hover zoom (scale-[1.02]), and subtle gradient overlays for selection badges. |
| **Event Command Center** (/dashboard/events/[id]) | Floating bulk selection toolbar can cover bottom photo row on mobile devices | Responsive & Layout | High | Add safe-area bottom cushion (mb-16 sm:mb-0) and elevate the floating toolbar with backdrop blur and tactile shadows. |
| **Event Command Center** (/dashboard/events/[id]) | QR Standee Flyer tab was previously just an icon; needs crisp print styles and tent-card preview | Component & Typography | Medium | Ensure high-res QR display, clean 3-step guest guide with refined numbers, and print-ready CSS (@media print). |
| **Wireless Camera Modal** (WirelessCameraModal.tsx) | Credentials display card (FTP Host, Port, User, Pass) text density is high and can wrap awkwardly | Text Density & Spacing | Medium | Use clean two-column grid with monospace font for credentials, 1-click copy icons, and distinct status badges (Approved, Pending, Revoked). |
| **Guest AI Portal** (/e/[token]) | Selfie circular viewfinder and camera frame can feel abrupt on small mobile viewports (360px - 390px) | Mobile & Micro-interactions | Medium | Center circular camera preview with glowing terracotta border pulse, clear 1-second shutter button, and elegant countdown ring. |
| **Guest AI Portal** (/e/[token]) | Matched photo gallery masonry grid needs seamless lightbox navigation | Photo Presentation | Medium | Ensure full-screen lightbox with smooth swipe/arrow navigation, 1-click high-res download, and discreet WhatsApp share button. |
| **Client Selection Portal** (/selection/[token]) | Sticky bottom approval counter bar can overlap mobile content | Responsive & Spacing | Medium | Enforce bottom safe-area margin (pb-24) on photo container so the sticky selection summary bar never covers bottom photos. |
| **Crew Mobile Portal** (/crew/dashboard) | 1-Tap ceremony buttons need larger touch targets for active field photographers | Mobile & Touch Targets | High | Make ceremony switcher chips large, tactile, with minimum 48px height, instant active state indicator, and distinct live badge. |
| **Super Admin Dashboard** (/admin/dashboard) | Large tables (Photographers, Events, Invoices) have crowded headers on 1024px screens | Layout & Tables | Medium | Use clean horizontal scroll wrapper with sticky first column or responsive card cards on smaller desktop screens. |
| **Shared Modal** (Modal.tsx) | Modal body scrolling can bounce background on iOS Safari | Accessibility & Mobile | Low | Preserve overscroll-contain and smooth custom scrollbar styles across all modals. |

---

## 🎨 Design System Preservation Verification

* **Brand Colors Locked:** #E86A5B (Terracotta Coral), #D9A441 (Champagne Gold), #FAF9F7 / #F3F1EC (Soft Cream Stone), #1F1F1F (Charcoal Obsidian).
* **Styling Locked:** Soft Neomorphism with subtle dual-shadows and inset wells.
* **Business Logic Locked:** 0 backend, database, AI, camera, or API changes.
