import os
import sys
from icons import iconFactory, checkType

ISSUE_FORM_ENV_VAR = "INPUT_ISSUE_FORM"

def main(type: str, issue_form: str):
    icon = iconFactory(type, issue_form)
    print(icon.name)

if (__name__ == "__main__"):
    type = checkType(sys.argv[1])
    main(type, os.getenv(ISSUE_FORM_ENV_VAR))