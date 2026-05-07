# SEO Troubleshooting Guide

## Google Indexing Issues

### "Discovered - currently not indexed"

**Meaning:** Google found the URL but hasn't crawled it yet.

**Causes:**
- New website (low crawl priority)
- Low-quality signals
- Crawl budget exhaustion

**Solutions:**
1. Request indexing via URL Inspection tool
2. Build quality backlinks
3. Improve internal linking
4. Wait (can take weeks for new sites)

### "Crawled - currently not indexed"

**Meaning:** Google crawled but chose not to index.

**Causes:**
- Thin content
- Duplicate content
- Low-quality content
- Technical issues

**Solutions:**
1. Add more unique, valuable content
2. Check for duplicate content issues
3. Ensure canonical URLs are correct
4. Improve E-E-A-T signals (Experience, Expertise, Authoritativeness, Trust)

### "URL is not on Google"

**Meaning:** Page is not in Google's index.

**Steps:**
1. Check robots.txt isn't blocking
2. Check for `noindex` meta tag
3. Check canonical URL points to correct page
4. Request indexing in GSC

### "Blocked by robots.txt"

**Solution:** Update `app/robots.ts`:

```typescript
// Remove the blocking rule
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Remove or fix disallow rules
    },
  };
}
```

## Google Search Console Usage

### URL Inspection Tool

1. Go to Google Search Console
2. Enter URL in search bar at top
3. Check:
   - "URL is on Google" status
   - "Page fetch" success
   - "Indexing allowed" status
   - "User-declared canonical"
   - "Google-selected canonical"

### Request Indexing

1. Use URL Inspection tool
2. Click "Request Indexing"
3. Wait (don't spam - once is enough)
4. Check back in 1-2 weeks

### Pages Report

Navigate to: **Indexing > Pages**

| Status | Meaning | Action |
|--------|---------|--------|
| Not indexed | Various reasons | Check specific reason |
| Indexed | In Google | Monitor |
| Error | Technical issue | Fix immediately |

## Common Technical Issues

### JavaScript Rendering Problems

**Symptom:** Content missing in Google's cached version.

**Solutions:**
1. Use SSR/SSG instead of CSR for SEO content
2. Check with URL Inspection "View Crawled Page"
3. Ensure critical content is in initial HTML

### Duplicate Content

**Symptom:** Multiple URLs with same content.

**Solutions:**

```typescript
// Set canonical URL
export const metadata: Metadata = {
  alternates: {
    canonical: '/correct-url',
  },
};
```

### Redirect Chains

**Symptom:** Multiple redirects (A → B → C).

**Solution:** Redirect directly to final URL:

```typescript
// next.config.ts
export default {
  async redirects() {
    return [
      {
        source: '/old-url',
        destination: '/final-url', // Direct to final
        permanent: true,
      },
    ];
  },
};
```

### Slow Page Speed

**Symptom:** High LCP, poor Core Web Vitals.

**Solutions:**
1. Use `next/image` for images
2. Use `next/font` for fonts
3. Implement lazy loading
4. Reduce JavaScript bundle size
5. Use SSG where possible

## Building Authority

### For New Sites

1. **Submit to GSC** - Add sitemap
2. **Build backlinks** - Quality over quantity
3. **Social signals** - Share content
4. **Directory listings** - Relevant directories
5. **Guest posts** - Industry blogs

### Backlink Sources

| Type | Examples |
|------|----------|
| Directories | Industry-specific directories |
| Social profiles | LinkedIn, Twitter, GitHub |
| Guest posts | Relevant blogs |
| PR | News coverage |
| Partners | Business partners |

## Timeline Expectations

| Scenario | Expected Time |
|----------|---------------|
| New site indexed | 4 days - 4 weeks |
| New page indexed | 1 day - 2 weeks |
| Ranking improvement | 2-6 months |
| Authority building | 6-12 months |

## Debug Checklist

When a page isn't indexed:

1. [ ] Check robots.txt allows crawling
2. [ ] Check no `noindex` tag
3. [ ] Check canonical URL is correct
4. [ ] Check page returns 200 status
5. [ ] Check content is valuable and unique
6. [ ] Check page is linked from other pages
7. [ ] Use URL Inspection tool
8. [ ] Request indexing (once)
9. [ ] Wait and monitor

## Tools

| Tool | Purpose |
|------|---------|
| Google Search Console | Primary indexing tool |
| Bing Webmaster Tools | Bing indexing |
| Screaming Frog | Site crawl audit |
| Ahrefs/Semrush | Backlink analysis |
