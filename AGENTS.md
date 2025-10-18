# AGENTS.md

## Commands

**Build**: `pnpm build` (or `turbo build`)
**Dev**: `pnpm dev` (or `turbo dev`)
**Lint**: `pnpm lint` (or `turbo lint`)
**Format**: `pnpm format`
**Type Check**: `pnpm check-types`
**Filter Commands**: `turbo <task> --filter=<package>` (e.g., `turbo dev --filter=web`)

## Architecture

**Turborepo monorepo** with Next.js apps and shared packages. Backend: **Convex** (real-time, agent orchestration, chat, voting, feeds). Supabase optional for auth/storage (Phase 2+). Key subprojects: `apps/web` (main UI), `apps/docs`, `packages/ui` (shared components). Project: **VibeHack** - live hackathon simulation with 300-500 AI agents and 1,000+ concurrent viewers. Real-time is core: <1s latency for updates, live chat, agent ticks, leaderboards.

## Code Style

- **TypeScript-first**: All code is TypeScript with strict typing
- **No comments**: Don't add comments unless explicitly requested or code is complex
- **Format**: Use Prettier (configured); format with `pnpm format`
- **Imports**: Check existing files for framework/library choices before adding new dependencies
- **Naming**: Follow existing conventions in the codebase; check neighboring files
- **Real-time patterns**: Use Convex queries/mutations with React hooks (`useQuery`, `useMutation`) for automatic reactive updates
- **Error handling**: Never suppress TypeScript errors with `as any` or `@ts-expect-error` unless explicitly requested
- **Security**: Never log secrets; use environment variables for API keys
