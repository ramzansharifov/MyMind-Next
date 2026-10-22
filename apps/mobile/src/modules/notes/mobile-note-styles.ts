export const mobileNoteStyles = `
  body { overflow: auto; }
  .notes-rich-root[data-note-canvas] { position: relative; isolation: isolate; width: calc(100% - 16px); margin: 12px 8px; min-height: calc(var(--page-count) * 1120px + (var(--page-count) - 1) * 32px); }
  [data-note-canvas] .notes-editor { position: relative; z-index: 1; display: grid; align-content: start; gap: 12px; padding: 24px 20px; min-height: calc(var(--page-count) * 1120px + (var(--page-count) - 1) * 32px); font-size: 1rem; line-height: 1.85; }
  [data-note-canvas] .notes-editor > * { margin: 0; min-width: 0; }
  /* The generic editor adds 0.75rem between top-level nodes in addition to
     the canvas grid's 12px gap. Desktop uses only the grid gap. */
  [data-note-canvas] .notes-editor > * + * { margin-top: 0; }
  /* UA default paragraph margins inside each li were adding ~2 lines of
     empty space per bullet / numbered / task entry (and breaking pagination). */
  [data-note-canvas] .notes-editor li p { margin: 0; min-height: 0; }
  [data-note-canvas] .notes-editor li { min-width: 0; }
  /* Lists are editable block flow, not independent CSS grid tracks.
     This matches the Desktop editor and avoids browser caret/row layout anomalies. */
  [data-note-canvas] .notes-editor ul,
  [data-note-canvas] .notes-editor ol { display: block; }
  [data-note-canvas] .notes-editor li + li { margin-top: 0.25rem; }
  [data-note-canvas] .notes-editor li[data-type=taskItem] > div > ul,
  [data-note-canvas] .notes-editor li[data-type=taskItem] > div > ol { margin-block: 0.25rem; }
  .mobile-note-pages, .mobile-note-gutters { position: absolute; inset: 0; pointer-events: none; }
  .mobile-note-page { position: absolute; width: 100%; height: 1120px; border: 1px solid var(--border); border-radius: 8px; background-color: var(--paper); }
  [data-note-layout=card] .mobile-note-page { border-width: 2px; }
  .mobile-note-gutters { z-index: 2; }
  .mobile-note-gutters > div { position: absolute; width: 100%; height: 32px; background: var(--workspace); }
  [data-note-layout=canvas] { min-height: 60vh !important; background-color: var(--paper); }
  [data-note-layout=canvas] .notes-editor { padding-inline: 10px; min-height: 60vh; }
  [data-paper-pattern=dots] .mobile-note-page, [data-note-layout=canvas][data-paper-pattern=dots] { background-image: radial-gradient(circle, color-mix(in srgb, var(--text) 18%, transparent) 1px, transparent 1px); background-size: 24px 24px; }
  [data-paper-pattern=grid] .mobile-note-page, [data-note-layout=canvas][data-paper-pattern=grid] { background-image: linear-gradient(color-mix(in srgb,var(--text) 9%,transparent) 1px, transparent 1px), linear-gradient(90deg,color-mix(in srgb,var(--text) 9%,transparent) 1px,transparent 1px); background-size: 28px 28px; }
  .note-page-break { display: block; width: 100%; margin: 0; padding: 0; border: 0; line-height: 0; pointer-events: none; user-select: none; }
  .note-pagination-measuring .note-page-break, [data-note-layout=canvas] .note-page-break { display: none !important; }
  .notes-editor blockquote { color: var(--text); padding: 12px 16px; border-left: 3px solid var(--accent); border-radius: 4px 12px 12px 4px; background: var(--surface); }
  .notes-editor .note-highlight-contrast { color: var(--note-highlight-foreground); }
  .notes-editor ::selection { color: var(--text); background: color-mix(in srgb, var(--accent) 30%, transparent); }
  .notes-editor ul[data-type=taskList] { list-style: none; padding-left: 0; }
  .notes-editor li[data-type=taskItem] { display: flex; align-items: flex-start; gap: 10px; padding-left: 0; }
  .notes-editor li[data-type=taskItem] > label { display: flex; flex-shrink: 0; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; margin: 0 -5px 0; cursor: pointer; }
  .notes-editor li[data-type=taskItem] > div { flex: 1; min-width: 0; }
  .notes-editor input[type=checkbox] { appearance: none; width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--muted); margin: 0; background: var(--surface); cursor: pointer; }
  .notes-editor input[type=checkbox]:checked { background: color-mix(in srgb,var(--accent) 78%,black); border-color: var(--accent); }
  .notes-editor input[type=checkbox]:checked::after { content: '✓'; display: block; font-size: 15px; color: white; text-align: center; line-height: 19px; }
  .mobile-note-divider { padding: 18px 0; }
  .mobile-note-divider > span { display: block; height: var(--divider-size); border-radius: 9px; background: var(--accent); }
  .mobile-note-divider[data-divider-variant=dashed] > span, .mobile-note-divider[data-divider-variant=dotted] > span { height: 0; border-top: var(--divider-size) dashed var(--accent); background: none; border-radius: 0; }
  .mobile-note-divider[data-divider-variant=dotted] > span { border-top-style: dotted; }
  .mobile-note-divider[data-divider-variant=tapered] > span { clip-path: polygon(0 50%,50% 0,100% 50%,50% 100%); }
  .mobile-note-divider.ProseMirror-selectednode { outline: 2px solid var(--accent); border-radius: 8px; }
  .mobile-note-attachment { position: relative; overflow: hidden; margin: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; font-size: 14px; line-height: 1.5; }
  .mobile-note-attachment[data-selected=true] { outline: 2px solid var(--accent); outline-offset: 2px; }
  .mobile-note-attachment figcaption { padding: 12px 14px; border-bottom: 1px solid var(--border); font-weight: 600; }
  .mobile-note-attachment img { display: block; width: 100%; }
  .mobile-note-attachment video, .mobile-note-attachment iframe { width: 100%; display: block; aspect-ratio: 16 / 9; border: 0; background: black; }
  .mobile-note-attachment audio { width: 100%; padding: 8px; }
  .mobile-note-attachment button { min-height: 44px; padding: 10px 14px; border: 0; border-radius: 8px; background: transparent; color: var(--text); font: inherit; cursor: pointer; }
  .mobile-note-attachment button:focus-visible { outline: 2px solid var(--accent); }
  .mobile-note-attachment .mobile-note-expand { position: absolute; top: 8px; right: 8px; min-width: 44px; background: #0009; color: white; font-size: 22px; }
  .mobile-note-attachment .mobile-note-attachment-settings { display: block; width: 100%; border-top: 1px solid var(--border); color: var(--muted); text-align: right; font-size: 12px; }
  .mobile-note-file { width: 100%; text-align: left; overflow-wrap: anywhere; }
  .mobile-note-empty { padding: 32px 20px; color: var(--muted); text-align: center; }
  .mobile-note-image-dialog { position: fixed; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none; border: 0; margin: 0; padding: 16px; background: #07080a; color: white; }
  .mobile-note-image-dialog::backdrop { background: black; }
  .mobile-note-image-dialog button { background: #222; color: white; min-height: 44px; padding: 10px 16px; border: 0; border-radius: 8px; }
  .mobile-note-image-dialog img { display: block; width: 100%; height: calc(100% - 60px) !important; object-fit: contain !important; }
`
