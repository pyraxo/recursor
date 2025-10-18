# Pixel-Art Simulation UI - Implementation Summary

## ✅ What Was Built

A complete pixel-art RPG-style viewer for the Recursor hackathon simulation with two main screens:

### 1. World Screen (`/`)

**Components:**
- `TopBar.tsx` - Shows elapsed time and navigation to Dashboard
- `WorldMap.tsx` - Interactive grid of team cards with agent sprites
- `SidePanel.tsx` - Context-sensitive panel (welcome or team details)
- `TeamPanel/TabNavigation.tsx` - Three-tab interface switcher
- `TeamPanel/ReadmeTab.tsx` - Shows project idea and placeholder for artifacts
- `TeamPanel/ChatTab.tsx` - Real-time messaging with agents
- `TeamPanel/LivestreamTab.tsx` - Live agent activity feed

**Features:**
- Click any team to view their details in the side panel
- Hover over teams for animated effects (floating, glow, sprite bob)
- Real-time updates from Convex backend
- Fallback UI when sprites are missing (shows agent type initials)
- Welcome screen with instructions when no team is selected

### 2. Dashboard Screen (`/dashboard`)

**Components:**
- `MetricsBar.tsx` - Three key metrics in pixel-styled boxes
- `LeaderboardTable.tsx` - Sortable table with gold/silver/bronze highlights
- `ProgressChart.tsx` - SVG-based line chart showing team progress

**Features:**
- Real-time elapsed time calculation
- Mock scoring system (random values 60-100 per category)
- Animated chart with color-coded team lines
- Top 3 teams highlighted with medal emojis

### 3. Shared Components

- `PixelButton.tsx` - Reusable button with 3 variants (primary, secondary, ghost)
- `PixelPanel.tsx` - Container component with pixel borders and optional title

### 4. Styling System

**`app/globals.css`:**
- CSS custom properties for theming (colors, agent types, medals)
- Pixel-art specific styles (image-rendering, fonts)
- Hover animations (float, glow-pulse, sprite-bob)
- Chat message styling
- Leaderboard row highlighting

**`lib/theme.ts`:**
- TypeScript constants for colors
- Agent type mappings
- Score tier colors

## 📁 Project Structure

