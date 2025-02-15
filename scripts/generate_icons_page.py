import json
import pathlib
from pathlib import Path
import sys

# Read the JSON file
def read_tree_json(file_path):
    with open(file_path, 'r', encoding='UTF-8') as f:
        return json.load(f)

# Generate a table row with checkmarks for available formats and links
def generate_table_row(icon_name, formats):
    # Prepare the checkmarks and links for each format if they exist
    webp_check = '✅' if formats['webp'] else '❌'
    png_check = '✅' if formats['png'] else '❌'
    svg_check = '✅' if formats['svg'] else '❌'

    # Prepare the links for each format if they exist
    webp_link = f'<a href="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/{icon_name}.webp">WebP</a>' if formats['webp'] else 'WebP'
    png_link = f'<a href="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/{icon_name}.png">PNG</a>' if formats['png'] else 'PNG'
    svg_link = f'<a href="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/{icon_name}.svg">SVG</a>' if formats['svg'] else 'SVG'

    # Combine checkmarks and links (or just name if not available)
    webp_info = f'{webp_check} {webp_link}' if formats['webp'] else f'{webp_check} {webp_link}'
    png_info = f'{png_check} {png_link}' if formats['png'] else f'{png_check} {png_link}'
    svg_info = f'{svg_check} {svg_link}' if formats['svg'] else f'{svg_check} {svg_link}'

    # Generate preview using WebP
    preview = f'<img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/{icon_name}.webp" height="50" alt="{icon_name}">'

    return f"| {icon_name} | {webp_info} {png_info} {svg_info} | {preview} |"

if __name__ == "__main__":
    # Define paths
    root = pathlib.Path(__file__).parent.resolve()
    tree_json_path = root.parent / "tree.json"
    template_path = root / "TEMPLATE.md"
    icons_md_path = root.parent / "ICONS.md"

    # Load the tree.json data
    formats = read_tree_json(tree_json_path)

    # Create a dictionary to hold icons by their base name (ignoring file extensions)
    icons_dict = {}

    # Check the formats and group icons by their base name
    for ext, icons in formats.items():
        for icon in icons:
            base_name = icon.rsplit('.', 1)[0]  # Get base name (without extension)
            if base_name not in icons_dict:
                icons_dict[base_name] = {'webp': False, 'png': False, 'svg': False}
            icons_dict[base_name][ext] = True

    # Create table for all icons (unique names)
    table_rows = []

    for icon_name in sorted(icons_dict.keys()):
        table_row = generate_table_row(icon_name, icons_dict[icon_name])
        table_rows.append(table_row)

    # Prepare the table with header and rows
    table_header = "| Name | Links | Preview |"
    table_separator = "|------|-------|---------|"
    table_content = "\n".join(table_rows)
    table = f"{table_header}\n{table_separator}\n{table_content}"

    # Read the template file
    with open(template_path, "r", encoding="UTF-8") as f:
        template = f.read()

    # Find the line that starts with "<!-- ICONS -->"
    try:
        line_number = template.index("<!-- ICONS -->")
    except ValueError:
        print("<!-- ICONS --> placeholder not found in TEMPLATE.md")
        sys.exit(1)

    # Insert the table after the placeholder
    updated_template = template[:line_number] + "<!-- ICONS -->\n" + table + template[line_number + len("<!-- ICONS -->"):]

    # Write the new ICONS.md file
    with open(icons_md_path, "w", encoding="UTF-8") as f:
        f.write(updated_template)

    print("ICONS.md has been successfully generated.")