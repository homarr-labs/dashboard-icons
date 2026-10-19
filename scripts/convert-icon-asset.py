import sys
from pathlib import Path
from convert_svg_assets import convert_svg_to_png, convert_image_to_webp

source = Path(sys.argv[1])
root = Path(sys.argv[2])
png = root / "png" / (source.stem + ".png")
webp = root / "webp" / (source.stem + ".webp")
png.parent.mkdir(parents=True, exist_ok=True)
webp.parent.mkdir(parents=True, exist_ok=True)
if source.suffix == ".svg" and not convert_svg_to_png(source, png, force=True):
    sys.exit(1)
if not convert_image_to_webp(png, webp, force=True):
    sys.exit(1)
