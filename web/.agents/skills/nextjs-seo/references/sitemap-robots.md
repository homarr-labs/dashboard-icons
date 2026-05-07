# Sitemap & Robots.txt in Next.js

## Sitemap Configuration

### Basic Static Sitemap

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://your-site.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://your-site.com/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
```

### Dynamic Sitemap with Database

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/posts';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://your-site.com';
  const posts = await getAllPosts();

  const postUrls = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...postUrls,
  ];
}
```

### Image Sitemap

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://your-site.com';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
      images: [
        `${baseUrl}/og-image.png`,
        `${baseUrl}/hero-image.jpg`,
      ],
    },
  ];
}
```

### Video Sitemap

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://your-site.com/video-page',
      lastModified: new Date(),
      videos: [
        {
          title: 'Video Title',
          thumbnail_loc: 'https://your-site.com/thumbnail.jpg',
          description: 'Video description',
        },
      ],
    },
  ];
}
```

### Multiple Sitemaps (Large Sites)

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export async function generateSitemaps() {
  // Return array of sitemap IDs
  return [{ id: 0 }, { id: 1 }, { id: 2 }];
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  const start = Number(id) * 50000;
  const end = start + 50000;

  const products = await getProducts(start, end);

  return products.map((product) => ({
    url: `https://your-site.com/products/${product.id}`,
    lastModified: product.updatedAt,
  }));
}
// Generates: /sitemap/0.xml, /sitemap/1.xml, /sitemap/2.xml
```

### Localized Sitemap

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://your-site.com',
      lastModified: new Date(),
      alternates: {
        languages: {
          en: 'https://your-site.com/en',
          fi: 'https://your-site.com/fi',
          sv: 'https://your-site.com/sv',
        },
      },
    },
  ];
}
```

## Robots.txt Configuration

### Basic Robots.txt

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
      // Never disallow /_next/ — crawlers need render-critical CSS/JS
    },
    sitemap: 'https://your-site.com/sitemap.xml',
  };
}
```

### Multiple User Agents

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: '/admin/',
      },
      {
        userAgent: 'GPTBot',
        disallow: '/', // Block AI crawlers
      },
    ],
    sitemap: 'https://your-site.com/sitemap.xml',
    host: 'https://your-site.com',
  };
}
```

### Environment-Based Robots

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-site.com';

  // Block indexing on non-production
  if (process.env.NODE_ENV !== 'production') {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

## Sitemap Best Practices

| Guideline | Recommendation |
|-----------|----------------|
| Max URLs per sitemap | 50,000 |
| Max file size | 50 MB |
| Update frequency | Match actual content changes |
| Priority values | 0.0 to 1.0 (homepage = 1.0) |
| Include only | Canonical, 200-status pages |

## Robots.txt Best Practices

1. **Don't block CSS/JS** - Google needs them for rendering
2. **Don't block sitemap** - Never disallow `/sitemap.xml`
3. **Use specific paths** - `/admin/` instead of broad blocks
4. **Test before deploy** - Use Google Search Console robots.txt tester
