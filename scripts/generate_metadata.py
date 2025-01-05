from pathlib import Path
import json

ROOT_DIR = Path(__file__).resolve().parent.parent
META_DIR = ROOT_DIR / "meta"

# Ensure the output folders exist
META_DIR.mkdir(parents=True, exist_ok=True)

def get_icon_names():
    return [path.stem for path in META_DIR.glob("*.json")]

def read_meta_for(icon_name):
    meta_file = META_DIR / f"{icon_name}.json"
    if meta_file.exists():
        with open(meta_file, 'r', encoding='UTF-8') as f:
            return json.load(f)
    return None

def generate_meta_json():
    icon_names = get_icon_names()
    fullMeta = dict()
    for icon_name in icon_names:
        meta = read_meta_for(icon_name)
        if meta is None:
            print(f"Missing metadata for {icon_name}")
            continue
        fullMeta[icon_name] = meta
    with open(ROOT_DIR / "metadata.json", 'w', encoding='UTF-8') as f:
        json.dump(fullMeta, f, indent=4)
        
if (__name__ == "__main__"):
    generate_meta_json()