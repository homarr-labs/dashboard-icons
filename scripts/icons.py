import re
from common import convert_to_kebab_case
from datetime import datetime
import json
from enum import Enum

from metadata import load_metadata

class IconConvertion:
    def __init__(self, name: str, source: str):
        self.name = name
        self.source = source

class Icon:
    def __init__(self, name: str, type: str, categories: list, aliases: list):
        self.name = name
        self.type = type
        self.categories = categories
        self.aliases = aliases

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
    def __init__(self, icon: str, name: str, type: str, categories: list, aliases: list):
        super().__init__(name, type, categories, aliases)
        self.icon = icon

    def convertions(self) -> list[IconConvertion]:
        return [
            IconConvertion(self.name, self.icon)
        ]

    def from_addition_issue_form(input: dict):
        return NormalIcon(
            mapUrlFromMarkdownImage(input, "Paste icon"),
            convert_to_kebab_case(mapFromRequired(input, "Icon name")),
            mapFileTypeFrom(input, "Icon type"),
            mapListFrom(input, "Categories"),
            mapListFrom(input, "Aliases")
        )

    def from_update_issue_form(input: dict):
        try:
            name = convert_to_kebab_case(mapFromRequired(input, "Icon name"))
            metadata = load_metadata(name)


            return NormalIcon(
                mapUrlFromMarkdownImage(input, "Paste icon"),
                mapFromRequired(input, "Icon name"),
                mapFileTypeFrom(input, "Icon type"),
                metadata["categories"],
                metadata["aliases"]
            )
        except Exception as exeption:
            raise ValueError(f"Icon '{name}' does not exist", exeption)

    def from_metadata_update_issue_form(input: dict):
        name = convert_to_kebab_case(mapFromRequired(input, "Icon name"))
        metadata = load_metadata(name)

        return NormalIcon(
            None,
            name,
            metadata["base"],
            mapListFrom(input, "Categories"),
            mapListFrom(input, "Aliases")
        )



class MonochromeIcon(Icon):
    def __init__(self, lightIcon: str, darkIcon: str, name: str, type: str, categories: list, aliases: list):
        super().__init__(name, type, categories, aliases)
        self.lightIcon = lightIcon
        self.darkIcon = darkIcon

    def to_colors(self) -> dict:
        try:
            metadata = load_metadata(self.name)
            return {
                "light": f"{metadata['colors']['light']}",
                "dark": f"{metadata['colors']['dark']}"
            }
        except:
            return {
                "light": f"{self.name}",
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

    def from_addition_issue_form(input: dict):
        return MonochromeIcon(
            mapUrlFromMarkdownImage(input, "Paste light mode icon"),
            mapUrlFromMarkdownImage(input, "Paste dark mode icon"),
            convert_to_kebab_case(mapFromRequired(input, "Icon name")),
            mapFileTypeFrom(input, "Icon type"),
            mapListFrom(input, "Categories"),
            mapListFrom(input, "Aliases")
        )

    def from_update_issue_form(input: dict):
        try:
            name = convert_to_kebab_case(mapFromRequired(input, "Icon name"))
            metadata = load_metadata(name)

            return MonochromeIcon(
                mapUrlFromMarkdownImage(input, "Paste light mode icon"),
                mapUrlFromMarkdownImage(input, "Paste dark mode icon"),
                mapFromRequired(input, "Icon name"),
                mapFileTypeFrom(input, "Icon type"),
                metadata["categories"],
                metadata["aliases"]
            )
        except Exception as exeption:
            raise ValueError(f"Icon '{name}' does not exist", exeption)

    def from_metadata_update_issue_form(input: dict):
        name = convert_to_kebab_case(mapFromRequired(input, "Icon name"))
        metadata = load_metadata(name)

        return MonochromeIcon(
            None,
            None,
            name,
            metadata["base"],
            mapListFrom(input, "Categories"),
            mapListFrom(input, "Aliases")
        )

def checkType(type: str):
    if type not in ["normal", "monochrome"]:
        raise ValueError(f"Invalid icon type: '{type}'")
    return type

def checkAction(action: str):
    if action == "addition":
        return IssueFormType.ADDITION
    elif action == "update":
        return IssueFormType.UPDATE
    elif action == "metadata_update":
        return IssueFormType.METADATA_UPDATE
    raise ValueError(f"Invalid action: '{action}'")

class IssueFormType(Enum):
    ADDITION = "addition"
    UPDATE = "update"
    METADATA_UPDATE = "metadata_update"

def iconFactory(type: str, issue_form: str, issue_form_type: IssueFormType):
    if type == "normal":
        if (issue_form_type == IssueFormType.ADDITION):
            return NormalIcon.from_addition_issue_form(json.loads(issue_form))
        elif (issue_form_type == IssueFormType.UPDATE):
            return NormalIcon.from_update_issue_form(json.loads(issue_form))
        elif (issue_form_type == IssueFormType.METADATA_UPDATE):
            return NormalIcon.from_metadata_update_issue_form(json.loads(issue_form))
        else:
            raise ValueError(f"Invalid issue form type: '{issue_form_type}'")
    elif type == "monochrome":
        if (issue_form_type == IssueFormType.ADDITION):
            return MonochromeIcon.from_addition_issue_form(json.loads(issue_form))
        elif (issue_form_type == IssueFormType.UPDATE):
            return MonochromeIcon.from_update_issue_form(json.loads(issue_form))
        elif (issue_form_type == IssueFormType.METADATA_UPDATE):
            return MonochromeIcon.from_metadata_update_issue_form(json.loads(issue_form))
        else:
            raise ValueError(f"Invalid issue form type: '{issue_form_type}'")
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

def mapUrlFromMarkdownImage(input: dict, label: str) -> str:
    markdown_or_html = mapFromRequired(input, label)

    # Try Markdown format: ![alt](url)
    markdown_match = re.match(r"!\[[^\]]*\]\((https:[^\)]+)\)", markdown_or_html)
    if markdown_match:
        return markdown_match[1]

    # Try HTML format: <img src="url" ...>
    html_match = re.search(r"<img[^>]+src=\"(https:[^\"]+)\"", markdown_or_html)
    if html_match:
        return html_match[1]

    # If neither matches
    raise ValueError(f"Could not extract URL from '{label}'. Expected Markdown image or HTML img tag, but got: '{markdown_or_html}'")

