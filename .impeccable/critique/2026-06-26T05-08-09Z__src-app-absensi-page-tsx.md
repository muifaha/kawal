---
target: src/app/absensi/page.tsx
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-06-26T05-08-09Z
slug: src-app-absensi-page-tsx
---
# Design Critique: src/app/absensi/page.tsx

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Banners and counts update immediately, but the save button lacks a visual spinner during execution. |
| 2 | Match System / Real World | 4 | Natural Indonesian school terminology used throughout. |
| 3 | User Control and Freedom | 3 | Easy navigation and date adjustments. Past locked date indicator is clear. No undo for saves. |
| 4 | Consistency and Standards | 3 | Focus-row highlighting is cohesive. Tonal background color combinations have slight legibility issues. |
| 5 | Error Prevention | 4 | Date locks prevent accidental historical overwrites of locked class attendances. |
| 6 | Recognition Rather Than Recall | 4 | Clear visible instructions for keyboard shortcuts. Live stats tracker updates in real-time. |
| 7 | Flexibility and Efficiency | 4 | High speed keyboard navigation (H, S, I, A, D keys) allows recording a class roster in seconds. |
| 8 | Aesthetic and Minimalist Design | 3 | Clean UI, but row selection indicator uses a thick side border flagged as an AI design trope. |
| 9 | Error Recovery | 3 | Simple alerts display diagnostic errors from database or action layer. |
| 10 | Help and Documentation | 3 | Shortcut legend is helpful, but specific school policies on late/dispensation are undocumented. |
| **Total** | | **34/40** | **Good** |

## Anti-Patterns Verdict

**LLM Assessment**:
The interface has high utility and clean styling. However, the focused table row selection utilizes a thick colored left border (`border-l-4 border-l-emerald-400`), which triggers the "side-stripe card accent border" anti-pattern. 

The inactive status buttons also use small text with low-opacity colors that can have poor visibility on dark layouts.

**Deterministic Scan**:
The automated scanner detected **10 warnings** in `src/app/absensi/AbsensiClient.tsx`:
1. `side-tab` (Warning, line 267): Thick left border selection (`border-l-4`).
2. `gray-on-color` (Warning, lines 278, 279, 280, 286, 287, 288, 289, 290, 357): Multiple false positives where near-black text (`text-slate-950`) on light/bright backgrounds was categorized as gray text, and hover classes (`hover:bg-emerald-500/20`) confused the parser.

**Visual Overlays**:
No browser automation visual overlays are available in this sandbox. CLI scan findings and static code analysis were used instead.

## Overall Impression
This is a highly efficient page. The keyboard shortcut system is an outstanding accelerator for power users. Visual polish on focused rows and contrast tweaks on disabled buttons will elevate it.

## What's Working
1. **Super-User Keyboard Mode**: Arrow keys navigation and single-letter status keys (H, S, I, A, D) with auto-advance.
2. **Real-Time Bottom Summary Bar**: The floating counter keeps track of the totals dynamically, updating as the user types.

## Priority Issues

### 🟡 [P2] Selection Indicator Side-Stripe (`border-l-4`)
* **Why it matters**: A thick left border highlight mimics the AI "ghost card stripe" and looks visual lopsided.
* **Fix**: Replace `border-l-4` on active rows with a clean complete outline or a full subtle background row tint.
* **Suggested command**: `/impeccable layout`

### 🟡 [P2] Efficiency Gap: Save Shortcut
* **Why it matters**: BK counselors can complete a class list using only the keyboard but are forced to use the mouse to click the "Simpan" button at the bottom.
* **Fix**: Add a keyboard listener for `Ctrl+S` or `Enter` (when not focusing input fields) to trigger the save action.
* **Suggested command**: `/impeccable polish`

### 🟢 [P3] Inactive Buttons Contrast
* **Why it matters**: Muted text on dark background buttons has low contrast.
* **Fix**: Increase inactive button text to `text-slate-300` and use a slightly lighter slate border for readability.
* **Suggested command**: `/impeccable typeset`

## Persona Red Flags

* **Alex (Power User - School Counselor/BK)**: Hates taking hands off the keyboard. Disappointed that they have to grab the mouse just to click save at the end of recording attendance.
* **Jordan (First-Timer - New Teacher)**: Sees buttons "H, S, I, A, D" and must recall their meaning. A small legend or tooltip on top would make the onboarding experience seamless.

## Minor Observations
* No loading spinner inside the submit button when saving/sending WA in progress.

## Questions to Consider
1. Should we add a default legend or header explanation of the attendance letters (H, S, I, A, D)?
2. What key combination should trigger the save shortcut (e.g. `Ctrl+S` or `Enter`)?
