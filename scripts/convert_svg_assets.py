import os
import re
import hashlib
import subprocess
import argparse
import tempfile
import urllib.request
from pathlib import Path
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
import xml.etree.ElementTree as ET

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

# Test/placeholder files to exclude from processing and cleanup
EXCLUDED_FILES = {'icon'}  # Add test file names here

# Track results (thread-safe)
failed_files = []
converted_pngs = 0
converted_webps = 0
total_icons = 0
png_only_icons = []  # List to store PNG-only icons
stats_lock = Lock()  # Lock for thread-safe counter updates

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

def resolve_css_variables(svg_content):
    """Replace CSS variables (var(--name, fallback)) with their fallback values."""
    # Pattern to match var(--variable-name, fallback-value)
    # This handles: var(--name, value) and extracts the fallback value
    var_pattern = r'var\(--[^,)]+,\s*([^)]+)\)'
    
    def replace_var(match):
        # Extract the fallback value (everything after the comma, before closing paren)
        fallback = match.group(1).strip()
        # Remove quotes if present
        fallback = fallback.strip('"\'')
        return fallback
    
    # Replace all var() calls with their fallback values
    # re.sub replaces all occurrences globally
    resolved = re.sub(var_pattern, replace_var, svg_content)
    return resolved

def preprocess_svg_for_inkscape(svg_path):
    """Preprocess SVG to resolve CSS variables for Inkscape compatibility."""
    try:
        with open(svg_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()
        
        # Check if SVG contains CSS variables
        if 'var(' in svg_content:
            # Resolve CSS variables
            processed_content = resolve_css_variables(svg_content)
            
            # Create a temporary file with processed SVG
            temp_svg = tempfile.NamedTemporaryFile(mode='w', suffix='.svg', delete=False, encoding='utf-8')
            temp_svg.write(processed_content)
            temp_svg.close()
            
            return Path(temp_svg.name)
        
        # No CSS variables, return original path
        return svg_path
    except Exception as e:
        print(f"Warning: Failed to preprocess SVG {svg_path}: {e}")
        return svg_path

def needs_conversion(svg_path, output_file, use_inkscape=False, force=False):
    """Check if a file needs to be converted or overwritten."""
    if force:
        return True
    
    if not output_file.exists():
        return True
    
    if use_inkscape:
        # For Inkscape, compare modification times
        # If SVG is newer than PNG, it needs conversion
        try:
            svg_mtime = svg_path.stat().st_mtime
            png_mtime = output_file.stat().st_mtime
            return svg_mtime > png_mtime
        except (OSError, FileNotFoundError):
            return True
    else:
        # For cairosvg, we'll check hash after generating data
        return True

def convert_svg_to_png(svg_path, png_path, use_inkscape=False, force=False):
    """Convert SVG to PNG using cairosvg or Inkscape CLI."""
    global converted_pngs
    
    # Skip if not needed and not forced
    if not force and not needs_conversion(svg_path, png_path, use_inkscape, force):
        return True
    
    try:
        if use_inkscape:
            # Preprocess SVG to resolve CSS variables
            processed_svg = preprocess_svg_for_inkscape(svg_path)
            temp_svg_created = processed_svg != svg_path
            
            try:
                result = subprocess.run(
                    [
                        'inkscape',
                        '--export-type=png',
                        f'--export-filename={png_path}',
                        '--export-height=512',
                        str(processed_svg)
                    ],
                    capture_output=True,
                    text=True,
                    check=True
                )
                
                if png_path.exists():
                    with stats_lock:
                        converted_pngs += 1
                    print(f"Converted PNG (Inkscape): {png_path.name} ({file_size_readable(png_path.stat().st_size)})")
            finally:
                # Clean up temporary SVG file if created
                if temp_svg_created and processed_svg.exists():
                    processed_svg.unlink()
        else:
            if not CAIROSVG_AVAILABLE:
                raise ImportError(
                    "cairosvg is not available. Please install it with 'pip install cairosvg' "
                    "or use --use-inkscape flag to use Inkscape CLI instead."
                )
            
            png_data = cairosvg.svg2png(url=str(svg_path), output_height=512)

            if force or needs_conversion(svg_path, png_path, use_inkscape, force):
                with open(png_path, 'wb') as f:
                    f.write(png_data)
                with stats_lock:
                    converted_pngs += 1
                print(f"Converted PNG: {png_path.name} ({file_size_readable(png_path.stat().st_size)})")
            else:
                print(f"PNG already up-to-date: {png_path.name}")
        return True

    except subprocess.CalledProcessError as e:
        print(f"Failed to convert {svg_path} to PNG using Inkscape: {e.stderr}")
        with stats_lock:
            failed_files.append(svg_path)
        return False
    except Exception as e:
        print(f"Failed to convert {svg_path} to PNG: {e}")
        with stats_lock:
            failed_files.append(svg_path)
        return False

def convert_image_to_webp(image_path, webp_path, force=False):
    """Convert an image (PNG or other) to WEBP."""
    global converted_webps
    
    # Skip if not needed and not forced
    if not force and webp_path.exists():
        try:
            # Check if PNG is newer than WEBP
            png_mtime = image_path.stat().st_mtime
            webp_mtime = webp_path.stat().st_mtime
            if png_mtime <= webp_mtime:
                return True
        except (OSError, FileNotFoundError):
            pass
    
    try:
        image = Image.open(image_path).convert("RGBA")
        image.save(webp_path, format='WEBP')
        with stats_lock:
            converted_webps += 1
        print(f"Converted WEBP: {webp_path.name} ({file_size_readable(webp_path.stat().st_size)})")
        return True

    except Exception as e:
        print(f"Failed to convert {image_path} to WEBP: {e}")
        with stats_lock:
            failed_files.append(image_path)
        return False

def clean_up_files(folder, valid_basenames):
    """Remove files that no longer have corresponding SVG or PNG files, and excluded test files."""
    removed_files = 0
    for file_path in folder.glob('*'):
        # Remove excluded test files and files without corresponding sources
        if file_path.stem in EXCLUDED_FILES or file_path.stem not in valid_basenames:
            file_path.unlink()
            print(f"Removed: {file_path}")
            removed_files += 1
    return removed_files

def download_file(url, output_path):
    """Download a file from URL to the specified path."""
    urllib.request.urlretrieve(url, output_path)
    return output_path

def process_single_icon(svg_path, png_path, webp_path, use_inkscape, force, icon_name=None):
    """Process a single icon: convert SVG to PNG and PNG to WEBP."""
    icon_name = icon_name or svg_path.stem
    
    # Convert SVG to PNG
    png_success = convert_svg_to_png(svg_path, png_path, use_inkscape, force)
    
    # Convert PNG to WEBP if PNG conversion succeeded
    if png_success and png_path.exists():
        convert_image_to_webp(png_path, webp_path, force)
    
    return png_success

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert SVG files to PNG and WEBP formats')
    parser.add_argument('--use-inkscape', action='store_true', 
                       help='Use Inkscape CLI instead of cairosvg for SVG to PNG conversion')
    parser.add_argument('--force-retry', type=str, metavar='ICON_NAME',
                       help='Force retry conversion for a specific icon by name (without extension)')
    parser.add_argument('--threads', type=int, default=4,
                       help='Number of parallel threads to use (default: 4)')
    parser.add_argument('file', nargs='?', 
                       help='Optional: Path to a single SVG file or URL to process')
    args = parser.parse_args()

    use_inkscape = args.use_inkscape
    single_file = args.file
    force_retry_icon = args.force_retry
    num_threads = args.threads

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

            # Check if this is the icon to force retry
            force = force_retry_icon and (force_retry_icon.lower() == svg_path.stem.lower())

            # Convert SVG to PNG
            convert_svg_to_png(svg_path, png_path, use_inkscape, force)

            # Convert PNG to WEBP
            if png_path.exists():
                convert_image_to_webp(png_path, webp_path, force)

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
        # Collect all SVG files first for faster startup
        print("Scanning SVG files...")
        svg_files = [f for f in SVG_DIR.glob("*.svg") if f.stem not in EXCLUDED_FILES]
        total_icons = len(svg_files)
        print(f"Found {total_icons} SVG files to process")
        
        # Prepare tasks
        tasks = []
        for svg_file in svg_files:
            # Ensure the filename is in kebab-case
            try:
                svg_path = rename_if_needed(svg_file)
            except Exception as e:
                print(f"Error renaming {svg_file}: {e}")
                with stats_lock:
                    failed_files.append(svg_file)
                continue

            valid_basenames.add(svg_path.stem)

            # Set paths for PNG and WEBP
            png_path = PNG_DIR / f"{svg_path.stem}.png"
            webp_path = WEBP_DIR / f"{svg_path.stem}.webp"
            
            # Check if this is the icon to force retry
            force = force_retry_icon and (force_retry_icon.lower() == svg_path.stem.lower())
            
            tasks.append((svg_path, png_path, webp_path, force))
        
        # Process in parallel
        print(f"Processing with {num_threads} threads...")
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = {
                executor.submit(process_single_icon, svg_path, png_path, webp_path, use_inkscape, force, svg_path.stem): 
                (svg_path, png_path, webp_path) 
                for svg_path, png_path, webp_path, force in tasks
            }
            
            # Wait for all tasks to complete
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as e:
                    svg_path, png_path, webp_path = futures[future]
                    print(f"Error processing {svg_path}: {e}")
                    with stats_lock:
                        failed_files.append(svg_path)

    # Process PNG-only files
    png_only_tasks = []
    for png_file in PNG_DIR.glob("*.png"):
        if png_file.stem not in valid_basenames:
            # Ensure the filename is in kebab-case
            try:
                png_path = rename_if_needed(png_file)
            except Exception as e:
                print(f"Error renaming {png_file}: {e}")
                with stats_lock:
                    failed_files.append(png_file)
                continue

            valid_basenames.add(png_path.stem)

            # Add the PNG-only icon to the list
            with stats_lock:
                png_only_icons.append(png_path.stem)

            # Set path for WEBP
            webp_path = WEBP_DIR / f"{png_path.stem}.webp"
            
            # Check if this is the icon to force retry
            force = force_retry_icon and (force_retry_icon.lower() == png_path.stem.lower())
            
            png_only_tasks.append((png_path, webp_path, force))
    
    # Process PNG-only files in parallel
    if png_only_tasks:
        print(f"Processing {len(png_only_tasks)} PNG-only files...")
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = {
                executor.submit(convert_image_to_webp, png_path, webp_path, force): 
                (png_path, webp_path) 
                for png_path, webp_path, force in png_only_tasks
            }
            
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as e:
                    png_path, webp_path = futures[future]
                    print(f"Error processing PNG-only {png_path}: {e}")
                    with stats_lock:
                        failed_files.append(png_path)

    # Clean up unused files in PNG and WEBP directories
    # Include all SVG stems (except excluded) in valid basenames for cleanup
    all_svg_stems = {p.stem for p in SVG_DIR.glob("*.svg") if p.stem not in EXCLUDED_FILES}
    removed_pngs = clean_up_files(PNG_DIR, valid_basenames.union(all_svg_stems))
    removed_webps = clean_up_files(WEBP_DIR, valid_basenames.union(all_svg_stems))

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