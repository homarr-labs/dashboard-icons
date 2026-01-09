# Feature: Support Arbitrary Icon Variants with Presets and Custom Variants

## Overview

Currently, the icon system only supports a limited set of hardcoded variants (`light`, `dark`, `wordmark.light`, `wordmark.dark`). This feature request aims to refactor the system to support:

1. **Preset variants**: `default`, `light`, `dark`, `wordmark-default`, `wordmark-light`, `wordmark-dark`
2. **Custom variants**: Any arbitrary variant name (e.g., `monochrome`, `outline`, `filled`, `branded`, etc.)
3. **Bulletproof rendering**: The system must be able to display any icon variant without breaking, even if the variant structure is unexpected
4. **Code reuse**: Unify the logic for displaying icons between collection pages (`/icons/[icon]`) and community pages (`/community/[icon]`) to reduce duplication

## Current Architecture & Data Flow

### How Icons Are Currently Stored

#### Collection Icons (Main Repository)
Collection icons are stored in the repository with the following structure:

1. **File System**: Icons are stored in three directories:
   - `/svg/` - SVG format files
   - `/png/` - PNG format files  
   - `/webp/` - WEBP format files

2. **Metadata Structure** (`metadata.json`):
   ```json
   {
     "icon-name": {
       "base": "svg",
       "aliases": ["alias1", "alias2"],
       "categories": ["category1"],
       "update": {
         "timestamp": "2024-01-01T00:00:00Z",
         "author": { "id": 12345, "login": "username" }
       },
       "colors": {
         "light": "icon-name-light",
         "dark": "icon-name-dark"
       },
       "wordmark": {
         "light": "icon-name-wordmark-light",
         "dark": "icon-name-wordmark-dark"
       }
     }
   }
   ```

3. **File Naming Convention**:
   - Base icon: `icon-name.svg`, `icon-name.png`, `icon-name.webp`
   - Light variant: `icon-name-light.svg`, `icon-name-light.png`, `icon-name-light.webp`
   - Dark variant: `icon-name-dark.svg`, `icon-name-dark.png`, `icon-name-dark.webp`
   - Wordmark variants follow the same pattern with `-wordmark-light` and `-wordmark-dark` suffixes

4. **URL Generation**: URLs are constructed as `${BASE_URL}/${format}/${filename}.${format}` where:
   - `BASE_URL` = `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons`
   - `format` = `svg`, `png`, or `webp`
   - `filename` = the icon name or variant name from metadata

#### Community Icons (PocketBase Submissions)
Community icons are stored in PocketBase with a different structure:

1. **Storage**: Files are uploaded to PocketBase's file storage system, which sanitizes and renames files automatically (e.g., `icon.svg` becomes `icon_abc123xyz.svg`)

2. **Database Structure** (`community_gallery` collection):
   - `name`: Icon identifier
   - `assets`: Array of sanitized filenames (e.g., `["icon_abc123.svg", "icon_xyz789.png"]`)
   - `extras`: JSON object containing:
     ```json
     {
       "aliases": ["alias1"],
       "categories": ["category1"],
       "base": "svg",
       "colors": {
         "light": "original-light-filename.svg",
         "dark": "original-dark-filename.svg"
       },
       "wordmark": {
         "light": "original-wordmark-light.svg",
         "dark": "original-wordmark-dark.svg"
       }
     }
     ```

3. **URL Generation**: URLs are full HTTP URLs to PocketBase file endpoints:
   - Base: `${PB_URL}/api/files/community_gallery/${recordId}/${sanitizedFilename}`
   - The `transformGalleryToIcon` function in `web/src/lib/community.ts` converts PocketBase records to the `Icon` format used by the display components

4. **Filename Matching**: Because PocketBase sanitizes filenames, the system uses `findBestMatchingAsset()` to match original filenames (stored in `extras`) to actual sanitized filenames (in `assets` array)

### Current Display Logic

The `IconDetails` component (`web/src/components/icon-details.tsx`) is shared between both collection and community pages. It handles the differences through:

1. **Icon Type Detection**: 
   ```typescript
   const isCommunityIcon = !!communityData.mainIconUrl || 
     (typeof iconData.base === "string" && iconData.base.startsWith("http"))
   ```
   - Collection icons: `iconData.base` is a format string (`"svg"`, `"png"`, `"webp"`)
   - Community icons: `iconData.base` is a full HTTP URL or `mainIconUrl` is set

2. **Variant Rendering** (`renderVariant` function):
   - **Collection icons**: Constructs URL as `${BASE_URL}/${format}/${iconName}.${format}`
   - **Community icons**: Searches `assetUrls` array to find matching URL by filename and format
   - The function receives `iconName` (which may be a variant filename) and `theme` (optional: `"light"` or `"dark"`)

3. **Variant Display Sections**:
   - Base icon: Always shown unless it matches a variant name
   - Light variant: Only shown if `iconData.colors?.light` exists
   - Dark variant: Only shown if `iconData.colors?.dark` exists
   - Wordmark section: Only shown if `iconData.wordmark` exists, then checks for `light` and `dark` properties

4. **Format Detection**:
   - Collection icons: Determined by `iconData.base` (if `"svg"`, shows SVG/PNG/WEBP; if `"png"`, shows PNG/WEBP only)
   - Community icons: Extracted from `assetUrls` by file extension

### Current Submission Flow

