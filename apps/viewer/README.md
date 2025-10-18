# Recursor Viewer

Pixel-art RPG-style UI for viewing the live hackathon simulation.

## Features

- **World Screen**: Interactive map view with clickable team areas
  - Hover animations on team areas
  - Real-time agent status display
  - Side panel with README, Chat, and Livestream tabs
  
- **Dashboard Screen**: Analytics and leaderboards
  - Real-time metrics (elapsed time, iterations, active agents)
  - Leaderboard with mock scores (gold/silver/bronze highlighting)
  - Progress chart showing team scores over time

## Setup

### 1. Install Dependencies

From the repository root:

```bash
pnpm install
```

### 2. Configure Convex

Create `.env.local` in this directory:

```bash
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
```

Get your Convex URL by running `npx convex dev` from the `packages/convex` directory.

### 3. Add Your Assets

Place your pixel-art assets in the `public/assets` directory:

- `public/assets/sprites/planner.png` (or .gif)
- `public/assets/sprites/builder.png` (or .gif)
- `public/assets/sprites/reviewer.png` (or .gif)
- `public/assets/sprites/communicator.png` (or .gif)
- `public/assets/map/background.png` (hackathon hall map)

If you don't have assets yet, the UI will fall back to showing the first letter of each agent type in colored boxes.

## Development

Run the development server:

```bash
pnpm dev
# or from repo root:
turbo dev --filter=viewer
```

The app will be available at http://localhost:3003

## Navigation

- **/** - World Screen (default)
- **/dashboard** - Dashboard Screen

## Tech Stack

- **Next.js 15.5** with App Router
- **React 19**
- **Convex** for real-time backend
- **Tailwind CSS 4** for styling
- **TypeScript** for type safety

## Styling

The UI uses a pixel-art aesthetic with:
- Custom CSS animations for hover effects
- Monospace fonts for retro feel
- High-contrast color palette
- Pixelated image rendering

See `app/globals.css` for the full style system.

## Real-Time Updates

All data is automatically synced via Convex queries:
- Team list and status
- Messages and chat
- Agent traces and activity
- Project ideas and todos

No manual refresh needed - the UI updates automatically when backend data changes.

## Mock Data

Currently, the following features use mock data:
- Team scores (random values 60-100)
- Progress chart (simulated progression)
- Iterations count (random per team)

These will be replaced with real scoring system once implemented in the backend.

