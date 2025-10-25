# PRPM Web Application

Simple Next.js web application for PRPM (Prompt Package Manager).

## Current Features

- **Author Invite Claims** - Authors can claim their verified username using invite tokens
- **GitHub OAuth** - Seamless authentication via GitHub
- **Responsive Design** - Mobile-friendly Tailwind CSS UI

## Getting Started

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_REGISTRY_URL=http://localhost:3000
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Pages

### Home (`/`)
- Hero section with gradient PRPM branding
- Feature showcase (1,500+ packages, 16 collections, etc.)
- Quick start CLI commands
- Supported AI tools (Cursor, Claude, Continue, Windsurf)
- Links to GitHub, top authors, and claim invite

### Top Authors (`/authors`)
- Leaderboard of top package contributors
- Displays rank, package count, downloads, and verified status
- Medal icons for top 3 authors (🥇🥈🥉)
- Stats summary (total authors, packages, downloads)
- CTA to claim verified author status
- Responsive table layout

### Claim Invite (`/claim`)
- Form to enter invite token
- Redirects to token-specific claim page

### Claim Token (`/claim/:token`)
- Validates invite token
- Shows invite details (username, package count, message)
- GitHub OAuth integration for claiming
- Success confirmation page

### Auth Callback (`/auth/callback`)
- Handles GitHub OAuth redirect
- Stores JWT token in localStorage
- Redirects to intended destination

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React** - UI library

## API Integration

The webapp connects to the PRPM registry API:

- `GET /api/v1/invites/:token` - Validate invite
- `POST /api/v1/invites/:token/claim` - Claim invite (authenticated)
- `GET /api/v1/auth/github` - Start GitHub OAuth
- `GET /api/v1/auth/me` - Get current user

## Folder Structure

```
src/
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── page.tsx       # OAuth callback handler
│   ├── claim/
│   │   ├── [token]/
│   │   │   └── page.tsx       # Claim specific token
│   │   └── page.tsx           # Enter token form
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page
├── components/                # Reusable components (future)
└── lib/
    └── api.ts                 # API client functions
```

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables (Production)

```bash
NEXT_PUBLIC_REGISTRY_URL=https://registry.prpm.dev
```

### Deployment Platforms

- **Vercel** - Recommended (zero-config)
- **Netlify** - Easy setup
- **Docker** - Custom hosting

## License

MIT