1. **Form Submission** (`web/src/components/advanced-icon-submission-form-tanstack.tsx`):
   - User selects variants from hardcoded list: `base`, `dark`, `light`, `wordmark`, `wordmark_dark`
   - Files are uploaded to form state
   - On submit, `extras` object is built with structure:
     ```typescript
     {
       colors: { dark: filename, light: filename },
       wordmark: { light: filename, dark: filename }
     }
     ```

2. **PocketBase Upload**:
   - All files are uploaded as `assets` array
   - PocketBase sanitizes filenames
   - After upload, the code updates `extras` with sanitized filenames by tracking asset index

3. **Import Script** (`scripts/import-icon.ts`):
   - Fetches submission from PocketBase
   - `buildTargets()` function creates target file paths based on `extras.colors` and `extras.wordmark`
   - Downloads files and saves with naming convention: `icon-name-variant.${ext}`
   - `buildMetadataVariants()` converts targets back to metadata format with hardcoded key mapping

## Problems with Current Implementation

### 1. Hardcoded Variant Types

**Type System** (`web/src/types/icons.ts`):
- `IconColors` only has `light?: string` and `dark?: string`
- `IconWordmarkColors` only has `light?: string` and `dark?: string`
- Cannot represent custom variants like `monochrome`, `outline`, `filled`, etc.

**Impact**: Any variant that isn't `light` or `dark` cannot be stored or displayed.

### 2. Duplicated Logic Between Collection and Community

**URL Resolution**:
- Collection icons: Simple string concatenation in `renderVariant`
- Community icons: Complex array searching and filename matching
- Both paths are embedded in the same function, making it hard to maintain

**Variant Iteration**:
- Collection icons: Direct property access (`iconData.colors.light`, `iconData.colors.dark`)
- Community icons: Same structure but different URL resolution
- No unified way to iterate over all variants

### 3. Submission Form Limitations

**Hardcoded Variants**:
- Form only allows selecting from 5 predefined variants
- Cannot add custom variants
- UI is tightly coupled to specific variant names

**Submission Payload**:
- `extras` structure assumes only `colors` and `wordmark` with `light`/`dark`
- Asset index tracking is fragile and assumes specific order

### 4. Import Script Limitations

**Target Building**:
- `buildTargets()` only checks for `colors.light`, `colors.dark`, `wordmark.light`, `wordmark.dark`
- Cannot handle arbitrary variant names
- Hardcoded filename patterns (`icon-name-light.${ext}`, `icon-name-wordmark-light.${ext}`)

**Metadata Building**:
- `buildMetadataVariants()` uses hardcoded `if/else` chain to map variant keys
- Cannot handle custom variant names
- Assumes specific key patterns (`wordmark-light`, `wordmark-dark`)

### 5. Display Component Limitations

**Variant Sections**:
- `IconVariantsSection` is called separately for each hardcoded variant
- `WordmarkSection` only checks for `wordmark.light` and `wordmark.dark`
- Cannot dynamically render arbitrary variants

**Technical Details**:
- Only displays `colors.light` and `colors.dark` in the variants list
- Only displays `wordmark.light` and `wordmark.dark` in wordmark list
- Cannot show custom variants

## Proposed Solution

### 1. Unified Variant Type System

**New Type Structure**:
```typescript
// Variant definitions are stored in a separate file (variant-definitions.ts)
// The database stores a simple array of variant names
export type IconVariants = {
  [variantName: string]: string  // variant name -> filename (without extension)
}

export type Icon = {
  base: string | "svg" | "png" | "webp"
  aliases: string[]
  categories: string[]
  update: IconUpdate
  variants?: IconVariants  // Replaces colors - flexible object with any variant names
  wordmark?: IconVariants  // Replaces IconWordmarkColors - flexible object with any variant names
  // Keep colors and wordmark for backward compatibility during migration
  colors?: { light?: string; dark?: string }
  wordmark?: { light?: string; dark?: string }
}
```

**Variant Definitions File**:
Create `web/src/lib/variant-definitions.ts` that defines:
- Preset variants (default, light, dark, wordmark-default, wordmark-light, wordmark-dark)
- Metadata for each preset (label, description, icon component)
- Helper functions to get variant definitions (returns preset or generates default for custom variants)

**Migration Strategy**:
- Support both old format (`colors`) and new format (`variants`) during transition
- Variant definitions file provides metadata for preset variants
- Custom variants get default metadata generated on-the-fly
- All display code uses `getVariantDefinition()` to get metadata for any variant name

### 2. Variant Definitions System

**Create Variant Definitions File** (`web/src/lib/variant-definitions.ts`):

This file defines preset variants and provides utilities to work with both preset and custom variants:

- Defines preset variants with metadata (label, description, icon component)
- Provides `getVariantDefinition()` function that returns preset metadata or generates default for custom variants
- Provides helper functions to group and categorize variants
- Allows display components to render any variant (preset or custom) with appropriate metadata

### 3. Unified URL Resolution Utility

**Create New Utility** (`web/src/lib/icon-url-resolver.ts`):

This utility will handle URL resolution for both collection and community icons, eliminating duplication:

