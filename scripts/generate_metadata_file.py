import json
import os
import sys
from icons import IssueFormType, checkAction, iconFactory, checkType
from pathlib import Path

from metadata import load_metadata



ISSUE_FORM_ENV_VAR = "INPUT_ISSUE_FORM"
AUTHOR_ID_ENV_VAR = "INPUT_ISSUE_AUTHOR_ID"
AUTHOR_LOGIN_ENV_VAR = "INPUT_ISSUE_AUTHOR_LOGIN"

ROOT_DIR = Path(__file__).resolve().parent.parent
META_DIR = ROOT_DIR / "meta"

# Ensure the output folders exist
META_DIR.mkdir(parents=True, exist_ok=True)

def main(type: str, action: IssueFormType, issue_form: str, author_id: int, author_login: str):
    icon = iconFactory(type, issue_form, action)
    if (action == IssueFormType.METADATA_UPDATE):
        existing_metadata = load_metadata(icon.name)
        author_id = existing_metadata["author"]["id"]
        author_login = existing_metadata["author"]["login"]
    metadata = icon.to_metadata({"id": author_id, "login": author_login})

    FILE_PATH = META_DIR / f"{icon.name}.json"

    with open(FILE_PATH, 'w', encoding='UTF-8') as f:
        json.dump(metadata, f, indent=2)


def parse_author_id():
    author_id_string = os.getenv(AUTHOR_ID_ENV_VAR)
    if author_id_string != None:
        return int(author_id_string)
    return None

if (__name__ == "__main__"):
    type = checkType(sys.argv[1])
    action = checkAction(sys.argv[2])
    main(
        type,
        action,
        os.getenv(ISSUE_FORM_ENV_VAR),
        parse_author_id(),
        os.getenv(AUTHOR_LOGIN_ENV_VAR)
    )

