import os
import sys
from icons import IssueFormType, checkAction, iconFactory, checkType

ISSUE_FORM_ENV_VAR = "INPUT_ISSUE_FORM"

def main(type: str, action: IssueFormType, issue_form: str):
    icon = iconFactory(type, issue_form, action)
    print(icon.name)

if (__name__ == "__main__"):
    type = checkType(sys.argv[1])
    action = checkAction(sys.argv[2])
    main(type, action, os.getenv(ISSUE_FORM_ENV_VAR))