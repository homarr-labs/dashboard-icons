import json


def load_metadata(icon_name: str) -> dict:
    try:
        with open(f"meta/{icon_name}.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
            raise ValueError(f"Icon '{icon_name}' does not exist")
