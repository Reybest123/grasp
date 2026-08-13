// Undo/redo for the note editor.
//
// The browser keeps its own undo stack for a contentEditable, but it only knows
// about edits it made itself. Every structural change in this editor — bullets,
// checklists, tables, equations, an AI refine — is a hand-rolled DOM mutation
// (see lib/richText.ts), so the native stack is blind to them and Ctrl+Z would
// skip straight past to whatever was typed before. This replaces it outright:
// the editor intercepts the shortcuts and drives this stack instead.
//
// A step is the editor's whole HTML plus the caret as a character offset
// (lib/richText.ts's caretOffset/restoreCaret), which is what makes the caret
// survive the innerHTML swap an undo performs.

export type Step = { html: string; caret: number };

/** Runs of plain typing inside this window collapse into one undo step. */
const COALESCE_MS = 600;

const LIMIT = 200;

export class NoteHistory {
  private past: Step[] = [];
  private future: Step[] = [];
  private present: Step = { html: "", caret: 0 };
  private lastRecord = 0;
  private lastCoalesced = false;

  /** Starts over on `html` — called when the editor switches notes. */
  reset(html: string): void {
    this.past = [];
    this.future = [];
    this.present = { html, caret: 0 };
    this.lastRecord = 0;
    this.lastCoalesced = false;
  }

  /**
   * Records the editor's new state. `coalesce` is for character-by-character
   * typing: consecutive keystrokes amend the current step instead of stacking
   * one undo per letter. Structural edits always start a fresh step.
   */
  record(html: string, caret: number, coalesce = false): void {
    if (html === this.present.html) {
      this.present.caret = caret;
      return;
    }

    const now = Date.now();
    const amend = coalesce && this.lastCoalesced && now - this.lastRecord < COALESCE_MS;
    if (!amend) {
      this.past.push(this.present);
      if (this.past.length > LIMIT) this.past.shift();
    }

    this.present = { html, caret };
    this.future = [];
    this.lastRecord = now;
    this.lastCoalesced = coalesce;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): Step | null {
    const previous = this.past.pop();
    if (!previous) return null;
    this.future.push(this.present);
    this.present = previous;
    this.lastCoalesced = false;
    return previous;
  }

  redo(): Step | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(this.present);
    this.present = next;
    this.lastCoalesced = false;
    return next;
  }
}
