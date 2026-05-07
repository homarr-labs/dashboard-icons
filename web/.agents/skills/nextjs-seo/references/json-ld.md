# JSON-LD Structured Data in Next.js

Structured data helps search engines understand your content and enables rich results.

## Implementation Pattern

```typescript
// components/seo/json-ld.tsx
type JsonLdProps = {
  data: Record<string, unknown>;
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'), // XSS protection
      }}
    />
  );
}
```

## Common Schemas

### WebSite Schema

```typescript
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Site Name',
  url: 'https://your-site.com',
  description: 'Site description',
  inLanguage: 'en',
  publisher: {
    '@type': 'Organization',
    name: 'Organization Name',
  },
};
```

### Organization Schema

```typescript
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Company Name',
  url: 'https://your-site.com',
  logo: {
    '@type': 'ImageObject',
    url: 'https://your-site.com/logo.png',
    width: 512,
    height: 512,
  },
  sameAs: [
    'https://twitter.com/company',
    'https://linkedin.com/company/company',
    'https://github.com/company',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'contact@company.com',
    contactType: 'customer service',
  },
  foundingDate: '2024',
  areaServed: {
    '@type': 'Country',
    name: 'Finland',
  },
};
```

### WebApplication Schema

```typescript
const webAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'App Name',
  url: 'https://your-site.com',
  description: 'App description',
  applicationCategory: 'UtilityApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  },
  featureList: [
    'Feature 1',
    'Feature 2',
    'Feature 3',
  ],
};
```

### FAQPage Schema

```typescript
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is your product?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Our product is a tool that helps you...',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does it cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Our service is completely free to use.',
      },
    },
  ],
};
```

**Important:** FAQPage schema must match visible FAQ content on the page. Google rejects rich results if JSON-LD doesn't match visible content.

### Product Schema

```typescript
const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Product Name',
  image: ['https://your-site.com/product.jpg'],
  description: 'Product description',
  sku: 'SKU123',
  brand: {
    '@type': 'Brand',
    name: 'Brand Name',
  },
  offers: {
    '@type': 'Offer',
    url: 'https://your-site.com/product',
    priceCurrency: 'EUR',
    price: '99.99',
    priceValidUntil: '2025-12-31',
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.5',
    reviewCount: '89',
  },
};
```

### Article Schema

```typescript
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Article Title',
  description: 'Article description',
  image: 'https://your-site.com/article-image.jpg',
  datePublished: '2024-01-15T08:00:00+00:00',
  dateModified: '2024-01-16T10:00:00+00:00',
  author: {
    '@type': 'Person',
    name: 'Author Name',
    url: 'https://author-website.com',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Publisher Name',
    logo: {
      '@type': 'ImageObject',
      url: 'https://your-site.com/logo.png',
    },
  },
};
```

### BreadcrumbList Schema

```typescript
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://your-site.com',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Products',
      item: 'https://your-site.com/products',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Product Name',
      item: 'https://your-site.com/products/product-slug',
    },
  ],
};
```

## Usage in Next.js

```typescript
// app/layout.tsx
import { JsonLd } from '@/components/seo/json-ld';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <JsonLd data={websiteSchema} />
        <JsonLd data={organizationSchema} />
        {children}
      </body>
    </html>
  );
}
```

## Testing Tools

1. **Google Rich Results Test**: https://search.google.com/test/rich-results
2. **Schema.org Validator**: https://validator.schema.org/
3. **JSON-LD Playground**: https://json-ld.org/playground/

## Best Practices

1. **Match visible content** - JSON-LD must reflect what users see
2. **Use XSS protection** - Always escape `<` characters
3. **Don't duplicate** - One schema type per page (except @graph)
4. **Keep updated** - Update dateModified when content changes
5. **Test regularly** - Validate after changes
