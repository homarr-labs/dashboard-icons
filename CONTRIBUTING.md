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
> You can now submit new icon requests and updates directly using the form available at [dashboardicons.com](https://dashboardicons.com). This is the preferred way to make submissions and allows us to instantly receive and process icon contributions. Submissions can be directly approved and published by admins or contributors of Homarr Labs.

> [!TIP]
> Use the dashboardicons.com submission form for faster review, approval, and publishing of your icon contributions—no need to open GitHub issues!

> [!IMPORTANT]
> If you would like to help review, approve, or reject icon submissions, contact us:
> - **Discord:** https://discord.com/invite/aCsmEV5RgA
> - **Email:** homarr-labs@proton.me
>
> If you want to be an admin for dashboardicons.com, tell us (via Discord or email) why you'd like to help and what you bring to the project!

> [!WARNING]
> If you choose to submit an "old" issue in GitHub (instead of using the dashboardicons.com form), your request may take significantly longer to be reviewed and processed.

> [!CAUTION]
> The current GitHub issue templates for icon submission/update are being migrated. Please use the dashboardicons.com web form for all future contributions. Submissions made via GitHub issue templates may be delayed and are not the preferred channel.

---

### Preferred Method: Using dashboardicons.com (Recommended)

1. **Visit the Website**: Go to [dashboardicons.com](https://dashboardicons.com)
2. **Use the Submission Form**: Fill out the online form with your icon details
3. **Quick Review**: Admins can instantly review and approve submissions
4. **Fast Publishing**: Approved icons are published immediately

### Alternative Method: Using GitHub Issues (Slower)

To request a new icon via GitHub:

1. **Create an Issue**:
   - Use the appropriate [issue template](https://github.com/homarr-labs/dashboard-icons/issues/new/choose)
   - Choose between "Light & dark icon" or "Normal icon" template

2. **Provide Information**:
   - Service/application name
   - Official logo or icon source
   - Any specific requirements or notes

3. **Upload Icon** (optional):
   - Attach the SVG file directly to the issue
   - Include both light and dark variants if applicable

4. **Wait for Review**:
   - Our team will review your request
   - We may request adjustments if needed
   - Once approved, we'll add the icon to the collection
   - **Note**: GitHub submissions may take longer to process

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
