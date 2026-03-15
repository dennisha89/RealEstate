---
globs: "**/{components,app}/**/*.{tsx,ts}"
---

# Accessibility Rules (WCAG 2.1 AA)

## Color & Contrast
- Minimum contrast ratio 4.5:1 for text, 3:1 for large text (18px+ or 14px bold).
- **Never use color alone to convey information.** The green/amber/red system MUST pair with:
  - Icons (checkmark, warning triangle, X) OR
  - Text labels ("Buy", "Hold", "Avoid") OR
  - Patterns (solid, dashed, dotted for chart lines)
- Test all charts and heatmaps with a color blindness simulator (deuteranopia, protanopia).

## Keyboard Navigation
- All interactive elements must be keyboard-accessible (Tab, Enter, Escape, Arrow keys).
- Visible focus indicators on all focusable elements — never `outline: none` without replacement.
- Modal dialogs trap focus and return focus on close.
- Data tables support arrow key navigation between cells.

## Screen Readers
- All images and icons need `alt` text or `aria-label`. Decorative icons use `aria-hidden="true"`.
- Charts must have a text alternative — either `aria-label` summary or a data table toggle.
- Financial metric cards: `aria-label` should read the full context (e.g., "Cap Rate: 6.5%, trending up").
- Dynamic content updates use `aria-live="polite"` for non-urgent updates, `aria-live="assertive"` for alerts.
- Deal grade badges: screen reader must announce grade AND meaning (e.g., "Grade A: Buy recommendation").

## Forms & Inputs
- Every input has a visible `<label>` — no placeholder-only labels.
- Error messages linked via `aria-describedby`.
- Required fields marked with both visual indicator AND `aria-required="true"`.
- Property search form: announce result count after search completes.

## Financial Data Tables
- Use semantic `<table>`, `<thead>`, `<th scope="col">` — not div grids for tabular data.
- Large numbers use `aria-label` with spoken format (e.g., `aria-label="$1.2 million"` not "$1,200,000").
- Sortable columns announce sort direction on activation.

## Motion & Animation
- Respect `prefers-reduced-motion` — disable chart animations, transitions when set.
- No auto-playing animations that last >5 seconds without pause control.
- Loading skeletons are fine (subtle pulse is not distracting).
