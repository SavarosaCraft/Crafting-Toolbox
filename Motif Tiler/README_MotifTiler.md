# Motif Tiler

A local, browser-based tool for arranging imported motif artwork into tilings and exporting the result as a JPG. No server, no account, works offline. Your files stay on your machine.

## Run

```
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

## How to use

1. **Import a motif** (JPG, PNG or SVG). A window opens on the full-size image: drag out the usable area, pick its shape (Rectangle, Square, Triangle, Hexagon, Octagon), and fine-tune with the Size, Rotation and Offset sliders.
2. **Pick a layout and board size** in the sidebar (Columns × Rows, up to 60 × 60). Resizing adds or removes cells and never rescales existing ones.
3. **Select cells**: click one, Shift-click to add, Ctrl/Cmd-click to toggle, Esc to clear.
4. **Apply**: click a motif, **EMPTY** (deliberate negative space) or **Delete Cell** (back to unfilled). Click a color swatch, or **+** to pick a new one, to tint the selection at 30%.
5. **Edit a motif later** by double-clicking it (or a cell that uses it).
6. **Zoom** with the side slider, the +/− buttons, **Fit**, or Ctrl/Cmd + mouse wheel.
7. **Save** the project (embeds your motifs) or **Export JPG**, which is cropped to the part of the board you actually used.

## Layouts

Rectangular, Triangular, Hexagonal, and Octagons + squares.


## Project layout

```
src/
  main.ts            app wiring, UI, interactions
  model/             project, cells, motifs, tilings, crop shapes
  render/            canvas drawing, tiling geometry, hit-testing
  io/                project save/open, JPG export, image processing
  ui/                motif usable-area editor window
```