```typescript
interface IconUrlContext {
  isCommunityIcon: boolean
  baseIconName: string
  baseFormat: string
  // For collection icons
  baseUrl?: string
  // For community icons
  assetUrls?: string[]
  mainIconUrl?: string
}

/**
 * Resolves the URL for an icon variant in a specific format
 * Works for both collection and community icons
 */
export function resolveIconUrl(
  context: IconUrlContext,
  variantName: string | null,  // null for base icon
  format: string
): string | null {
  if (context.isCommunityIcon) {
    return resolveCommunityIconUrl(context, variantName, format)
  } else {
    return resolveCollectionIconUrl(context, variantName, format)
  }
}

function resolveCollectionIconUrl(
  context: IconUrlContext,
  variantName: string | null,
  format: string
): string {
  const filename = variantName || context.baseIconName
  return `${context.baseUrl}/${format}/${filename}.${format}`
}

function resolveCommunityIconUrl(
  context: IconUrlContext,
  variantName: string | null,
  format: string
): string | null {
  const formatExt = format === "svg" ? "svg" : format === "png" ? "png" : "webp"
  
  if (!variantName) {
    // Base icon: return mainIconUrl or find by format
    if (context.mainIconUrl?.toLowerCase().endsWith(`.${formatExt}`)) {
      return context.mainIconUrl
    }
    return context.assetUrls?.find(url => 
      url.toLowerCase().endsWith(`.${formatExt}`)
    ) || context.mainIconUrl || null
  }
  
  // Variant: find by matching variant filename in assetUrls
  // variantName is the filename (without extension) from metadata
  return context.assetUrls?.find(url => {
    const urlFilename = url.split('/').pop()?.replace(/\.[^.]+$/, '') || ''
    return urlFilename.includes(variantName) && url.toLowerCase().endsWith(`.${formatExt}`)
  }) || null
}
```

**Benefits**:
- Single source of truth for URL resolution
- Easy to test and maintain
- Can be reused by both collection and community pages
- Handles edge cases in one place

### 4. Unified Variant Rendering

**Refactor `IconDetails` Component**:

Instead of hardcoded sections, create a unified variant rendering system that:
- Uses `getVariantDefinition()` to get metadata for each variant
- Renders preset variants with their defined icons and labels
- Renders custom variants with generated default metadata
- Groups variants by category (regular variants vs wordmark variants)
- Sorts variants (preset first, then custom alphabetically)

```typescript
import { getVariantDefinition, groupVariantsByCategory } from "@/lib/variant-definitions"

// Get all variant names from iconData
const allVariants = Object.keys(iconData.variants || {})
const allWordmarkVariants = Object.keys(iconData.wordmark || {})

// Sort: preset variants first, then custom variants alphabetically
const sortedVariants = allVariants.sort((a, b) => {
  const aDef = getVariantDefinition(a)
  const bDef = getVariantDefinition(b)
  if (aDef.preset && !bDef.preset) return -1
  if (!aDef.preset && bDef.preset) return 1
  return a.localeCompare(b)
})

const sortedWordmarkVariants = allWordmarkVariants.sort((a, b) => {
  const aDef = getVariantDefinition(`wordmark-${a}`)
  const bDef = getVariantDefinition(`wordmark-${b}`)
  if (aDef.preset && !bDef.preset) return -1
  if (!aDef.preset && bDef.preset) return 1
  return a.localeCompare(b)
})

// Render all variants dynamically
{sortedVariants.map((variantName) => {
  const variantDef = getVariantDefinition(variantName)
  const variantFilename = iconData.variants[variantName]
  
  return (
    <IconVariantsSection
      key={variantName}
      title={variantDef.label}
      description={variantDef.description}
      iconElement={<variantDef.icon className="w-4 h-4" />}
      availableFormats={availableFormats}
      icon={variantFilename || icon}
      iconData={iconData}
      handleCopy={handleCopyUrl}
      handleDownload={handleDownload}
      copiedVariants={copiedVariants}
      renderVariant={renderVariant}
    />
  )
})}

// Similar for wordmark variants...
```

**Updated `renderVariant` Function**:

```typescript
const renderVariant = (
  format: string, 
  variantFilename: string | null,  // null for base icon
  variantKey: string
) => {
  const imageUrl = resolveIconUrl(urlContext, variantFilename, format)
  if (!imageUrl) return null  // Handle missing variants gracefully
  
  const githubUrl = !isCommunityIcon && variantFilename
    ? `${REPO_PATH}/tree/main/${format}/${variantFilename}.${format}`
    : ""
  
  // ... rest of rendering logic
}
```

**Benefits**:
- Single rendering path for all variants
- Automatically handles custom variants
- No hardcoded variant names
- Works for both collection and community icons

### 4. Enhanced Submission Form

**Dynamic Variant Management**:

1. **Preset Variants**: Keep quick-select options for common variants (`default`, `light`, `dark`, `wordmark-default`, `wordmark-light`, `wordmark-dark`)

2. **Custom Variants**: Add UI to:
   - Enter custom variant name (with validation: alphanumeric, hyphens, underscores)
   - Select variant type (regular variant or wordmark)
   - Upload file for that variant
   - Remove custom variants

3. **Updated Submission Payload**:
   ```typescript
   {
     aliases: string[],
     categories: string[],
     base: string,
     variants?: { [variantName: string]: string },  // New format
     wordmark?: { [variantName: string]: string },  // New format
     // Keep old format for backward compatibility during migration
     colors?: { light?: string; dark?: string },
     wordmark?: { light?: string; dark?: string }
   }
   ```

4. **Asset Index Tracking**: Instead of hardcoded index tracking, use a mapping:
   ```typescript
   // After upload, create a map of original filename -> sanitized filename
   const filenameMap = new Map<string, string>()
   value.files.base?.[0] && filenameMap.set(value.files.base[0].name, record.assets[0])
   // ... track all files
   
   // Then update extras by looking up in map
   Object.keys(extras.variants || {}).forEach(variantName => {
     const originalFilename = extras.variants[variantName]
     const sanitizedFilename = filenameMap.get(originalFilename)
     if (sanitizedFilename) {
       extras.variants[variantName] = sanitizedFilename
     }
   })
   ```

