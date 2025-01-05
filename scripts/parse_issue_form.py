import json
import os

ISSUE_FORM_ITEM_LABEL = "###"
ISSUE_EMPTY_RESPONSE = "_No response_"
INPUT_ENV_VAR_NAME = "INPUT_ISSUE_BODY"

def parse_issue_form(input: str) -> dict:
    splitItems = input.split(ISSUE_FORM_ITEM_LABEL)
    # Remove first empty item
    splitItems.pop(0)
    parsedForm = dict()
    for item in splitItems:
        item = item.strip()
        itemLines = item.split("\n")
        itemName = itemLines[0].strip()
        itemValue = "\n".join(itemLines[1:]).strip()
        if itemValue == ISSUE_EMPTY_RESPONSE:
            itemValue = None
        parsedForm[itemName] = itemValue
    return parsedForm

def main(input: str):
    parsedIssueForm = parse_issue_form(input)
    print(json.dumps(parsedIssueForm))

if (__name__ == "__main__"):
    main(os.getenv(INPUT_ENV_VAR_NAME))