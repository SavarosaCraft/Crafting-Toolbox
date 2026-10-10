# GIF to Counted Pattern

A small Python script that converts a black-and-white GIF image into a counted pattern, listing consecutive black and white pixels in each row.

## Requirements

- Python 3
- Pillow library

Install Pillow by running:

```
pip install Pillow
```

## How to use

1. Save the script as `gif_to_pattern.py`.
2. Place it in the same folder as your black-and-white GIF image.
3. Rename your GIF to `image.gif`.
4. Run the script:
   ```
   python gif-to-pattern.py
   ```
5. The generated pattern will be saved as `image_pattern.txt` in the same folder.

## Output example

For a row containing three black pixels, two white pixels, and four black pixels, the output will be:

```
1) 3 black - 2 white - 4 black
2) 1 white - 5 black - 3 white
```

Each numbered line represents one row of the original image. Consecutive pixels of the same color are counted and grouped together.

## Notes

- Black and white images: The script works with images containing only black and white pixels.
- Grayscale conversion: Images are converted to grayscale before processing. Pixels darker than the threshold of 128 are counted as black; all other pixels are counted as white.
- Image dimensions: Each pixel corresponds to one unit in the counted pattern. Larger images produce longer patterns.
- GIF animation: The script processes the first frame of an animated GIF.
- Output format: The result is a plain-text file that can be opened in any text editor.