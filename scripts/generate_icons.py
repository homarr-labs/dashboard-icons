from icons import IssueFormType, checkAction, iconFactory, checkType
import os
import sys
import subprocess
from pathlib import Path
import requests
from PIL import Image

# Try to import cairosvg, but make it optional
try:
    import cairosvg
    CAIROSVG_AVAILABLE = True
except (ImportError, OSError, Exception):
    CAIROSVG_AVAILABLE = False
    cairosvg = None

ISSUE_FORM_ENV_VAR = "INPUT_ISSUE_FORM"

ROOT_DIR = Path(__file__).resolve().parent.parent
SVG_DIR = ROOT_DIR / "svg"
PNG_DIR = ROOT_DIR / "png"
WEBP_DIR = ROOT_DIR / "webp"

# Ensure the output folders exist
PNG_DIR.mkdir(parents=True, exist_ok=True)
WEBP_DIR.mkdir(parents=True, exist_ok=True)

def request_image(url: str) -> bytes:
    response = requests.get(url)
    response.raise_for_status()
    return response.content

def save_image(image: bytes, path: Path):
    with open(path, 'wb') as f:
        f.write(image)

def convert_svg_to_png(svg_path: Path, png_path: Path, use_inkscape: bool = True) -> bytes:
    """Convert SVG to PNG using Inkscape or cairosvg."""
    try:
        if use_inkscape:
            # Use Inkscape CLI
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
            
            # Read the PNG file and return as bytes
            with open(png_path, 'rb') as f:
                return f.read()
        else:
            if not CAIROSVG_AVAILABLE:
                raise ImportError("cairosvg is not available. Use Inkscape instead.")
            return cairosvg.svg2png(url=str(svg_path), output_height=512)

    except Exception as e:
        print(f"Failed to convert {svg_path} to PNG: {e}")
        raise e

def save_image_as_webp(image_path: Path, webp_path: Path):
    """Convert an image (PNG or other) to WEBP."""
    try:
        image = Image.open(image_path).convert("RGBA")
        image.save(webp_path, format='WEBP')

    except Exception as e:
        print(f"Failed to convert {image_path} to WEBP: {e}")
        raise e

def main(type: str, action: IssueFormType, issue_form: str):
    icon = iconFactory(type, issue_form, action)
    convertions = icon.convertions()

    for convertion in convertions:
        svg_path = SVG_DIR / f"{convertion.name}.svg"
        png_path = PNG_DIR / f"{convertion.name}.png"
        webp_path = WEBP_DIR / f"{convertion.name}.webp"

        imageBytes = request_image(convertion.source)

        if icon.type == "svg":
            save_image(imageBytes, svg_path)
            print(f"Downloaded SVG: {svg_path}")

            # Use Inkscape by default
            png_data = convert_svg_to_png(svg_path, png_path, use_inkscape=True)
            save_image(png_data, png_path)
            print(f"Converted PNG: {png_path}")

        if icon.type == "png":
            save_image(imageBytes, png_path)
            print(f"Downloaded PNG: {png_path}")
            

        save_image_as_webp(png_path, webp_path)
        print(f"Converted WEBP: {webp_path}")


if (__name__ == "__main__"):
    type = checkType(sys.argv[1])
    action = checkAction(sys.argv[2])
    main(
        type,
        action,
        os.getenv(ISSUE_FORM_ENV_VAR)
    )