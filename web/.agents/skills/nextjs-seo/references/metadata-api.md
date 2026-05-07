# Next.js Metadata API

Complete guide for implementing SEO metadata in Next.js App Router.

## Static vs Dynamic Metadata

### Static Metadata (metadata object)

Use when metadata is known at build time:

```typescript
// app/layout.tsx or app/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Page description',
};
```

### Dynamic Metadata (generateMetadata)

Use when metadata depends on route params or external data:

```typescript
// app/products/[id]/page.tsx
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params; // params is a Promise in current Next.js
  const product = await getProduct(id);

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      images: [product.image],
    },
  };
}
```

## Complete Metadata Object

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  // Base URL for relative paths
  metadataBase: new URL('https://your-site.com'),

  // Title configuration
  title: {
    default: 'Default Title',        // Used when no page title
    template: '%s | Site Name',      // Template for child pages
    absolute: 'Override All',        // Ignores template
  },

  // Description (150-160 characters recommended)
  description: 'Compelling meta description with target keywords',

  // Keywords (less important now, but still used)
  keywords: ['keyword1', 'keyword2', 'long-tail keyword'],

  // Author information
  authors: [{ name: 'Author Name', url: 'https://author.com' }],
  creator: 'Creator Name',
  publisher: 'Publisher Name',

  // Robots directives
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Canonical and alternates
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
      'fi-FI': '/fi-FI',
    },
  },

  // Open Graph (Facebook, LinkedIn)
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://your-site.com',
    siteName: 'Site Name',
    title: 'Open Graph Title',
    description: 'Open Graph description',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Image alt text',
        type: 'image/png',
      },
    ],
  },

  // Twitter Cards
  twitter: {
    card: 'summary_large_image',  // or 'summary' for square images
    site: '@username',
    creator: '@creator',
    title: 'Twitter Title',
    description: 'Twitter description',
    images: ['/twitter-image.png'],
  },

  // Icons
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },

  // Verification tags
  verification: {
    google: 'google-verification-code',
    yandex: 'yandex-verification-code',
  },

  // App links
  appLinks: {
    ios: {
      url: 'https://app.example.com/ios',
      app_store_id: 'app_store_id',
    },
    android: {
      package: 'com.example.app',
      app_name: 'App Name',
    },
  },

  // Format detection (disable auto-linking)
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // Category
  category: 'technology',
};
```

## Viewport Configuration

**Important:** viewport must be a separate export, not a field in `metadata`:

```typescript
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  colorScheme: 'light dark',
};
```

## Metadata Merging

Metadata merges from root to leaf. Child metadata overrides parent:

```
app/layout.tsx (base metadata)
  └── app/blog/layout.tsx (adds/overrides)
        └── app/blog/[slug]/page.tsx (final metadata)
```

## Open Graph Image Sizes

| Platform | Recommended Size |
|----------|------------------|
| Facebook | 1200 x 630 px |
| Twitter (large) | 1200 x 628 px |
| Twitter (summary) | 512 x 512 px |
| LinkedIn | 1200 x 627 px |

## Twitter Card Types

| Card Type | Image Size | Use Case |
|-----------|------------|----------|
| `summary` | 1:1 (min 144x144) | Square logos, icons |
| `summary_large_image` | 2:1 (min 300x157) | Articles, products |
| `player` | Video embed | Video content |
| `app` | App store link | Mobile apps |

## Streaming Metadata

Next.js streams metadata after sending the initial UI by default. This improves TTFB and LCP.

```typescript
// next.config.ts - Control which bots get blocking metadata
import type { NextConfig } from 'next';

const config: NextConfig = {
  // Bots matching this regex get blocking (non-streaming) metadata
  // Default: facebookexternalhit, linkedinbot, etc.
  htmlLimitedBots: /facebookexternalhit|linkedinbot/,

  // To disable streaming entirely (all bots get blocking metadata):
  // htmlLimitedBots: /.*/,
};

export default config;
```

**How it works:**

- JavaScript-capable bots (Googlebot): Metadata streams, bot executes JS to read it
- HTML-limited bots (Facebook): Metadata blocks, included in initial `<head>`
- Users: Faster page load, metadata streams in

## Best Practices

1. **Always set metadataBase** - Required for relative URLs
2. **Use title templates** - Consistent branding across pages
3. **Write unique descriptions** - Each page needs unique description
4. **Include canonical URLs** - Prevent duplicate content issues
5. **Test with validators** - Use Facebook Debugger, Twitter Card Validator
6. **Don't mix static and dynamic** - Use either `metadata` object or `generateMetadata`, not both
