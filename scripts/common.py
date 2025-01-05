import re

def convert_to_kebab_case(name: str) -> str:
    """Convert a filename to kebab-case."""
    cleaned = re.sub(r'[^a-zA-Z0-9\s-]', '', name)
    kebab_case_name = re.sub(r'[\s_]+', '-', cleaned).lower()
    return kebab_case_name