### 5. Enhanced Import Script

**Dynamic Target Building**:

```typescript
function buildTargets(submission: Submission): VariantTarget[] {
  const iconId = submission.name
  const ext = inferBase(submission.assets, submission.extras?.base)
  
  const targets: VariantTarget[] = [
    { key: "base", destFilename: `${iconId}.${ext}` }
  ]
  
  // Handle new variants format
  const variants = submission.extras?.variants || {}
  Object.entries(variants).forEach(([variantName, filename]) => {
    if (filename) {
      targets.push({
        key: variantName,
        destFilename: `${iconId}-${variantName}.${ext}`,
        exactFilename: filename as string
      })
    }
  })
  
  // Handle wordmark variants
  const wordmarkVariants = submission.extras?.wordmark || {}
  Object.entries(wordmarkVariants).forEach(([variantName, filename]) => {
    if (filename) {
      targets.push({
        key: `wordmark-${variantName}`,
        destFilename: `${iconId}-wordmark-${variantName}.${ext}`,
        exactFilename: filename as string
      })
    }
  })
  
  // Migration: Support old colors format
  if (submission.extras?.colors && !submission.extras?.variants) {
    if (submission.extras.colors.light) {
      targets.push({
        key: "light",
        destFilename: `${iconId}-light.${ext}`,
        exactFilename: submission.extras.colors.light
      })
    }
    if (submission.extras.colors.dark) {
      targets.push({
        key: "dark",
        destFilename: `${iconId}-dark.${ext}`,
        exactFilename: submission.extras.colors.dark
      })
    }
  }
  
  return targets
}
```

**Dynamic Metadata Building**:

```typescript
function buildMetadataVariants(assignments: VariantTarget[]): {
  variants?: IconVariants
  wordmark?: IconVariants
} {
  const variants: IconVariants = {}
  const wordmark: IconVariants = {}
  
  for (const v of assignments) {
    if (!v.sourceAsset) continue
    
    const baseName = v.destFilename.replace(/\.[^.]+$/, "")
    
    if (v.key === "base") {
      // Base icon, skip (handled separately)
      continue
    } else if (v.key.startsWith("wordmark-")) {
      // Wordmark variant: extract variant name
      const variantName = v.key.replace("wordmark-", "")
      wordmark[variantName] = baseName
    } else {
      // Regular variant
      variants[v.key] = baseName
    }
  }
  
  return {
    variants: Object.keys(variants).length ? variants : undefined,
    wordmark: Object.keys(wordmark).length ? wordmark : undefined
  }
}
```

### 6. Updated Community Library

**Enhanced Transformation**:

The `transformGalleryToIcon` function in `web/src/lib/community.ts` needs to handle the new variant structure:

```typescript
function transformGalleryToIcon(item: CommunityGallery): any {
  // ... existing code ...
  
  // Process variants (new format) or colors (old format for migration)
  const variants = item.extras?.variants ? { ...item.extras.variants } : undefined
  if (variants && item.assets) {
    Object.keys(variants).forEach((key) => {
      variants[key] = findBestMatchingAsset(variants[key], item.assets || [])
    })
  }
  
  // Migration: Convert colors to variants if needed
  const colors = item.extras?.colors ? { ...item.extras.colors } : undefined
  if (colors && item.assets && !variants) {
    // Convert old format to new format
    const migratedVariants: IconVariants = {}
    Object.keys(colors).forEach((key) => {
      const matched = findBestMatchingAsset(colors[key]!, item.assets || [])
      migratedVariants[key] = matched
    })
    // Use migrated variants
    Object.assign(variants || {}, migratedVariants)
  }
  
  // Similar logic for wordmark
  const wordmark = item.extras?.wordmark ? { ...item.extras.wordmark } : undefined
  if (wordmark && item.assets) {
    Object.keys(wordmark).forEach((key) => {
      wordmark[key] = findBestMatchingAsset(wordmark[key]!, item.assets || [])
    })
  }
  
  return {
    // ... existing fields ...
    variants: variants,
    wordmark: wordmark,
    // Keep old format for backward compatibility
    colors: colors,
  }
}
```

## Implementation Plan

### Phase 1: Variant Definitions & Type System
1. Create `web/src/lib/variant-definitions.ts` with preset variant definitions
2. Update `web/src/types/icons.ts` with new `IconVariants` type
3. Create `web/src/lib/icon-url-resolver.ts` with unified URL resolution
4. Add migration support for old `colors` format

### Phase 2: Display Components
1. Refactor `IconDetails` to use `getVariantDefinition()` for all variants
2. Update variant rendering to handle both preset and custom variants
3. Create unified `VariantSection` component that works with variant definitions
4. Update `renderVariant` to use new URL resolver
5. Update technical details section to show all variants dynamically
6. Ensure custom variants get appropriate default styling and labels

### Phase 3: Submission Form
1. Add UI for custom variant management (text input + file upload)
2. Update form state to handle arbitrary variants
3. Refactor submission payload building to create `variants` array
4. Ensure variant array order matches asset array order (base at 0, variants start at 1)
5. Validate variant names (alphanumeric, hyphens, underscores)

