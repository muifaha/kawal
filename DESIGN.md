---
name: Kawal Design System
description: Institutional design system for school attendance, discipline, and student counseling tracking.
colors:
  primary: "#4f46e5"
  primary-dark: "#818cf8"
  background: "#020617"
  foreground: "#f8fafc"
  background-light: "#f8fafc"
  foreground-light: "#0f172a"
  emerald: "#16a34a"
  emerald-light: "#34d399"
  rose: "#e11d48"
  rose-light: "#f87171"
  orange: "#ea580c"
  orange-light: "#fb923c"
  amber: "#d97706"
  amber-light: "#fbbf24"
  slate-border: "#1e293b"
  slate-border-light: "#e2e8f0"
typography:
  display:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#4338ca"
  input-field:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Kawal

## 1. Overview

**Creative North Star: "The Disciplined Anchor"**

The Kawal design system represents stability, structure, and institutional reliability. Designed for guidance counselors, homeroom teachers, and school administrators, the interface acts as a definitive source of truth. The interface is optimized for high-density, high-legibility layout patterns that allow staff to log records quickly during a fast-paced school day. 

Kawal explicitly rejects cartoonish illustrations, overly spacious card-based layouts, and playful color gradients, opting instead for clean lines, structured grids, and subtle color-coded alerts. The goal is to provide a quiet, authoritative environment that respects the serious nature of student counseling and behavioral management.

**Key Characteristics:**
- High-density information grids and clear border demarcations.
- Context-specific color-coding for behavioral severity and attendance status.
- Minimalist flat layout that maximizes content scanning speed.

## 2. Colors

The color palette uses a structured Slate neutral system serving as a clean canvas, punctuated by context-specific status alerts.

### Primary
- **Indigo Action** (#4f46e5 / #818cf8): Used for key call-to-actions, primary buttons, and navigational focus states.

### Secondary
- **Sky Info** (#0284c7 / #38bdf8): Used for links, informational subtexts, and secondary detail tags.

### Tertiary
- **Amber Warning** (#d97706 / #fbbf24): Used for pending status, mild alerts, and intermediate disciplinary levels.

### Neutral
- **Slate Background** (#020617 / #f8fafc): The main surface backing for pages and main layout wrappers.
- **Slate Text** (#f8fafc / #0f172a): Main body text color.
- **Slate Border** (#1e293b / #e2e8f0): Separation lines for cards, tables, and sections.

### Named Rules
**The Alert Rarity Rule.** Status colors (rose, orange, emerald) must only be used on badges, tags, or indicator lights to draw attention. Never use status colors as background fills for large areas.

**The Context-Preservation Rule.** Emerald is strictly reserved for "Present/Hadir" and "Approved" states. Rose is strictly for "Alpha" and "Violations". Never swap them or use them for unrelated actions.

## 3. Typography

**Display Font:** Geist Sans (fallback: system-ui, sans-serif)
**Body Font:** Geist Sans (fallback: system-ui, sans-serif)

**Character:** Clean, neutral, sans-serif typography that optimizes readability across tabular records and forms. Heading weights are bold to establish clear boundaries, while body weights are regular to ensure maximum legibility.

### Hierarchy
- **Display** (Bold (700), clamp(1.75rem, 4vw, 2.5rem), 1.15): Page titles and main dashboard headers.
- **Headline** (Semibold (600), 1.25rem, 1.2): Section headers and card headers.
- **Title** (Medium (500), 1.125rem, 1.2): Subsections and list titles.
- **Body** (Regular (400), 0.875rem, 1.5): Standard reading text, tables, and forms.
- **Label** (Medium (500), 0.75rem, normal): Badges, table headers, and inputs.

### Named Rules
**The Readable Data Rule.** Body text for tables and student logs must maintain a line-height of at least 1.5 to guarantee rapid scanning without ocular fatigue.

## 4. Elevation

The Kawal interface is flat by default. Separation and organization of data are achieved through contrasting background colors (e.g. Slate-950 vs. Slate-900) and thin 1px border lines, rather than drop shadows.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Box shadows are forbidden on standard containers. A subtle border-color shift or background tint must be used instead to show container structure.

## 5. Components

### Buttons
- **Shape:** Medium rounded corners (10px)
- **Primary:** Background color Indigo (`#4f46e5` / `#818cf8`), text color White, padding (`8px 16px`)
- **Hover / Focus:** Transitions to darker/lighter shades with `transition: background-color 0.2s ease`
- **Secondary:** Transparent background with Slate border.

### Cards / Containers
- **Corner Style:** Medium rounded corners (10px or 16px)
- **Background:** Slate-900/40 in dark mode, Slate-50 in light mode
- **Border:** 1px solid Slate-800 (`#1e293b` in dark mode)
- **Internal Padding:** Standard padding of 24px (`p-6`)

### Inputs / Fields
- **Style:** Background Slate-950/dark or White/light, border 1px Slate-800, medium rounded (10px)
- **Focus:** Outline transition to Indigo border with a subtle focus ring.

### Navigation
- **Style:** Sidebar with vertical links, hover state showing Slate highlight, active state showing Indigo indicator.

## 6. Do's and Don'ts

### Do:
- **Do** use 1px border lines and background tone shifts (e.g., Slate-950 and Slate-900) to separate data sections.
- **Do** keep container corners rounded at exactly 10px (`rounded-xl` or `{rounded.md}`).
- **Do** ensure text contrast matches WCAG AA (at least 4.5:1 ratio) on both light and dark themes.
- **Do** use `text-wrap: balance` on display and section headings to prevent awkward orphans.

### Don't:
- **Don't** use cartoonish or overly playful UI patterns that compromise professional authority.
- **Don't** use cluttered or fragmented layouts that resemble legacy school software.
- **Don't** use generic AI/SaaS design tropes like purple-to-blue gradients, glassmorphism blurs, or saturated warm cream backgrounds.
- **Don't** use drop shadows with blur radius greater than 4px on cards or containers.
- **Don't** use side-stripe borders (e.g., `border-left` thicker than 1px) on alerts or cards.
