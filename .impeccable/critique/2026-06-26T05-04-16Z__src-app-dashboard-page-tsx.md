---
target: src/app/dashboard/page.tsx
total_score: 26
p0_count: 0
p1_count: 2
timestamp: 2026-06-26T05-04-16Z
slug: src-app-dashboard-page-tsx
---
# Design Critique: src/app/dashboard/page.tsx

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Great stats grid and active academic year headers. Missing loading states on tab switches. |
| 2 | Match System / Real World | 3 | Contextually accurate Indonesian terms, but some widgets use mixed English headers. |
| 3 | User Control and Freedom | 2 | Action filters are not easily shareable or persistent. No quick 'undo' for critical actions. |
| 4 | Consistency and Standards | 3 | Cohesive dark slate theme. However, inline print layouts include styling overrides not in DESIGN.md. |
| 5 | Error Prevention | 3 | File uploads have file-type limits, but destructive actions lack fast confirmation step. |
| 6 | Recognition Rather Than Recall | 3 | Risk warnings are color-coded correctly. Policy definitions for warning levels are recall-heavy. |
| 7 | Flexibility and Efficiency | 2 | No batch approvals or mass summons actions; requires manual click fatigue for each item. |
| 8 | Aesthetic and Minimalist Design | 3 | Layout is flat and neat. However, 4 competing tabular data widgets make the page feel cluttered. |
| 9 | Error Recovery | 3 | Inline upload errors are displayed clearly, preserving state. |
| 10 | Help and Documentation | 1 | No tooltips explaining policy warnings or direct access to documentation. |
| **Total** | | **26/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM Assessment**:
Kawal avoids standard "AI slop" like glowing neon borders or saturated cream-colored backgrounds, opting instead for a flat, high-density Slate theme. However, the dashboard layout adheres strictly to standard AI templates: multiple cards side-by-side and repeating tabular columns competing for visual focus. 

The parent summons letter print-out template (`htmlContent` string) contains nested HTML with hardcoded fonts (`Times New Roman`) and colors (`#000`), which is necessary for official paper printouts, but pollutes the client component file.

**Deterministic Scan**:
The automated scanner detected **6 findings** in `src/app/dashboard/DashboardClient.tsx`:
1. `gray-on-color` (Warning, line 1627): A false positive where the scanner flagged `text-slate-200` near a file input class containing `file:bg-emerald-500/10` and `file:text-emerald-400`.
2. `design-system-font` (Warning, line 234): Use of `font-family: Times New Roman` in the embedded parent summons letter.
3. `design-system-color` (Advisory, lines 235, 241, 379, 384): Multiple occurrences of undocumented color `#000` inside the embedded print-out HTML letter template.

**Visual Overlays**:
No browser automation visual overlays are available in this sandbox. CLI scan findings and static code analysis were used instead.

## Overall Impression
Kawal functions as a reliable, quiet institutional tool. However, the main summary tab suffers from layout clutter (4 stacked tables) and lacks batch action accelerators for counselors and administrators who handle multiple students daily.

## What's Working
1. **Contextual welcome header**: Shows active academic year, semester, date range, and role description.
2. **Clear point tagging**: Color-codes accumulated point thresholds (rose for severe danger, amber for caution, slate for low) to instantly classify student status.

## Priority Issues

### [P1] Visual & Layout Clutter (Stacked Tables)
* **Why it matters**: Having four separate data grids (Top Violation Points, Top Alpha, Top Absent, Top Violations) in a 2-column layout competes for visual attention, making it hard to see which students need the most urgent attention.
* **Fix**: Consolidate student-risk tables into a single unified "At-Risk Students" list showing a combined risk score (alfa days + violation points).
* **Suggested command**: `$impeccable layout`

### [P1] Efficiency Gap (No Batch Operations)
* **Why it matters**: BK counselors must click each individual student item to approve a violation or resolve a threshold warning summons. In large schools, this leads to heavy click fatigue.
* **Fix**: Implement checkboxes and a global "Approve Selected" or "Resolve Selected" action bar.
* **Suggested command**: `$impeccable polish`

### [P2] Missing Policy Tooltips (Warning Level Meanings)
* **Why it matters**: Warning thresholds of Level 1, 2, and 3 are displayed as bare numbers. Staff must recall what happens at 25, 50, or 75 points (warning letter, parent call, suspension) from memory.
* **Fix**: Add a small hover tooltip or legend explaining what the warning levels signify.
* **Suggested command**: `$impeccable clarify`

### [P2] Print-out Styles Polluting Main Component
* **Why it matters**: Hardcoding formal print CSS (Times New Roman, #000) inside a React client component triggers design lints and clutters the component source.
* **Fix**: Extract the print helper and template string to a separate print utility file.
* **Suggested command**: `$impeccable distill`

## Persona Red Flags

* **Alex (Power User - School Counselor/BK)**: Forced to perform individual mouse click operations for every approval and summons resolution. No keyboard navigation or batch selections are available to speed up high-frequency actions.
* **Jordan (First-Timer - New Teacher)**: The user faces warning levels (1, 2, 3) on the dashboard but receives no contextual help or indicators on what school policy requires them to do next.

## Minor Observations
* Mixed language on headers ("Top Absent Class" and "Top Alpha Student" vs Indonesian headings).
* Text-xxs for upload guidelines might have contrast issues for low-vision users.

## Questions to Consider
1. What if we combined the attendance risks and behavior point risks into a single "Urgent Attention" list?
2. Could the Parent Summons print template be isolated from the main component file to clean up the code and prevent styling drift lints?
