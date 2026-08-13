# Note editor — outstanding bugs and requests

Working list, ordered by effort. Tick items off as they ship.

## Low effort: quick visual & text fixes

- [x] **Active style visual indicator** — it was unclear which text colour was selected. Added a clear visual indicator for the active colour.
- [x] **Empty note placeholder text** — dropped "or record a lecture" from the placeholder.

## Medium effort: typography, alignment & sizing

- [ ] **Dynamic placeholder styling & list overlap**
  - On an empty note, turning on bullets/numbers/checklist makes the placeholder overlap the marker, because the placeholder doesn't shift. Only affects the placeholder, not typed text.
  - Changing settings before typing feels wrong — set the size to max and the placeholder doesn't resize.
  - The placeholder should reflect whatever styling is currently active: size, underline, bullets, and so on.
- [ ] **List element spacing** — gap between bullets / numbered items / checklist items differs from normal paragraph line-wrap spacing. Make list spacing match the natural wrap spacing.
- [ ] **Checkmark alignment & layout proximity**
  - Checkboxes sit slightly low; they should be vertically centred against their text.
  - With centre/right alignment the checkbox stays pinned far left. It should travel with the text and stay next to it, the way Word does.
- [ ] **Note width text boundary** — the notepad was widened but the text boundary wasn't, so text wraps well before the note's right edge.

## High effort: table behaviour & selection mechanics

- [ ] **Table context menus** — right-click a table to insert/delete rows and columns.
- [ ] **Table highlighting & selection engine**
  - Cell highlighting doesn't fill the cell cleanly.
  - Dragging upward from a cell selects horizontally across everything instead of staying in the column, as though cells were one flat tab sequence.
  - Wanted: native vertical column selection — dragging up a column selects only that column. Fix the selection logic generally so table editing is less annoying.