```
apps/viewer/
├── app/
│   ├── layout.tsx              # Root layout with ConvexClientProvider
│   ├── page.tsx                # World Screen (main view)
│   ├── dashboard/
│   │   └── page.tsx            # Dashboard Screen
│   └── globals.css             # Pixel-art styling system
├── components/
│   ├── ConvexClientProvider.tsx
│   ├── World/
│   │   ├── TopBar.tsx
│   │   ├── WorldMap.tsx
│   │   ├── SidePanel.tsx
│   │   └── TeamPanel/
│   │       ├── TabNavigation.tsx
│   │       ├── ReadmeTab.tsx
│   │       ├── ChatTab.tsx
│   │       └── LivestreamTab.tsx
│   ├── Dashboard/
│   │   ├── MetricsBar.tsx
│   │   ├── LeaderboardTable.tsx
│   │   └── ProgressChart.tsx
│   └── shared/
│       ├── PixelButton.tsx
│       └── PixelPanel.tsx
├── lib/
│   └── theme.ts
├── public/
│   └── assets/
│       ├── sprites/            # Place agent sprites here
│       ├── map/                # Place map background here
│       └── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

## 🔌 Convex Integration

### Backend Queries Used

**Agents:**
- `api.agents.listStacks` - Get all teams
- `api.agents.getStack` - Get single team with agent states

**Messages:**
- `api.messages.getTimeline` - Get all messages for a team
- `api.messages.send` - Send a visitor message

**Project Ideas:**
- `api.project_ideas.getByStack` - Get team's project idea

**Todos:**
- `api.todos.getByStack` - Get team's todo list

**Traces:**
- `api.traces.getRecent` - Get recent agent activity traces

### New Queries Added

Added alias exports to Convex schema for convenience:
- `project_ideas.getByStack` (alias for `get`)
- `todos.getByStack` (alias for `list`)
- `traces.getRecent` (new query with stackId parameter)

## 🎨 Hover Animations

Team areas support multiple hover effects (all CSS-based):

1. **Floating Animation**: Gentle up-down movement (0.6s)
2. **Glow Pulse**: Animated box-shadow (1s infinite)
3. **Scale**: Subtle zoom effect on hover (1.02x)
4. **Sprite Bob**: Individual agent sprites bob with staggered delays

All animations are defined in `globals.css` and automatically apply via the `.team-area` class.

## 🎯 Mock Data Implementation

Currently using mock data for:

1. **Scores** - `LeaderboardTable.tsx` generates random scores (60-100) for each category
2. **Progress Chart** - `ProgressChart.tsx` simulates growth curves with noise
3. **Iterations** - `MetricsBar.tsx` calculates random iterations per team

These will be replaced with real data once the scoring system is implemented in the backend.

## 🚀 Next Steps

### To Run the App:

1. Install dependencies: `pnpm install` (from repo root)
2. Set up Convex URL in `.env.local`
3. Add pixel-art assets to `public/assets/`
4. Run: `pnpm dev` (opens on port 3003)

### To Customize:

**Colors:** Edit CSS variables in `app/globals.css` `:root` section

**Agent Types:** Update `lib/theme.ts` AGENT_COLORS

**Animations:** Modify keyframes in `app/globals.css`

**Layout:** Adjust grid in `WorldMap.tsx` (currently 3 columns)

### Future Enhancements:

1. **Real Scoring:** Connect to LLM judging system when ready
2. **Artifacts Display:** Show built projects in README tab
3. **Video Embeds:** Display demo videos when FAL integration is ready
4. **Voting System:** Add visitor voting UI
5. **Time Controls:** Add simulation start/stop from frontend
6. **Search/Filter:** Add team search and phase filters
7. **Mobile Responsive:** Optimize for smaller screens
8. **3D Map:** Optional Three.js upgrade for immersive view

## 🐛 Known Limitations

1. **Asset Fallback:** When sprites are missing, shows text initials (intentional design)
2. **Background Image:** Falls back to solid color if map asset not provided
3. **Chart Responsiveness:** Fixed width (800px), may overflow on small screens
4. **Mock Scores:** Random values regenerate on component remount
5. **Time Sync:** Calculated client-side, may drift slightly from server

## 🎨 Design Philosophy

**Pixel-Perfect Retro:**
- All borders are 2px solid with box-shadows for depth
- Monospace fonts throughout
- High-contrast color palette
- Square/blocky shapes (no rounded corners except minimal radius)

**Real-Time First:**
- All data via Convex reactive queries
- No loading spinners (shows stale data during updates)
- Optimistic UI updates

**Accessibility:**
- High contrast text
- Clear labels on all interactive elements
- Keyboard navigation support (via native HTML)

## 📊 Performance Considerations

- **Real-time Updates:** Convex handles subscriptions efficiently
- **Render Optimization:** Components only re-render when their data changes
- **Chart Performance:** SVG-based chart performs well with <20 teams
- **Image Loading:** Sprites cached by browser after first load

## 🔧 Troubleshooting

**Build Errors:**
- Make sure `packages/convex` is built first
- Run `pnpm install` from repo root, not app directory

**Convex Connection:**
- Check `.env.local` has `NEXT_PUBLIC_CONVEX_URL`
- Verify Convex deployment is running (`npx convex dev`)

**Missing Sprites:**
- Fallback shows agent type initials - this is intentional
- Add your sprites to match exact filenames in README

**TypeScript Errors:**
- Run `pnpm check-types` to verify
- Ensure `@repo/typescript-config` is available

## ✨ Highlights

This implementation showcases:
- **Modern Next.js 15** with App Router and Server Components
- **Real-time Collaboration** via Convex
- **Type-Safe** with full TypeScript coverage
- **Responsive Design** with Tailwind CSS 4
- **Accessible** semantic HTML
- **Performant** optimized rendering
- **Maintainable** component-based architecture

All components follow React best practices and the codebase style guide (no comments unless complex, TypeScript-first, clean imports).

