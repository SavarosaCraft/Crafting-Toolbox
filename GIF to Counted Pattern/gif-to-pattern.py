from PIL import Image

def gif_to_pattern_with_colors(gif_path, output_file='pattern.txt'):
    img = Image.open(gif_path).convert('L')
    width, height = img.size
    
    with open(output_file, 'w') as f:
        for y in range(height):
            segments = []
            current_pixel = None
            count = 0
            
            for x in range(width):
                pixel = 1 if img.getpixel((x, y)) < 128 else 0  # 1=black, 0=white
                
                if pixel == current_pixel:
                    count += 1
                else:
                    if current_pixel is not None:
                        color = "black" if current_pixel == 1 else "white"
                        segments.append(f"{count} {color}")
                    current_pixel = pixel
                    count = 1
            
            # Add the last segment
            if current_pixel is not None:
                color = "black" if current_pixel == 1 else "white"
                segments.append(f"{count} {color}")
            
            # Write to file instead of printing
            f.write(f"{y+1}) " + " - ".join(segments) + "\n")
    
    print(f"Pattern saved to {output_file}")

# Usage
gif_to_pattern_with_colors('image.gif', 'image_pattern.txt')