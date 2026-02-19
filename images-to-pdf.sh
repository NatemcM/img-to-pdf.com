#!/usr/bin/env bash
set -euo pipefail

# Combine images in a directory into an email-friendly PDF using ImageMagick.

read -rp "Directory containing images: " img_dir

# Validate directory
if [[ ! -d "$img_dir" ]]; then
    echo "Error: '$img_dir' is not a valid directory." >&2
    exit 1
fi

read -rp "Output PDF name (without .pdf): " pdf_name

output_path="${img_dir%/}/${pdf_name}.pdf"

# Collect image files (common formats), sorted by filename
shopt -s nullglob nocaseglob
images_unsorted=("$img_dir"/*.{jpg,jpeg,png,tiff,tif,bmp,gif,webp})
shopt -u nullglob nocaseglob

# Sort all images by filename regardless of extension
images=()
while IFS= read -r f; do images+=("$f"); done < <(printf '%s\n' "${images_unsorted[@]}" | sort -f)

if [[ ${#images[@]} -eq 0 ]]; then
    echo "Error: No image files found in '$img_dir'." >&2
    exit 1
fi

echo "Found ${#images[@]} image(s). Converting to PDF..."

# Resize images so the longest side is at most 1600px, apply JPEG compression
# at quality 80, and strip metadata. This keeps a typical multi-page PDF well
# under 10 MB for emailing.
magick "${images[@]}" \
    -resize '1600x1600>' \
    -strip \
    -quality 80 \
    -units PixelsPerInch \
    -density 150 \
    "$output_path"

file_size=$(du -h "$output_path" | cut -f1)
echo "Created: $output_path ($file_size)"
