# Weaving Pattern Designer

A single-file HTML5 web app (`weaving.html`) for designing color patterns for a handheld wooden weaving loom. You color two rows of threads, and the app shows what the repeated textile looks like. There are no libraries and no build step; the page is plain HTML, CSS and JavaScript.

## The idea

On a handheld (rigid heddle) loom the warp threads alternate between two positions: the holes and the slots. The app models that with two rows of cells:

- **Row A** has `n` cells (default 12).
- **Row B** has `n + 1` cells and is offset by half a cell, so every A cell sits between two B cells.

The preview repeats the pair A, B, A, B and so on, like bricks or a honeycomb.

```
        A   A   A   A        (n cells)
      B   B   B   B   B      (n + 1 cells, offset half a cell)
        A   A   A   A
      B   B   B   B   B
```




## Using it

1. **Pick a color** from the palette swatches. The selected swatch has an outline.
2. **Paint** by tapping or dragging across cells in row A or row B. The textile preview updates immediately.
3. **Add a custom color** with the dashed circle with a **+** at the end of the palette. A dialog opens with a color chooser. Nothing changes until you press **Apply**. **Cancel**, Escape, or tapping outside the dialog closes it without changes.
4. **color a single cell with a custom color** by double-clicking (or double-tapping) it. The same dialog opens, and Apply sets that cell and adds the color to the palette.
5. **Fill A / Fill B** color a whole row with the selected color.
6. **Cells in row A** changes the loom width (2–30). Row B always has one more.
7. **Repeats** sets how many A+B pairs are drawn in the preview (1–40).
8. **Save pattern / Load pattern** write and read a file on your computer (see below).

## The preview

The textile is drawn on an HTML `<canvas>`. Each cell is an elongated pointy-top hexagon (width `w`, straight sides about `1.58w`, pointed caps about `0.42w`). The proportions come from `textile_tiling.svg`. A thin dark outline and a soft shading across each cell give a thread-like look.

Rows are spaced `2w` apart, so the hexagons interlock like a honeycomb. Row A cells are centred half a cell in from row B's, which is what creates the half-cell offset. The cell size adjusts to the loom width so the preview stays within the page.

## Layout on small screens

The editing rows are CSS grids that stretch to the screen width, so the cells shrink to fit. Each row uses a grid of `2 × (n + 1)` half-columns:

- B cell `i` spans half-columns `2i+1` to `2i+2`.
- A cell `i` spans half-columns `2i+2` to `2i+3`.

That is how the half-cell offset is produced in the editor. The grid has a minimum width of about 26 px per cell, so with many cells it scrolls sideways instead of becoming too small to tap.

## Saving and loading patterns

**Save** produces a small JSON file, `weaving-pattern.json`:

```json
{
  "app": "weaving-pattern",
  "version": 1,
  "repeats": 8,
  "A": ["#2c5f7c", "#f5e6c8", "..."],
  "B": ["#c0392b", "#e67e22", "..."]
}
```

**Load** opens a file picker, checks that `A` and `B` are lists of `#rrggbb` colors, then restores both rows, the loom width, the repeats, and adds the colors to the palette. If the file isn't a valid pattern, a message appears under the buttons and nothing is changed.

Saving uses the `downloads` capability of the hosted page, which shows a confirmation before the file is written. If you run `weaving.html` outside the hosted page, the Save button will report that saving isn't available. To use it that way, replace the `downloads.save(...)` call in the `#save` handler with a normal Blob and `<a download>` link.

## How the code is organised

All the code is in `weaving.html`:

| Part | What it does |
|---|---|
| `A`, `B` arrays | The pattern itself, a list of hex colors per row |
| `pal`, `pick` | The palette and the currently selected color |
| `size()` | Resizes `A` (n cells) and `B` (n + 1 cells) when the width changes |
| `build()` | Draws the editable cells for both rows, then calls `draw()` |
| `draw()` | Renders the hexagon textile on the canvas |
| pointer handlers | Paint on tap or drag, and detect a double-tap (two taps on the same cell within 400 ms) |
| `openDlg()` / `closeDlg()` | The custom color dialog with Apply and Cancel |
| `#save` / `#load` handlers | Export and import the JSON pattern |

## Limits and notes

- Maximum of 30 cells in row A, 31 in row B, and 40 repeats.
- The pattern is not stored automatically. Use **Save pattern** to keep it, because reloading the page resets it.
- A cell color is either `#rrggbb` or a DMC gradient (see below).

## DMC thread colors

The page contains the DMC list from `dmc_colors.json`: 558 solid colors and 91 gradient (variegated) threads. Open **DMC thread colors** under the palette, search by code or name, or filter by group, then click a swatch to select it.

- **Solid colors** are stored as `#rrggbb`.
- **Gradients** are stored as `g:position:#rrggbb,...`, for example `g:0:#c01d4a,39:#d43c65,100:#feaec7`. A gradient cell is shown with the colors running top to bottom, in the editor and inside each hexagon of the textile preview. Saved patterns keep gradients in this format.