### Phase 4: Import Script
1. Refactor `buildTargets()` to handle `variants` array format
2. Refactor `buildMetadataVariants()` to build `variants` and `wordmark` objects from assignments
3. Add migration logic to convert old `colors`/`wordmark` format to `variants` array
4. Test with various variant combinations (preset and custom)

### Phase 5: Community Library
1. Update `transformGalleryToIcon()` to convert `variants` array to display format
2. Map variant array indices to asset array indices (variants[i] → assets[i+1])
3. Add migration logic to convert old `colors`/`wordmark` format to `variants` array
4. Ensure backward compatibility with old format

### Phase 6: Metadata Pages
1. Update `web/src/app/icons/[icon]/page.tsx` metadata generation
2. Update `web/src/app/community/[icon]/page.tsx` metadata generation
3. Include all variants in OpenGraph/Twitter metadata

### Phase 7: Testing & Migration
1. Test with existing icons (backward compatibility)
2. Test with new variant structures
3. Test edge cases (missing variants, malformed data)
4. Update documentation

## Sub-Task: Wordmark Icon Customizer Support

### Current Limitation

The icon customizer (`IconCustomizerInline`) currently only works with base icons. The `getSvgUrl()` function in `IconDetails` only checks for base icon or `colors.light`, and doesn't support wordmark variants.

### Proposed Solution

1. **Variant Selector UI**: Add a dropdown/selector in the icon details sidebar to choose which variant to customize:
   - Base icon
   - All regular variants (from `variants` object)
   - All wordmark variants (from `wordmark` object)

2. **Enhanced SVG URL Resolution**: Refactor `getSvgUrl()` to accept variant selection:
   ```typescript
   function getSvgUrl(
     iconData: Icon,
     variantType: 'base' | 'variant' | 'wordmark',
     variantName?: string
   ): string | null {
     const context = buildIconUrlContext(iconData, icon)
     
     if (variantType === 'base') {
       return resolveIconUrl(context, null, 'svg')
     } else if (variantType === 'variant' && variantName) {
       const normalized = normalizeIconVariants(iconData)
       const filename = normalized.variants?.[variantName]
       return filename ? resolveIconUrl(context, filename, 'svg') : null
     } else if (variantType === 'wordmark' && variantName) {
       const normalized = normalizeIconVariants(iconData)
       const filename = normalized.wordmark?.[variantName]
       return filename ? resolveIconUrl(context, filename, 'svg') : null
     }
     
     return null
   }
   ```

3. **Customizer Component Updates**: 
   - Update `IconCustomizerInline` to accept variant selection
   - Ensure customizer works with all variant types
   - Preserve variant-specific styling when applicable

### Implementation Tasks

- [ ] Add variant selector UI to icon details page
- [ ] Refactor `getSvgUrl` to support variant selection
- [ ] Update `IconCustomizerInline` to handle variant URLs
- [ ] Test customizer with base, variant, and wordmark icons
- [ ] Update customizer to preserve variant-specific styling when applicable

## Testing Requirements

1. **Backward Compatibility**: All existing icons must continue to work with old `colors` format
2. **New Variants**: Test with custom variant names (e.g., `monochrome`, `outline`, `branded`)
3. **Edge Cases**:
   - Icons with no variants
   - Icons with only custom variants
   - Icons with mixed preset and custom variants
   - Malformed variant data
   - Missing variant files
   - Community icons with mismatched filenames
4. **Wordmark Customizer**: Test customizer with all wordmark variants
5. **URL Resolution**: Test URL resolution for both collection and community icons with all variant types

## Breaking Changes

⚠️ **Note**: This feature will introduce breaking changes to the metadata structure. A migration strategy must be implemented to support both old and new formats during a transition period. The system should:

1. Read both old and new formats
2. Normalize to new format internally
3. Write new format when updating metadata
4. Provide migration script to convert existing metadata.json

## Code Reuse Benefits

By implementing unified utilities and components:

1. **Single URL Resolution Logic**: Both collection and community pages use the same `resolveIconUrl()` function
2. **Unified Variant Rendering**: Same rendering logic for all variants, regardless of source
3. **Consistent Behavior**: Collection and community icons behave identically from user perspective
4. **Easier Maintenance**: Changes to variant handling only need to be made in one place
5. **Better Testing**: Utilities can be unit tested independently

## PocketBase Database Schema Changes

### Current Problem

Currently, the `extras` JSON field stores variant references as **filenames** in nested objects, which creates a fragile system:

**Current Structure** (from your example):
```json
{
  "wordmark": {
    "dark": "broadcom_logo_dark_sasr6cj9gt.svg",
    "light": "broadcom_logo_cci1fr7y81.svg"
  }
}
```

