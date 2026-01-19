import os
import re
import hashlib
import subprocess
import argparse
import tempfile
import urllib.request
import json
from pathlib import Path
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
import xml.etree.ElementTree as ET

# Inkscape is now the default and only method for SVG conversion

# Define paths
ROOT_DIR = Path(__file__).resolve().parent.parent
SVG_DIR = ROOT_DIR / "svg"
PNG_DIR = ROOT_DIR / "png"
WEBP_DIR = ROOT_DIR / "webp"
METADATA_FILE = ROOT_DIR / "metadata.json"

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
    """Preprocess SVG to resolve CSS variables and fix dimension issues for Inkscape compatibility."""
    try:
        with open(svg_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()
        
        needs_processing = False
        processed_content = svg_content
        
        # Check if SVG contains CSS variables
        if 'var(' in svg_content:
            # Resolve CSS variables
            processed_content = resolve_css_variables(processed_content)
            needs_processing = True
        
        # Fix relative units (1em, etc.) - replace with viewBox-based dimensions or remove
        # Extract viewBox if present
        viewbox_match = re.search(r'viewBox=["\']([^"\']+)["\']', processed_content)
        if viewbox_match:
            viewbox_values = viewbox_match.group(1).split()
            if len(viewbox_values) >= 4:
                width = viewbox_values[2]
                height = viewbox_values[3]
                
                # Replace relative units in width/height attributes
                # Pattern: width="1em" or width='1em' or width="100%" etc.
                width_pattern = r'width=["\']([^"\']*em[^"\']*|100%)["\']'
                height_pattern = r'height=["\']([^"\']*em[^"\']*|100%)["\']'
                
                if re.search(width_pattern, processed_content, re.IGNORECASE):
                    processed_content = re.sub(width_pattern, f'width="{width}"', processed_content, flags=re.IGNORECASE)
                    needs_processing = True
                
                if re.search(height_pattern, processed_content, re.IGNORECASE):
                    processed_content = re.sub(height_pattern, f'height="{height}"', processed_content, flags=re.IGNORECASE)
                    needs_processing = True
        
        # Remove problematic CSS properties that Inkscape doesn't understand
        # Remove flex, line-height, etc. from style attributes
        style_pattern = r'style=["\']([^"\']*)["\']'
        def clean_style(match):
            style_content = match.group(1)
            # Remove flex, line-height, and other problematic properties
            cleaned = re.sub(r'flex[^:;]*:[^;]+;?', '', style_content)
            cleaned = re.sub(r'line-height[^:;]*:[^;]+;?', '', cleaned)
            cleaned = re.sub(r';\s*;+', ';', cleaned)  # Remove double semicolons
            cleaned = cleaned.strip('; ')
            if cleaned:
                return f'style="{cleaned}"'
            return ''  # Remove style attribute if empty
        
        if re.search(style_pattern, processed_content):
            processed_content = re.sub(style_pattern, clean_style, processed_content)
            needs_processing = True
        
        # Create a temporary file with processed SVG if needed
        if needs_processing:
            temp_svg = tempfile.NamedTemporaryFile(mode='w', suffix='.svg', delete=False, encoding='utf-8')
            temp_svg.write(processed_content)
            temp_svg.close()
            return Path(temp_svg.name)
        
        # No processing needed, return original path
        return svg_path
    except Exception as e:
        print(f"Warning: Failed to preprocess SVG {svg_path}: {e}")
        return svg_path

def needs_conversion(svg_path, output_file, use_inkscape=True, force=False):
    """Check if a file needs to be converted or overwritten."""
    if force:
        return True
    
    if not output_file.exists():
        return True

    # Compare modification times - if SVG is newer than PNG, it needs conversion
    try:
        svg_mtime = svg_path.stat().st_mtime
        png_mtime = output_file.stat().st_mtime
        return svg_mtime > png_mtime
    except (OSError, FileNotFoundError):
        return True

def convert_svg_to_png(svg_path, png_path, use_inkscape=True, force=False):
    """Convert SVG to PNG using Inkscape CLI."""
    global converted_pngs
    
    # Skip if not needed and not forced
    if not force and not needs_conversion(svg_path, png_path, use_inkscape, force):
        return True
    
    try:
        # Preprocess SVG to resolve CSS variables and fix dimension issues
        processed_svg = preprocess_svg_for_inkscape(svg_path)
        temp_svg_created = processed_svg != svg_path
        
        try:
            result = subprocess.run(
                [
                    'inkscape',
                    '--export-type=png',
                    f'--export-filename={png_path}',
                    '--export-height=512',
                    '--export-background-opacity=0',  # Transparent background
                    str(processed_svg)
                ],
                capture_output=True,
                text=True,
                check=True
            )
            
            if png_path.exists():
                file_size = png_path.stat().st_size
                with stats_lock:
                    converted_pngs += 1
                print(f"Converted PNG: {png_path.name} ({file_size_readable(file_size)})")
                if file_size < 5000:
                    print(f"  ⚠ Warning: PNG is very small ({file_size} bytes), might be transparent")
        finally:
            # Clean up temporary SVG file if created
            if temp_svg_created and processed_svg.exists():
                processed_svg.unlink()
        
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

def load_metadata():
    """Load metadata.json and return a dictionary of icon data."""
    try:
        if METADATA_FILE.exists():
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load metadata.json: {e}")
    return {}

def get_all_icon_variants(metadata):
    """Extract all variant names for each icon from metadata."""
    variants_by_icon = {}
    
    for icon_name, icon_data in metadata.items():
        if icon_name in EXCLUDED_FILES:
            continue
            
        variants = [icon_name]  # Always include base icon name
        
        # Add color variants
        if 'colors' in icon_data:
            if 'light' in icon_data['colors']:
                variants.append(icon_data['colors']['light'])
            if 'dark' in icon_data['colors']:
                variants.append(icon_data['colors']['dark'])
        
        # Add wordmark variants
        if 'wordmark' in icon_data:
            if 'light' in icon_data['wordmark']:
                variants.append(icon_data['wordmark']['light'])
            if 'dark' in icon_data['wordmark']:
                variants.append(icon_data['wordmark']['dark'])
        
        variants_by_icon[icon_name] = variants
    
    return variants_by_icon

def get_all_variant_names(metadata):
    """Get a set of all variant names (base + all variants) from metadata."""
    all_names = set()
    
    for icon_name, icon_data in metadata.items():
        if icon_name in EXCLUDED_FILES:
            continue
            
        all_names.add(icon_name)  # Base icon
        
        # Add color variants
        if 'colors' in icon_data and isinstance(icon_data['colors'], dict):
            if 'light' in icon_data['colors']:
                all_names.add(icon_data['colors']['light'])
            if 'dark' in icon_data['colors']:
                all_names.add(icon_data['colors']['dark'])
        
        # Add wordmark variants
        if 'wordmark' in icon_data and isinstance(icon_data['wordmark'], dict):
            if 'light' in icon_data['wordmark']:
                all_names.add(icon_data['wordmark']['light'])
            if 'dark' in icon_data['wordmark']:
                all_names.add(icon_data['wordmark']['dark'])
    
    return all_names

def outputs_exist_and_valid(png_path, webp_path):
    """Check if both PNG and WEBP outputs exist and are non-empty.
    
    Note: We don't check modification times because in CI environments (GitHub Actions),
    git checkout resets all file mtimes to the checkout time, making SVG files appear
    newer than existing outputs even when they haven't changed.
    """
    if not png_path.exists() or not webp_path.exists():
        return False
    
    try:
        # Check that files exist and have non-zero size
        png_size = png_path.stat().st_size
        webp_size = webp_path.stat().st_size
        return png_size > 0 and webp_size > 0
    except (OSError, FileNotFoundError):
        return False

def process_single_icon(svg_path, png_path, webp_path, force, icon_name=None):
    """Process a single icon: convert SVG to PNG and PNG to WEBP."""
    icon_name = icon_name or svg_path.stem
    
    # Convert SVG to PNG using Inkscape
    png_success = convert_svg_to_png(svg_path, png_path, use_inkscape=True, force=force)
    
    # Convert PNG to WEBP if PNG conversion succeeded
    if png_success and png_path.exists():
        convert_image_to_webp(png_path, webp_path, force)
    
    return png_success

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert SVG files to PNG and WEBP formats using Inkscape')
    parser.add_argument('--force-retry', type=str, metavar='ICON_NAME',
                       help='Force retry conversion for a specific icon by name (without extension)')
    parser.add_argument('--threads', type=int, default=4,
                       help='Number of parallel threads to use (default: 4)')
    parser.add_argument('file', nargs='?', 
                       help='Optional: Path to a single SVG file or URL to process')
    args = parser.parse_args()

    # Inkscape is now the default and only method
    use_inkscape = True
    single_file = args.file
    force_retry_icon = args.force_retry
    num_threads = args.threads
    
    # If force-retry is specified, get all variants for that icon from metadata
    force_retry_variants = set()
    if force_retry_icon:
        metadata = load_metadata()
        if metadata and force_retry_icon in metadata:
            icon_data = metadata[force_retry_icon]
            force_retry_variants.add(force_retry_icon)  # Base icon
            
            # Add color variants
            if 'colors' in icon_data and isinstance(icon_data['colors'], dict):
                if 'light' in icon_data['colors']:
                    force_retry_variants.add(icon_data['colors']['light'])
                if 'dark' in icon_data['colors']:
                    force_retry_variants.add(icon_data['colors']['dark'])
            
            # Add wordmark variants
            if 'wordmark' in icon_data and isinstance(icon_data['wordmark'], dict):
                if 'light' in icon_data['wordmark']:
                    force_retry_variants.add(icon_data['wordmark']['light'])
                if 'dark' in icon_data['wordmark']:
                    force_retry_variants.add(icon_data['wordmark']['dark'])
            
            print(f"Force retry enabled for icon '{force_retry_icon}' and its {len(force_retry_variants) - 1} variants: {', '.join(sorted(force_retry_variants))}")
        else:
            # If not found in metadata, just use the exact name
            force_retry_variants.add(force_retry_icon.lower())
            print(f"Force retry enabled for '{force_retry_icon}' (not found in metadata, using exact match)")

    # Check if Inkscape is available (required)
    try:
        subprocess.run(['inkscape', '--version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: Inkscape is required but not available.")
        print("On macOS, install with: brew install inkscape")
        print("On Ubuntu/Debian, install with: sudo apt-get install -y inkscape")
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

            # Check if this is the icon to force retry (or any of its variants)
            force = force_retry_icon and (svg_path.stem.lower() in {v.lower() for v in force_retry_variants})

            # Convert SVG to PNG
            convert_svg_to_png(svg_path, png_path, use_inkscape=True, force=force)

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
        # Load metadata to get all icon variants
        print("Loading metadata...")
        metadata = load_metadata()
        
        if metadata:
            all_variant_names = get_all_variant_names(metadata)
            print(f"Found {len(all_variant_names)} icon variants in metadata")
        else:
            print("Warning: metadata.json not found, processing all SVG files")
            all_variant_names = None
        
        # Collect all SVG files
        print("Scanning SVG files...")
        all_svg_files = {f.stem: f for f in SVG_DIR.glob("*.svg") if f.stem not in EXCLUDED_FILES}
        
        # Process variants from metadata if available, otherwise process all SVGs
        if all_variant_names:
            variant_svgs = {}
            for variant_name in all_variant_names:
                if variant_name in all_svg_files:
                    variant_svgs[variant_name] = all_svg_files[variant_name]
                else:
                    # Variant listed in metadata but SVG doesn't exist - skip silently
                    pass
        else:
            # Fallback: process all SVG files
            variant_svgs = all_svg_files
        
        # If force-retry is specified, ONLY process those specific icons
        if force_retry_icon and force_retry_variants:
            filtered_svgs = {}
            for variant_name in force_retry_variants:
                if variant_name in variant_svgs:
                    filtered_svgs[variant_name] = variant_svgs[variant_name]
                elif variant_name.lower() in {k.lower(): k for k in variant_svgs}:
                    # Case-insensitive match
                    for k, v in variant_svgs.items():
                        if k.lower() == variant_name.lower():
                            filtered_svgs[k] = v
                            break
            
            if not filtered_svgs:
                print(f"Warning: No SVG files found for '{force_retry_icon}' or its variants")
                print(f"Searched for: {', '.join(sorted(force_retry_variants))}")
            else:
                variant_svgs = filtered_svgs
                print(f"Processing only {len(variant_svgs)} files for '{force_retry_icon}': {', '.join(sorted(variant_svgs.keys()))}")
        
        total_icons = len(variant_svgs)
        print(f"Processing {total_icons} icon variants")
        
        # Prepare tasks
        tasks = []
        skipped_count = 0
        for variant_name, svg_file in variant_svgs.items():
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

            # Check if this is the icon to force retry (or any of its variants)
            force = force_retry_icon and (svg_path.stem.lower() in {v.lower() for v in force_retry_variants})
            
            # Skip early if outputs already exist and are valid (unless forced)
            if not force and outputs_exist_and_valid(png_path, webp_path):
                skipped_count += 1
                continue
            
            tasks.append((svg_path, png_path, webp_path, force))
        
        if skipped_count > 0:
            print(f"Skipped {skipped_count} icons (PNG and WEBP already exist)")

        # Process in parallel
        if tasks:
            print(f"Processing {len(tasks)} icons with {num_threads} threads...")
        else:
            print("No icons need processing.")
        
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = {
                executor.submit(process_single_icon, svg_path, png_path, webp_path, force, svg_path.stem): 
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

    # Process PNG-only files (skip if force-retry is specified for a different icon)
    png_only_tasks = []
    png_only_skipped = 0
    for png_file in PNG_DIR.glob("*.png"):
        if png_file.stem not in valid_basenames:
            # If force-retry is specified, skip PNG-only files not in the variants list
            if force_retry_icon and force_retry_variants:
                if png_file.stem.lower() not in {v.lower() for v in force_retry_variants}:
                    continue
            
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

            # Check if this is the icon to force retry (or any of its variants)
            force = force_retry_icon and (png_path.stem.lower() in {v.lower() for v in force_retry_variants})
            
            # Skip early if WEBP already exists and is up-to-date (unless forced)
            if not force and webp_path.exists():
                try:
                    png_mtime = png_path.stat().st_mtime
                    webp_mtime = webp_path.stat().st_mtime
                    if png_mtime <= webp_mtime:
                        png_only_skipped += 1
                        continue
                except (OSError, FileNotFoundError):
                    pass
            
            png_only_tasks.append((png_path, webp_path, force))
    
    if png_only_skipped > 0:
        print(f"Skipped {png_only_skipped} PNG-only files (WEBP already exists and up-to-date)")
    
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
    # Skip cleanup when force-retry is specified (we're only targeting specific icons)
    removed_pngs = 0
    removed_webps = 0
    if not force_retry_icon:
        # Use metadata variants for cleanup if available
        metadata = load_metadata()
        if metadata:
            all_variant_names = get_all_variant_names(metadata)
            # Include all variant names from metadata in valid basenames
            valid_basenames = valid_basenames.union(all_variant_names)
        else:
            # Fallback: use all SVG stems if metadata not available
            all_svg_stems = {p.stem for p in SVG_DIR.glob("*.svg") if p.stem not in EXCLUDED_FILES}
            valid_basenames = valid_basenames.union(all_svg_stems)
        
        removed_pngs = clean_up_files(PNG_DIR, valid_basenames)
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