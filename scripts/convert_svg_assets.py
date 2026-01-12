import os
import re
import hashlib
import subprocess
import argparse
import tempfile
import urllib.request
from pathlib import Path
from PIL import Image

# Try to import cairosvg, but make it optional
# Catch any exception (ImportError, OSError, etc.) since cairosvg may fail
# to load if the cairo library is not available
try:
    import cairosvg
    CAIROSVG_AVAILABLE = True
except (ImportError, OSError, Exception):
    CAIROSVG_AVAILABLE = False
    cairosvg = None

# Define paths
ROOT_DIR = Path(__file__).resolve().parent.parent
SVG_DIR = ROOT_DIR / "svg"
PNG_DIR = ROOT_DIR / "png"
WEBP_DIR = ROOT_DIR / "webp"

# Ensure the output folders exist
PNG_DIR.mkdir(parents=True, exist_ok=True)
WEBP_DIR.mkdir(parents=True, exist_ok=True)

# Track results
failed_files = []
converted_pngs = 0
converted_webps = 0
total_icons = 0
png_only_icons = []  # List to store PNG-only icons

def file_size_readable(size_bytes):
    """Convert bytes to a human-readable format."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.2f} TB"

def hash_file(file_path):
    """Generate an MD5 hash for a file."""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def convert_to_kebab_case(name):
    """Convert a filename to kebab-case."""
    cleaned = re.sub(r'[^a-zA-Z0-9\s-]', '', name)
    kebab_case_name = re.sub(r'[\s_]+', '-', cleaned).lower()
    return kebab_case_name

def rename_if_needed(file_path):
    """Ensure the filename is in kebab-case; rename if necessary."""
    new_name = convert_to_kebab_case(file_path.stem) + file_path.suffix
    new_path = file_path.parent / new_name

    if new_path != file_path:
        if new_path.exists():
            raise FileExistsError(f"File conflict: {new_path} already exists.")
        file_path.rename(new_path)
        print(f"Renamed: {file_path} -> {new_path}")

    return new_path

def needs_conversion(output_file, data=None):
    """Check if a file needs to be converted or overwritten."""
    if output_file.exists():
        if data:
            existing_hash = hash_file(output_file)
            new_hash = hashlib.md5(data).hexdigest()
            return existing_hash != new_hash
        return False
    return True

def convert_svg_to_png(svg_path, png_path, use_inkscape=False):
    """Convert SVG to PNG using cairosvg or Inkscape CLI."""
    global converted_pngs
    try:
        if use_inkscape:
            # For Inkscape, we always convert (Inkscape handles overwriting)
            # We could check hash of SVG vs PNG, but it's simpler to just convert
            result = subprocess.run(
                [
                    'inkscape',
                    '--export-type=png',
                    f'--export-filename={png_path}',
                    '--export-height=512',
                    str(svg_path)
                ],
                capture_output=True,
                text=True,
                check=True
            )
            
            if png_path.exists():
                print(f"Converted PNG (Inkscape): {png_path} ({file_size_readable(png_path.stat().st_size)})")
                converted_pngs += 1
        else:
            if not CAIROSVG_AVAILABLE:
                raise ImportError(
                    "cairosvg is not available. Please install it with 'pip install cairosvg' "
                    "or use --use-inkscape flag to use Inkscape CLI instead."
                )
            
            png_data = cairosvg.svg2png(url=str(svg_path), output_height=512)

            if needs_conversion(png_path, png_data):
                with open(png_path, 'wb') as f:
                    f.write(png_data)
                print(f"Converted PNG: {png_path} ({file_size_readable(png_path.stat().st_size)})")
                converted_pngs += 1
            else:
                print(f"PNG already up-to-date: {png_path}")

    except subprocess.CalledProcessError as e:
        print(f"Failed to convert {svg_path} to PNG using Inkscape: {e.stderr}")
        failed_files.append(svg_path)
    except Exception as e:
        print(f"Failed to convert {svg_path} to PNG: {e}")
        failed_files.append(svg_path)

def convert_image_to_webp(image_path, webp_path):
    """Convert an image (PNG or other) to WEBP."""
    global converted_webps
    try:
        image = Image.open(image_path).convert("RGBA")

        if needs_conversion(webp_path):
            image.save(webp_path, format='WEBP')
            print(f"Converted WEBP: {webp_path} ({file_size_readable(webp_path.stat().st_size)})")
            converted_webps += 1
        else:
            print(f"WEBP already up-to-date: {webp_path}")

    except Exception as e:
        print(f"Failed to convert {image_path} to WEBP: {e}")
        failed_files.append(image_path)

def clean_up_files(folder, valid_basenames):
    """Remove files that no longer have corresponding SVG or PNG files."""
    removed_files = 0
    for file_path in folder.glob('*'):
        if file_path.stem not in valid_basenames:
            file_path.unlink()
            print(f"Removed: {file_path}")
            removed_files += 1
    return removed_files

def download_file(url, output_path):
    """Download a file from URL to the specified path."""
    urllib.request.urlretrieve(url, output_path)
    return output_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert SVG files to PNG and WEBP formats')
    parser.add_argument('--use-inkscape', action='store_true', 
                       help='Use Inkscape CLI instead of cairosvg for SVG to PNG conversion')
    parser.add_argument('file', nargs='?', 
                       help='Optional: Path to a single SVG file or URL to process')
    args = parser.parse_args()

    use_inkscape = args.use_inkscape
    single_file = args.file

    # Check if Inkscape is available when --use-inkscape is specified
    if use_inkscape:
        try:
            subprocess.run(['inkscape', '--version'], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("Error: Inkscape is not available. Please install Inkscape or use the default cairosvg method.")
            print("On macOS, install with: brew install inkscape")
            exit(1)
    
    # Warn if cairosvg is not available and not using Inkscape
    if not use_inkscape and not CAIROSVG_AVAILABLE:
        print("Warning: cairosvg is not available. Use --use-inkscape to use Inkscape CLI instead.")
        print("Or install cairosvg dependencies. On macOS: brew install cairo")
        exit(1)

    # Track valid basenames (from SVG and PNG files)
    valid_basenames = set()

    # If a single file is provided, process only that file
    if single_file:
        temp_file = None
        try:
            # Check if it's a URL
            if single_file.startswith('http://') or single_file.startswith('https://'):
                # Download to temp file first
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.svg')
                temp_file.close()
                download_file(single_file, temp_file.name)
                svg_file = Path(temp_file.name)
            else:
                svg_file = Path(single_file)
                if not svg_file.exists():
                    print(f"Error: File not found: {svg_file}")
                    exit(1)

            # Determine output name from URL or file
            if single_file.startswith('http://') or single_file.startswith('https://'):
                # Extract name from URL
                from urllib.parse import urlparse
                parsed_url = urlparse(single_file)
                url_path = parsed_url.path
                # Get filename from path, handling query params
                url_name = Path(url_path).stem
                if not url_name or url_name == '/':
                    # Fallback: use a hash or timestamp
                    url_name = hashlib.md5(single_file.encode()).hexdigest()[:8]
                output_name = convert_to_kebab_case(url_name)
            else:
                output_name = convert_to_kebab_case(svg_file.stem)

            # Copy to SVG_DIR if it's a temp file or external file
            if temp_file or not svg_file.parent.samefile(SVG_DIR):
                target_svg = SVG_DIR / f"{output_name}.svg"
                if temp_file:
                    import shutil
                    shutil.move(str(svg_file), str(target_svg))
                else:
                    import shutil
                    shutil.copy2(str(svg_file), str(target_svg))
                svg_file = target_svg

            # Ensure the filename is in kebab-case
            try:
                svg_path = rename_if_needed(svg_file)
            except Exception as e:
                print(f"Error renaming {svg_file}: {e}")
                failed_files.append(svg_file)
                exit(1)

            valid_basenames.add(svg_path.stem)
            total_icons = 1

            # Set paths for PNG and WEBP
            png_path = PNG_DIR / f"{svg_path.stem}.png"
            webp_path = WEBP_DIR / f"{svg_path.stem}.webp"

            # Convert SVG to PNG
            convert_svg_to_png(svg_path, png_path, use_inkscape)

            # Convert PNG to WEBP
            if png_path.exists():
                convert_image_to_webp(png_path, webp_path)

            # Clean up temp file if it exists
            if temp_file and Path(temp_file.name).exists():
                Path(temp_file.name).unlink()

            # Display summary for single file
            print(f"\nConverted {converted_pngs} PNG and {converted_webps} WEBP from 1 file.")
            if failed_files:
                print("\nThe following files failed to convert:")
                for file in failed_files:
                    print(file)
            exit(0)

        except Exception as e:
            print(f"Error processing file: {e}")
            if temp_file and Path(temp_file.name).exists():
                Path(temp_file.name).unlink()
            exit(1)
    else:
        # Process all SVG files
        for svg_file in SVG_DIR.glob("*.svg"):
            total_icons += 1

            # Ensure the filename is in kebab-case
            try:
                svg_path = rename_if_needed(svg_file)
            except Exception as e:
                print(f"Error renaming {svg_file}: {e}")
                failed_files.append(svg_file)
                continue

            valid_basenames.add(svg_path.stem)

            # Set paths for PNG and WEBP
            png_path = PNG_DIR / f"{svg_path.stem}.png"
            webp_path = WEBP_DIR / f"{svg_path.stem}.webp"

            # Convert SVG to PNG
            convert_svg_to_png(svg_path, png_path, use_inkscape)

            # Convert PNG to WEBP
            if png_path.exists():
                convert_image_to_webp(png_path, webp_path)

    # Process PNG-only files
    for png_file in PNG_DIR.glob("*.png"):
        if png_file.stem not in valid_basenames:
            # Ensure the filename is in kebab-case
            try:
                png_path = rename_if_needed(png_file)
            except Exception as e:
                print(f"Error renaming {png_file}: {e}")
                failed_files.append(png_file)
                continue

            valid_basenames.add(png_path.stem)

            # Add the PNG-only icon to the list
            png_only_icons.append(png_path.stem)

            # Set path for WEBP
            webp_path = WEBP_DIR / f"{png_path.stem}.webp"

            # Convert PNG to WEBP
            convert_image_to_webp(png_path, webp_path)

    # Clean up unused files in PNG and WEBP directories
    removed_pngs = clean_up_files(PNG_DIR, valid_basenames.union({p.stem for p in SVG_DIR.glob("*.svg")}))
    removed_webps = clean_up_files(WEBP_DIR, valid_basenames)

    # Display summary
    if converted_pngs == 0 and converted_webps == 0 and removed_pngs == 0 and removed_webps == 0:
        print("\nAll icons are already up-to-date.")
    else:
        print(f"\nConverted {converted_pngs} PNGs and {converted_webps} WEBPs out of {total_icons} icons.")
        print(f"Removed {removed_pngs} PNGs and {removed_webps} WEBPs.")

    # Display any failed conversions
    if failed_files:
        print("\nThe following files failed to convert:")
        for file in failed_files:
            print(file)

    # Output PNG-only icons
    if png_only_icons:
        print("\nPNG-only icons (no SVG available):")
        for icon in png_only_icons:
            print(f"- {icon}")
    else:
        print("\nNo PNG-only icons found.")