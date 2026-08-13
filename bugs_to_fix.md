# Note editor — outstanding bugs and requests

Working list, ordered by effort. Tick items off as they ship.

**Delete this file once every box below is ticked** — it is a scratch checklist,
not permanent project documentation. Anything worth keeping goes in CLAUDE.md §11.

## Low effort: quick visual & text fixes

- [x] **Active style visual indicator** — it was unclear which text colour was selected. Added a clear visual indicator for the active colour.
- [x] **Empty note placeholder text** — dropped "or record a lecture" from the placeholder.

## Medium effort: typography, alignment & sizing

- [x] **Dynamic placeholder styling & list overlap** — the placeholder is now a measured element positioned exactly where the first character will land, so it clears bullets and checkboxes, follows alignment, and picks up armed size/bold/italic/underline. Colour stays muted on purpose: a placeholder in the chosen text colour reads as content already typed.
- [x] **List element spacing** — bullets, numbered items and checklist items now sit at 28px, identical to a natural line wrap (verified by measurement).
- [x] **Checkmark alignment & layout proximity** — the box is an inline-block centred on the text's optical middle, and it travels with centre/right alignment. Left-aligned items keep a hanging indent so wrapped lines sit under the text.
- [x] **Note width text boundary** — dropped the 72ch cap; text now runs the full width of the note.

## High effort: table behaviour & selection mechanics

- [ ] **Table context menus** — right-click a table to insert/delete rows and columns.
- [ ] **Table highlighting & selection engine**
  - Cell highlighting doesn't fill the cell cleanly.
  - Dragging upward from a cell selects horizontally across everything instead of staying in the column, as though cells were one flat tab sequence.
  - Wanted: native vertical column selection — dragging up a column selects only that column. Fix the selection logic generally so table editing is less annoying.