**Problems**:
1. PocketBase sanitizes filenames when uploading, so the original filename doesn't match the stored filename
2. The code must use fragile filename matching logic (see [`findBestMatchingAsset`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/lib/community.ts#L24-L53))
3. Asset order tracking is fragile (see [asset index tracking](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/components/advanced-icon-submission-form-tanstack.tsx#L194-L226))
4. Hardcoded structure prevents custom variants
5. No separation between variant names and asset references

### Proposed Solution: Simple Variants Array

Store variant names as a **simple array of text strings** in the `extras` field. The order of variants in the array corresponds to the order of assets (after the base icon at index 0).

**New `extras` Format**:
```json
{
  "aliases": ["VMware", "Brocade", "Symantec"],
  "base": "svg",
  "categories": ["cloud", "security", "network", "storage"],
  "variants": ["light", "dark", "wordmark-light", "wordmark-dark"]
}
```

**How it works**:
- Base icon is always at `assets[0]`
- First variant in array (`"light"`) corresponds to `assets[1]`
- Second variant (`"dark"`) corresponds to `assets[2]`
- Third variant (`"wordmark-light"`) corresponds to `assets[3]`
- And so on...

**For custom variants**:
```json
{
  "variants": ["light", "dark", "monochrome", "outline", "wordmark-light", "wordmark-dark"]
}
```

### Variant Definitions File

Create a new TypeScript file that defines preset variants and their metadata:

**File**: `web/src/lib/variant-definitions.ts`

```typescript
import { FileImage, FileType, Moon, Sun, Type } from "lucide-react"

export interface VariantDefinition {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: "variant" | "wordmark"
  preset: true  // Marks this as a preset variant
}

export const PRESET_VARIANTS: Record<string, VariantDefinition> = {
  "default": {
    id: "default",
    label: "Default",
    description: "Default icon variant",
    icon: FileImage,
    category: "variant",
    preset: true
  },
  "light": {
    id: "light",
    label: "Light Theme",
    description: "Icon optimized for light backgrounds",
    icon: Sun,
    category: "variant",
    preset: true
  },
  "dark": {
    id: "dark",
    label: "Dark Theme",
    description: "Icon optimized for dark backgrounds",
    icon: Moon,
    category: "variant",
    preset: true
  },
  "wordmark-default": {
    id: "wordmark-default",
    label: "Wordmark Default",
    description: "Wordmark variant with default styling",
    icon: Type,
    category: "wordmark",
    preset: true
  },
  "wordmark-light": {
    id: "wordmark-light",
    label: "Wordmark Light",
    description: "Wordmark optimized for light backgrounds",
    icon: Type,
    category: "wordmark",
    preset: true
  },
  "wordmark-dark": {
    id: "wordmark-dark",
    label: "Wordmark Dark",
    description: "Wordmark optimized for dark backgrounds",
    icon: Type,
    category: "wordmark",
    preset: true
  }
}

/**
 * Get variant definition for a variant name
 * Returns preset definition if exists, or generates a default one for custom variants
 */
export function getVariantDefinition(variantName: string): VariantDefinition {
  if (PRESET_VARIANTS[variantName]) {
    return PRESET_VARIANTS[variantName]
  }
  
  // Generate default definition for custom variants
  const isWordmark = variantName.startsWith("wordmark-")
  const category = isWordmark ? "wordmark" : "variant"
  const displayName = variantName
    .replace(/^wordmark-/, "")
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
  
  return {
    id: variantName,
    label: isWordmark ? `Wordmark ${displayName}` : displayName,
    description: `Custom ${category} variant: ${variantName}`,
    icon: isWordmark ? Type : FileImage,
    category,
    preset: false
  }
}

/**
 * Check if a variant is a preset variant
 */
export function isPresetVariant(variantName: string): boolean {
  return variantName in PRESET_VARIANTS
}

/**
 * Get all variants grouped by category
 */
export function groupVariantsByCategory(variants: string[]): {
  variants: string[]
  wordmark: string[]
} {
  const result = { variants: [] as string[], wordmark: [] as string[] }
  
  variants.forEach(variant => {
    if (variant.startsWith("wordmark-")) {
      result.wordmark.push(variant)
    } else {
      result.variants.push(variant)
    }
  })
  
  return result
}
```

### Implementation Details

#### 1. Update Submission Form

The submission form needs to track which variants are selected and store them as an array.

**Current Code** ([`web/src/components/advanced-icon-submission-form-tanstack.tsx`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/components/advanced-icon-submission-form-tanstack.tsx#L149-226)):

The form currently builds nested objects. We need to change it to build a simple array.

**New Code**:
```typescript
const handleConfirmedSubmit = async () => {
  const value = form.state.values
  setShowConfirmDialog(false)

  try {
    const assetFiles: File[] = []
    const variantNames: string[] = []

    // Base icon is always first
    if (value.files.base?.[0]) {
      assetFiles.push(value.files.base[0])
    }

    // Track variant order: must match asset order
    // Order: light, dark, then wordmark variants
    if (value.files.light?.[0]) {
      variantNames.push("light")
      assetFiles.push(value.files.light[0])
    }
    
    if (value.files.dark?.[0]) {
      variantNames.push("dark")
      assetFiles.push(value.files.dark[0])
    }

    // Add custom variants in order they were added
    Object.keys(value.files).forEach(variantId => {
      if (variantId !== "base" && variantId !== "light" && variantId !== "dark" && 
          variantId !== "wordmark" && variantId !== "wordmark_dark") {
        // Custom variant
        if (value.files[variantId]?.[0]) {
          variantNames.push(variantId)
          assetFiles.push(value.files[variantId][0])
        }
      }
    })

    // Wordmark variants
    if (value.files.wordmark?.[0]) {
      variantNames.push("wordmark-light")
      assetFiles.push(value.files.wordmark[0])
    }
    
    if (value.files.wordmark_dark?.[0]) {
      variantNames.push("wordmark-dark")
      assetFiles.push(value.files.wordmark_dark[0])
    }

    // Build extras with simple variants array
    const extras = {
      aliases: value.aliases,
      categories: value.categories,
      base: value.files.base[0]?.name.split(".").pop() || "svg",
      variants: variantNames  // Simple array of variant names
    }

    const submissionData = {
      name: value.iconName,
      assets: assetFiles,
      created_by: (pb.authStore.record as any)?.id ?? pb.authStore.record?.id,
      status: "pending",
      description: value.description,
      extras: extras,
    }

    const record = await pb.collection("submissions").create(submissionData)
    
    // No need to update extras after upload - variants array is already correct!
    // The order of variants matches the order of assets (base at 0, variants start at 1)

    // Revalidate Next.js cache
    await revalidateAllSubmissions()
    // ... rest of submission logic
  }
}
```

#### 2. Update Community Library

The `transformGalleryToIcon` function needs to convert the variants array to the display format.

**Current Code** ([`web/src/lib/community.ts`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/lib/community.ts#L60-114)):

**New Code**:
```typescript
function transformGalleryToIcon(item: CommunityGallery): any {
  const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090"

  const mainIcon = item.assets?.[0] ? `${pbUrl}/api/files/community_gallery/${item.id}/${item.assets[0]}` : ""
  const mainAssetExt = item.assets?.[0]?.split(".").pop()?.toLowerCase() || "svg"
  const baseFormat = mainAssetExt === "svg" ? "svg" : mainAssetExt === "png" ? "png" : "webp"

  // Convert variants array to display format
  // variants array: ["light", "dark", "wordmark-light"]
  // assets array: [base, light_file, dark_file, wordmark_light_file]
  // So variants[i] corresponds to assets[i+1]
  
  const variantsArray = item.extras?.variants || []
  const variants: Record<string, string> = {}
  const wordmark: Record<string, string> = {}
  
  variantsArray.forEach((variantName: string, index: number) => {
    const assetIndex = index + 1  // +1 because base is at index 0
    if (item.assets && assetIndex < item.assets.length) {
      const assetFilename = item.assets[assetIndex]
      
      if (variantName.startsWith("wordmark-")) {
        const wordmarkName = variantName.replace("wordmark-", "")
        wordmark[wordmarkName] = assetFilename
      } else {
        variants[variantName] = assetFilename
      }
    }
  })

  // Migration: Support old format (colors/wordmark objects)
  if (variantsArray.length === 0) {
    // Fall back to old format for backward compatibility
    const colors = item.extras?.colors ? { ...item.extras.colors } : undefined
    if (colors && item.assets) {
      Object.keys(colors).forEach((key) => {
        const k = key as keyof typeof colors
        if (colors[k]) {
          variants[k] = findBestMatchingAsset(colors[k]!, item.assets || [])
        }
      })
    }
    
    const oldWordmark = item.extras?.wordmark ? { ...item.extras.wordmark } : undefined
    if (oldWordmark && item.assets) {
      Object.keys(oldWordmark).forEach((key) => {
        const k = key as keyof typeof wordmark
        if (oldWordmark[k]) {
          wordmark[k] = findBestMatchingAsset(oldWordmark[k]!, item.assets || [])
        }
      })
    }
  }

  const transformed = {
    name: item.name,
    status: item.status,
    data: {
      base: mainIcon || "svg",
      baseFormat,
      mainIconUrl: mainIcon,
      assetUrls: item.assets?.map((asset) => `${pbUrl}/api/files/community_gallery/${item.id}/${asset}`) || [],
      aliases: item.extras?.aliases || [],
      categories: item.extras?.categories || [],
      update: {
        timestamp: item.created,
        author: {
          id: 0,
          name: item.created_by || "Community",
          login: item.created_by || undefined,
          github_id: item.created_by_github_id,
        },
      },
      variants: Object.keys(variants).length > 0 ? variants : undefined,
      wordmark: Object.keys(wordmark).length > 0 ? wordmark : undefined,
      // Keep old format for backward compatibility
      colors: Object.keys(variants).length > 0 ? variants : undefined,
    },
  }

  return transformed
}
```

#### 3. Update Display Components

The `IconDetails` component needs to use the variant definitions file to render both preset and custom variants.

**Current Code** ([`web/src/components/icon-details.tsx`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/components/icon-details.tsx#L713-755)):

**New Code**:
```typescript
import { getVariantDefinition, groupVariantsByCategory } from "@/lib/variant-definitions"

// In IconDetails component:
const normalizedVariants = iconData.variants || iconData.colors || {}
const normalizedWordmark = iconData.wordmark || {}

// Get all variant names
const allVariants = Object.keys(normalizedVariants)
const allWordmarkVariants = Object.keys(normalizedWordmark)

// Group and sort: preset variants first, then custom variants
const sortedVariants = allVariants.sort((a, b) => {
  const aDef = getVariantDefinition(a)
  const bDef = getVariantDefinition(b)
  if (aDef.preset && !bDef.preset) return -1
  if (!aDef.preset && bDef.preset) return 1
  return a.localeCompare(b)
})

const sortedWordmarkVariants = allWordmarkVariants.sort((a, b) => {
  const aDef = getVariantDefinition(`wordmark-${a}`)
  const bDef = getVariantDefinition(`wordmark-${b}`)
  if (aDef.preset && !bDef.preset) return -1
  if (!aDef.preset && bDef.preset) return 1
  return a.localeCompare(b)
})

// Render all variants dynamically
{sortedVariants.map((variantName) => {
  const variantDef = getVariantDefinition(variantName)
  const variantFilename = normalizedVariants[variantName]
  
  return (
    <IconVariantsSection
      key={variantName}
      title={variantDef.label}
      description={variantDef.description}
      iconElement={<variantDef.icon className="w-4 h-4" />}
      availableFormats={availableFormats}
      icon={variantFilename || icon}
      iconData={iconData}
      handleCopy={handleCopyUrl}
      handleDownload={handleDownload}
      copiedVariants={copiedVariants}
      renderVariant={renderVariant}
    />
  )
})}

// Similar for wordmark variants...
```

#### 4. Update Type Definitions

**Update** [`web/src/lib/pb.ts`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/lib/pb.ts#L25-L37):

```typescript
extras: {
  aliases: string[]
  categories: string[]
  base?: string
  // New format: simple array of variant names
  variants?: string[]  // e.g., ["light", "dark", "wordmark-light", "monochrome"]
  // Keep old format for backward compatibility during migration
  colors?: {
    dark?: string
    light?: string
  }
  wordmark?: {
    dark?: string
    light?: string
  }
}
```

#### 5. Update Import Script

The import script needs to convert the variants array to metadata format.

**Update** [`scripts/import-icon.ts`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/scripts/import-icon.ts):

```typescript
function buildTargets(submission: Submission): VariantTarget[] {
  const iconId = submission.name
  const ext = inferBase(submission.assets, submission.extras?.base)

  const targets: VariantTarget[] = [
    { key: "base", destFilename: `${iconId}.${ext}` },
  ]

  // Handle new format: variants array
  const variantsArray = submission.extras?.variants || []
  
  variantsArray.forEach((variantName: string, index: number) => {
    const assetIndex = index + 1  // +1 because base is at index 0
    if (assetIndex < submission.assets.length) {
      const assetFilename = submission.assets[assetIndex]
      
      targets.push({
        key: variantName,
        destFilename: `${iconId}-${variantName}.${ext}`,
        exactFilename: assetFilename,
      })
    }
  })

  // Migration: Support old format
  if (variantsArray.length === 0) {
    // Fall back to old colors/wordmark format
    if (submission.extras?.colors?.light) {
      targets.push({
        key: "light",
        destFilename: `${iconId}-light.${ext}`,
        exactFilename: submission.extras.colors.light,
      })
    }
    // ... similar for dark, wordmark variants
  }

  return targets
}

function buildMetadataVariants(assignments: VariantTarget[]): {
  variants?: IconVariants
  wordmark?: IconVariants
} {
  const variants: IconVariants = {}
  const wordmark: IconVariants = {}

  for (const v of assignments) {
    if (!v.sourceAsset || v.key === "base") continue

    const baseName = v.destFilename.replace(/\.[^.]+$/, "")

    if (v.key.startsWith("wordmark-")) {
      const wordmarkName = v.key.replace("wordmark-", "")
      wordmark[wordmarkName] = baseName
    } else {
      variants[v.key] = baseName
    }
  }

  return {
    variants: Object.keys(variants).length > 0 ? variants : undefined,
    wordmark: Object.keys(wordmark).length > 0 ? wordmark : undefined,
  }
}
```

### Benefits of This Approach

1. **Simplicity**: Just an array of strings - no complex nested structures
2. **Flexibility**: Can store any variant name, preset or custom
3. **Order Preservation**: Array order directly maps to asset order
4. **Type Safety**: Variant definitions file provides type safety and metadata
5. **Separation of Concerns**: Variant metadata (labels, icons) separate from data storage
6. **Easy Migration**: Old format can be converted to array format easily
7. **No Filename Matching**: Direct index mapping eliminates fragile matching

### Migration Strategy

1. **Dual Format Support**: Code handles both old format (colors/wordmark objects) and new format (variants array)
2. **Migration on Read**: Convert old format to new format when reading from database
3. **Migration Script**: Optional batch script to convert existing submissions:
   ```typescript
   // For each submission:
   // 1. Read extras.colors and extras.wordmark (old format)
   // 2. Build variants array: ["light", "dark", "wordmark-light", "wordmark-dark"]
   // 3. Update extras.variants = [...]
   ```
4. **New Submissions**: Always use new format (variants array)

## References

- Type definitions: [`web/src/types/icons.ts`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/types/icons.ts)
- PocketBase types: [`web/src/lib/pb.ts`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/lib/pb.ts#L14-L42)
- Variant definitions: `web/src/lib/variant-definitions.ts` (new file to create)
- Icon display component: [`web/src/components/icon-details.tsx`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/components/icon-details.tsx)
- Submission form: [`web/src/components/advanced-icon-submission-form-tanstack.tsx`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/components/advanced-icon-submission-form-tanstack.tsx)
- Filename matching logic: [`web/src/lib/community.ts`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/lib/community.ts#L24-L53)
- Import script: [`scripts/import-icon.ts`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/scripts/import-icon.ts)
- Community library: [`web/src/lib/community.ts`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/lib/community.ts)
- API library: [`web/src/lib/api.ts`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/lib/api.ts)
- Metadata pages: 
  - [`web/src/app/icons/[icon]/page.tsx`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/app/icons/[icon]/page.tsx)
  - [`web/src/app/community/[icon]/page.tsx`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/app/community/[icon]/page.tsx)
- Customizer components:
  - [`web/src/components/icon-customizer-inline.tsx`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/components/icon-customizer-inline.tsx)
  - [`web/src/components/icon-customizer.tsx`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/src/components/icon-customizer.tsx)
- PocketBase migration: [`web/backend/pb_migrations/1759312839_created_submission.js`](https://github.com/homarr-labs/dashboard-icons/blob/2aefb5cde0b8f9a4ee54b430218dd718a15efa0a/web/backend/pb_migrations/1759312839_created_submission.js)
