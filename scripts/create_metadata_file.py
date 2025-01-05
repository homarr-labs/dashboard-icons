import json
import os
import sys
from icons import iconFactory, checkType
from pathlib import Path



ISSUE_FORM_ENV_VAR = "INPUT_ISSUE_FORM"
AUTHOR_ID_ENV_VAR = "INPUT_ISSUE_AUTHOR_ID"
AUTHOR_LOGIN_ENV_VAR = "INPUT_ISSUE_AUTHOR_LOGIN"

ROOT_DIR = Path(__file__).resolve().parent
META_DIR = ROOT_DIR / "meta"

# Ensure the output folders exist
META_DIR.mkdir(parents=True, exist_ok=True)

def main(type: str, issue_form: str, author_id: int, author_login: str):
    icon = iconFactory(type, issue_form)
    metadata = icon.to_metadata({"id": author_id, "login": author_login})

    FILE_PATH = META_DIR / f"{icon.name}.json"

    with open(FILE_PATH, 'w', encoding='UTF-8') as f:
        json.dump(metadata, f, indent=2)




if (__name__ == "__main__"):
    type = checkType(sys.argv[1])
    main(
        type,
        os.getenv(ISSUE_FORM_ENV_VAR),
        int(os.getenv(AUTHOR_ID_ENV_VAR)),
        os.getenv(AUTHOR_LOGIN_ENV_VAR)
    )

