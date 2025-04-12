# Dashboard Icons Web App

A web application to browse, search, and download icons from the [Dashboard Icons](https://github.com/homarr-labs/dashboard-icons) collection.

## Features

- Browse through a curated collection of beautiful dashboard icons
- Search icons by name, aliases, or categories
- View icon details including author, formats, and variants
- Download icons in different formats (SVG, PNG, WebP)
- Copy icon URLs directly to your clipboard
- Responsive design that works on mobile, tablet, and desktop
- Dark mode support

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript v5** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Reusable components built with Radix UI and Tailwind

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   └── icons/            # Icons browsing and detail pages
│   │       ├── [icon]/       # Dynamic icon detail page
│   │       │   ├── components/   # Icon-specific components
│   │       │   ├── error.tsx     # Error handling
│   │       │   ├── loading.tsx   # Loading state
│   │       │   └── page.tsx      # Icon detail page
│   │       ├── components/       # Icons page components
│   │       ├── loading.tsx       # Loading state
│   │       └── page.tsx          # Icons browse page
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Homepage
│   └── theme-provider.tsx    # Theme provider component
├── components/               # Shared components
│   ├── ui/                   # UI components (from shadcn/ui)
│   ├── header.tsx            # App header
│   └── theme-switcher.tsx    # Theme switcher
├── lib/                      # Utility functions
│   ├── api.ts                # API utilities
│   └── utils.ts              # General utilities
└── types/                    # TypeScript type definitions
    ├── icons.ts              # Icon-related types
    └── index.ts              # Type exports
```

## Development

### Prerequisites

- Node.js 18+ 
- pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a `.env` file with the following variables:
   ```
   GITHUB_TOKEN=your_github_token
   ```
4. Start the development server:
   ```bash
   pnpm dev
   ```

### Build

```bash
pnpm build
```

### Deployment

The application is optimized for deployment on Vercel.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
