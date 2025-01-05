import re
from common import convert_to_kebab_case
from datetime import datetime
import json

class IconConvertion:
    def __init__(self, name: str, source: str):
        self.name = name
        self.source = source

class Icon:
    def __init__(self, input: dict):
        self.name = convert_to_kebab_case(mapFromRequired(input, "Icon name"))
        self.type = mapFileTypeFrom(input, "Icon type")
        self.categories = mapListFrom(input, "Categories")
        self.aliases = mapListFrom(input, "Aliases")

    def to_metadata(self, author: dict) -> dict:
        return {
            "base": self.type,
            "aliases": self.aliases,
            "categories": self.categories,
            "update": {
                "timestamp": datetime.now().isoformat(),
                "author": author
            }
        }
    
    def convertions(self) -> list[IconConvertion]:
        raise NotImplementedError("Method 'files' must be implemented in subclass")
    

class NormalIcon(Icon):
    def __init__(self, input: dict):
        super().__init__(input)
        self.icon = mapUrlFromMarkdownImage(input, "Paste icon")

    def convertions(self) -> list[IconConvertion]:
        return [
            IconConvertion(self.name, self.icon)
        ]

class MonochromeIcon(Icon):
    def __init__(self, input: dict):
        super().__init__(input)
        self.lightIcon = mapUrlFromMarkdownImage(input, "Paste light mode icon")
        self.darkIcon = mapUrlFromMarkdownImage(input, "Paste dark mode icon")
    
    def to_colors(self) -> dict:
        return {
            "light": self.name,
            "dark": f"{self.name}-dark"
        }

    def to_metadata(self, author: dict) -> dict:
        metadata = super().to_metadata(author)
        metadata["colors"] = self.to_colors()
        return metadata
    
    def convertions(self) -> list[IconConvertion]:
        colorNames = self.to_colors()
        return [
            IconConvertion(colorNames["light"], self.lightIcon),
            IconConvertion(colorNames["dark"], self.darkIcon),
        ]

def checkType(type: str):
    if type not in ["normal", "monochrome"]:
        raise ValueError(f"Invalid icon type: '{type}'")
    return type

def iconFactory(type: str, issue_form: str):
    if type == "normal":
        return NormalIcon(json.loads(issue_form))
    elif type == "monochrome":
        return MonochromeIcon(json.loads(issue_form))
    raise ValueError(f"Invalid icon type: '{type}'")

def mapFrom(input: dict, label: str) -> str:
        return input.get(label, None)

def mapFromRequired(input: dict, label: str) -> str:
    value = mapFrom(input, label)
    if value is None:
        raise ValueError(f"Missing required field: '{label}'")
    return value

def mapFileTypeFrom(input: dict, label: str) -> str:
    fileType = mapFromRequired(input, label)
    if fileType not in ["SVG", "PNG"]:
        raise ValueError(f"Invalid file type: '{fileType}'")
    return fileType.lower()

def mapListFrom(input: dict, label: str) -> list:
    stringList = mapFrom(input, label)
    if stringList is None:
        return []
    return list(map(str.strip, stringList.split(",")))

def mapUrlFromMarkdownImage(input: dict, label: str) -> re.Match[str]:
    markdown = mapFromRequired(input, label)
    try:
        return re.match(r"!\[[^\]]+\]\((https:[^\)]+)\)", markdown)[1]
    except IndexError:
        raise ValueError(f"Invalid markdown image: '{markdown}'")
    
