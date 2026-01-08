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
- **User authentication** - Sign in with email/password or GitHub OAuth
- **Submit icons** - Authenticated users can submit new icons to the collection
- **Admin dashboard** - Admins can approve, reject, and manage icon submissions

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript v5** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Reusable components built with Radix UI and Tailwind
- **PocketBase** - Backend for authentication and data storage
- **PostHog** - Product analytics and user tracking

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
   NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
   ```
4. **Configure GitHub OAuth (Optional):**
   
   To enable GitHub OAuth login, you need to create a GitHub OAuth App and configure it in PocketBase:

   a. Create a GitHub OAuth App:
      - Go to GitHub Settings → Developer settings → OAuth Apps → New OAuth App
      - Set Application name: "Dashboard Icons" (or your preferred name)
      - Set Homepage URL: `http://localhost:3000` (for development)
      - Set Authorization callback URL: `http://localhost:8090/api/oauth2-redirect`
      - After creation, note the **Client ID** and generate a **Client Secret**

   b. Configure PocketBase OAuth:
      - Start PocketBase: `pnpm run backend:start`
      - Open PocketBase admin UI at `http://127.0.0.1:8090/_/`
      - Navigate to Settings → Auth providers
      - Enable GitHub provider and enter your Client ID and Client Secret
      - Save the settings

   c. For production deployment:
      - Update the Authorization callback URL to: `https://pb.dashboardicons.com/api/oauth2-redirect`
      - Configure the same OAuth settings in your production PocketBase instance

5. Start the development server:
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
