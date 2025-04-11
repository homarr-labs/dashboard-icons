> [!WARNING]
> The repository has been migrated from `walkxcode` to `homarr-labs` as I no longer have the capacity to maintain it. The Homarr team will now handle management and maintenance, ensuring that functionality remains unchanged. The project will always be usable outside of Homarr and no breaking changes will be introduced.  
> ― *Bjorn*
>
> The license and guidelines have been updated, so please review them. To help with maintenance, contact us at [homarr-labs@proton.me](mailto:homarr-labs@proton.me).

[![jsDelivr hits (GitHub)](https://img.shields.io/jsdelivr/gh/hy/homarr-labs/dashboard-icons?style=flat-square&color=%23A020F0)](https://www.jsdelivr.com/package/gh/homarr-labs/dashboard-icons)
[![jsDelivr hits (GitHub)](https://img.shields.io/jsdelivr/gh/hy/walkxcode/dashboard-icons?style=flat-square&color=%23A020F0)](https://www.jsdelivr.com/package/gh/walkxcode/dashboard-icons)

[https://icons.homarr.dev](https://icons.homarr.dev)

## Dashboard Icons

Your definitive source for dashboard icons.  
[**View icons →**](https://icons.homarr.dev)

## Table of Contents

- [Dashboard Icons](#dashboard-icons)
- [Table of Contents](#table-of-contents)
- [Icon Requests](#icon-requests)
- [Supported Dashboards](#supported-dashboards)
- [Usage and Details](#usage-and-details)
  - [Direct Links](#direct-links)
    - [Base URL](#base-url)
    - [Icon Name](#icon-name)
    - [Formats](#formats)
  - [Dark/Light Variants](#darklight-variants)
  - [Downloading Icons](#downloading-icons)
- [Disclaimer](#disclaimer)

## Icon Requests

If you’d like to add a new icon, please review our [Contribution Guidelines](CONTRIBUTING.md) and then submit a request using [our issue templates](https://github.com/homarr-labs/dashboard-icons/issues/new/choose).

## Supported Dashboards

Dashboard Icons integrate seamlessly with several popular dashboards, including:

- [Homarr](https://github.com/ajnart/homarr)
- [Homepage](https://github.com/gethomepage/homepage)
- [Dashy](https://github.com/Lissy93/dashy)

## Usage and Details

### Direct Links

You can use icons directly from GitHub or through the lightning-fast jsDelivr CDN. The structure of a direct link is as follows:

```
https://<Base URL>/<Format>/<Name>.<Format>
```

For example, the WEBP version of the Nextcloud Calendar icon is available at:

```
https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/nextcloud-calendar.webp
```

#### Base URL

We recommend using jsDelivr:

- `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons`

Alternatively, you can reference the repository directly:

- `https://raw.githubusercontent.com/homarr-labs/dashboard-icons/refs/heads/main`

#### Icon Name

Icons follow kebab-case formatting (all lowercase words separated by hyphens). For example, "Nextcloud Calendar" becomes `nextcloud-calendar`.

#### Formats

Icons are available in these formats:

- SVG
- PNG
- WEBP

*All icons are generated from the base SVG file. For more details, see the [Contribution Guidelines](CONTRIBUTING.md).*

### Dark/Light Variants

Some icons may have very light or dark colors, which might reduce visibility on certain backgrounds. In such cases, a `-light` or `-dark` suffix is appended—for instance, "2fauth" becomes `2fauth-light`.

*More specifics are available in the [Contribution Guidelines](CONTRIBUTING.md).*

### Downloading Icons

1. **Browse & Download:**  
   Visit [https://icons.homarr.dev](https://icons.homarr.dev) to easily view and download icons.

2. **Using the Browser:**  
   On the icons page ([ICONS.md](ICONS.md)), right-click any icon link and select "Save link as".  
   **Note:** Loading the icons page displays every icon in the repository, which may lead to high data usage, slow performance, or even browser crashes on less powerful devices. For faster access, use the direct links or download icons individually.

3. **Using the Terminal:**  
   Download icons via `curl` or `wget` by using the following structure:

   ```bash
   curl -O https://<Base URL>/<Format>/<Name>.<Format>
   ```
   
   or

   ```bash
   wget https://<Base URL>/<Format>/<Name>.<Format>
   ```

## Disclaimer

Unless stated otherwise, all images and assets in this repository—including product names, trademarks, and registered trademarks—belong to their respective owners and are used solely for identification purposes. Their inclusion does not imply endorsement.

For more details, please review the [LICENSE](LICENSE). If you have any questions or concerns, contact us at [homarr-labs@proton.me](mailto:homarr-labs@proton.me).
