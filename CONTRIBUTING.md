# Contributing to Dashboard Icons

Thank you for your interest in contributing to our icon collection! These guidelines will help ensure smooth collaboration and maintain the quality of our collection.

## Table of Contents

- [Contributing to Dashboard Icons](#contributing-to-dashboard-icons)
  - [Table of Contents](#table-of-contents)
  - [Icon Specifications](#icon-specifications)
    - [Format Requirements](#format-requirements)
    - [Quality Standards](#quality-standards)
    - [Light \& Dark Variants](#light--dark-variants)
    - [File Naming](#file-naming)
  - [Requesting New Icons](#requesting-new-icons)
  - [Improving the Repository](#improving-the-repository)
  - [Code of Conduct](#code-of-conduct)
  - [Questions?](#questions)

## Icon Specifications

### Format Requirements

- **SVG Format**: All icons must be submitted in SVG format
- **Auto-Generated Formats**: PNG and WEBP versions are generated automatically with:
  - Height: 512 pixels
  - Width: Auto (maintaining aspect ratio)
  - Transparency: Enabled

### Quality Standards

- **Clean SVG**: No embedded raster images in SVG files
- **Proper Cropping**: Remove empty space for proper centering
  - Use [SVG Crop](https://svgcrop.com/) for assistance
- **No Upscaling**: Maintain original quality without artificial enlargement

### Light & Dark Variants

For monochrome or single-color icons:

- **Light Variant**: Required for dark backgrounds
  - Invert black elements
  - Adjust colors for visibility
- **Dark Variant**: Required for light backgrounds
  - Invert white elements
  - Adjust colors for visibility

**Tool Recommendation**: [DEEditor](https://deeditor.com/) for color adjustments

### File Naming

- **Kebab Case**: Use lowercase with hyphens
  - Example: "Nextcloud Calendar" → `nextcloud-calendar.svg`
- **Variant Suffixes**:
  - `-light` for dark backgrounds
  - `-dark` for light backgrounds

## Requesting New Icons

> [!NOTE]
> Submit new icons and updates to existing ones with the form at [dashboardicons.com/submit](https://dashboardicons.com/submit). GitHub issues are no longer used for icon submissions.

> [!IMPORTANT]
> If you would like to help review, approve, or reject icon submissions, contact us:
> - **Discord:** https://discord.com/invite/aCsmEV5RgA
> - **Email:** homarr-labs@proton.me
>
> If you want to be an admin for dashboardicons.com, tell us (via Discord or email) why you'd like to help and what you bring to the project!

---

### How to submit

1. **Open the form**: Go to [dashboardicons.com/submit](https://dashboardicons.com/submit) and sign in
2. **Submit or update**: Add one or more new icons, or propose an update to an existing icon, such as a new variant
3. **Review**: Admins approve or reject each submission
4. **Publishing**: Approved submissions go live once a maintainer publishes them

## Improving the Repository

To contribute to the repository itself:

1. **Fork the Repository**
2. **Make Your Changes**:
   - Documentation improvements
   - Website enhancements
   - Repository maintenance
   - Bug fixes

3. **Submit a Pull Request**:
   - Use semantic commit messages following the format: `<type>(scope): description`
     - `feat(icons): add nextcloud-calendar`
     - `fix(website): correct icon preview`
     - `docs(readme): update installation instructions`
   - Reference any related issues
   - Follow our [Code of Conduct](CODE_OF_CONDUCT.md)

## Code of Conduct

By contributing, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please review it to understand the expectations for all participants.

## Questions?

If you have any questions or need assistance, contact us at [homarr-labs@proton.me](mailto:homarr-labs@proton.me).
