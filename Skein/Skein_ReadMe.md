# Skein – Read Me

*Palettes built from the threads you actually own.*

## What Skein does

Skein is a color palette helper for stitchers, tatters and other thread crafters. You tell it which threads you own, and it suggests color combinations that go well together, using only those threads. No more picking a palette you can't stitch because you're missing half the colors.

It includes the full DMC color list, so you can tick off what you own. You can also add threads from any other brand, including hand-dyed and variegated ones.

## Getting started

1. Open **skein-palette.html** in your web browser (Chrome, Edge, Safari or Firefox). Just double-click the file or open it from your browser's menu.
2. Keep the file somewhere you can find it. Everything lives in that one file.
3. Open it from your computer or tablet rather than from a website, so that saving works.

**Important:** Skein doesn't remember anything on its own. Your threads and saved palettes are kept in a small file that you save yourself (see *Saving your work* below).

## The three tabs

- **Generate:** make palettes.
- **My threads:** tell Skein what you own.
- **Saved palettes:** palettes you've starred.

At the top you'll also find three round buttons to change the background to dark, medium gray or light, whichever shows your colors best.

## Step 1: Create a yarn type

A yarn type is a label for a group of threads, such as "Size 10" or "Size 20". Each yarn type has its own list of owned threads.

Go to **My threads**, type a name and press **Add yarn type**. Your yarn types appear as buttons at the top of the page. Tap one to switch to it. You can rename or delete the current one from the My threads tab. The same place has Move earlier and Move later buttons, which change the order of your yarn types. Save your stash file afterwards so the order is kept.

## Step 2: Add the threads you own

On the **My threads** tab, the right side is where you add threads:

- Choose **DMC solids**, **DMC gradients** (variegated and multi-color threads) or **My custom**.
- Use the search box to find a number or name, or the group menu to narrow things down.
- Tap a swatch to add it. A check mark means you own it. Tap again to remove it.

The left side shows what you own in this yarn type. Each thread has a note box where you can write things like "2 skeins" or "half used", and a ✕ button to remove it.

**Adding other brands or hand-dyed threads:** open **Add a custom thread**. Enter the brand, number and name, choose Solid or Gradient (pick 2 to 4 colors for a gradient), and tick Metallic if it is one. Then press Add.

## Step 3: Generate palettes

Go to the **Generate** tab. You'll need at least 2 threads in the current yarn type.

- **Generate palette:** the big button at the top. Nothing happens until you press it.
- **Number of colors:** choose between 2 and 8 (2 gives you a simple pair, explained below).
- **Base thread:** the thread to build the palette around. Tap one of your threads, or leave it on **Random**.
- **Gradient threads:** how Skein treats variegated threads (explained below).
- **Include gradient / metallic threads:** switch these off if you don't want them in your palettes.

When you press Generate, Skein builds palettes for all seven color harmonies at once. You'll see the first one, Complementary. Tap any of the buttons across the top to flip through the others. You don't need to press Generate again, and flipping is instant. If you press Generate again later, you'll stay on the harmony you were looking at.

Every palette is balanced between light and dark colors, so you get a good range, not seven mid-tones.

**Two-color pairs:** if you choose 2 colors, you get your base thread plus one partner, picked the way the current harmony would pick it (for example, the opposite color for Complementary). The partner is also chosen to be lighter or darker than your base, so the two read clearly together.

### The seven harmonies, in plain words

- **Complementary:** colors from opposite sides of the color wheel. Bold and lively.
- **Analogous:** colors that sit next to each other. Calm and harmonious.
- **Triadic:** three colors spread evenly around the wheel. Playful and balanced.
- **Split-complementary:** one color plus the two on either side of its opposite. Contrast, but gentler than complementary.
- **Tetradic:** four colors spread evenly around the wheel. Rich and varied.
- **Rectangle:** two pairs of opposites sitting close together. Lots of variety.
- **Monochromatic:** one color family in lighter and darker versions. Soft and elegant.

### Reading a palette

- Each swatch shows the thread number and name. The small number on it is its **color group**, which matches the groups in your design preview.
- **Base** marks your starting thread.
- Under each thread you'll see how close it is to the ideal color: **Exact match**, **Very close**, **Close match** or **Loose match**. Loose just means your stash doesn't have a closer color. It's still the best thread you own for that spot.
- Small chips labeled **also close** show threads you own that are nearly the same color. They're grouped with the main thread, so you don't get near-duplicates.

### How gradient threads are handled

Variegated threads change color along their length, so you can choose how Skein treats them:

- **Average:** the thread counts as its overall average color.
- **Any shade:** the thread can be chosen if any part of it fits. A small dot on the swatch shows which shade matched.
- **Anchor:** a gradient thread becomes the base of the palette, and solid threads fill in around it.

## Handy extras

### Mix colors

Press **⇄ Mix colors** to shuffle which thread goes on which color group. You keep exactly the same threads, just in a different arrangement. If black was color 1, it will move to another group. Press it as often as you like until the design looks right.

### Excluding threads

Double-tap (or double-click) a thread in the **Base thread** row to cross it out. Excluded threads won't be used anywhere in your palettes, which is handy for threads you've run out of or dislike. Double-tap again to bring it back, or press **Include all** to clear them all. Exclusions are remembered for each yarn type when you save.

### Preview on your design

Below the palette, the **Preview** shows your colors on a design. A sample flower is shown to begin with. Press **Load SVG** to use your own pattern.

For your design to work properly, each color area needs to be named **color1**, **color2**, **color3** and so on (in a drawing program like Inkscape, use the group or layer name). Skein counts them and sets the number of colors to match. If your design has no names, Skein simply replaces each different color in order.

### Saving and sharing a palette

- **☆ Save:** keeps the palette in the **Saved palettes** tab.
- **Text list:** a copyable list of thread numbers and names, handy as a shopping or pull list. You can also save it as a text file.
- **JPG:** a picture of the palette to save or share. Tick *Include this preview in JPG exports* if you want your design shown too.

## Saving your work

Skein keeps everything in your browser only while the page is open. To keep your threads, notes, exclusions, saved palettes and loaded design:

1. Press **Save stash** at the top. A file called **skein-stash.json** is downloaded.
2. Next time, open Skein and press **Load stash**, then choose that file.

When you have changes that haven't been saved, you'll see **Unsaved changes** at the top, and the Save button lights up. Your browser will also warn you if you try to leave. Loading a file replaces what's currently on screen.

## Tips

- Add the threads you really have, even a small stash. The more variety you add, the better the matches.
- If many colors say "Loose match", your stash probably doesn't have that hue. Try a different harmony or add a thread.
- Generate a few times with Random base for fresh ideas, or pick a favorite thread to build around.
- Use a mid-gray background if you want to judge colors without a bright or dark surround.
- Save your stash file after every session, and keep a backup copy.

## Troubleshooting

- **"You need at least 2 threads":** add more threads to the current yarn type, or clear some exclusions.
- **Fewer colors than I asked for:** similar shades are grouped together, so a small stash can run out of distinct colors. Add more variety or lower the number of colors.
- **My SVG won't load or doesn't color right:** check that the color areas are named color1, color2, and so on, and that the file is a normal SVG.
- **Save stash doesn't seem to do anything:** make sure the file is opened from your device, not from within an email or website preview, and check your browser's Downloads.
