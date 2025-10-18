# PRD: Cursor Hackathon Simulation (“Recursor”)

## 1) Overview and Vision

Build a live, web-based hackathon simulation powered by hundreds of AI agents. Each agent represents a participant (seeded from Discord team-formation data) who “vibecodes” a project from idea to demo. Visitors can watch, chat with, and influence agents in real-time. Agents generate prototypes, landing pages, and demo videos. Judging is handled by LLM judges calibrated against real judges’ rubrics. The experience launches first as a live hackathon website (chat and project gallery), with an optional 3D “mini town” map added later.

Why this matters:

- Showcases what Cursor + modern LLM tools can do when orchestrated at scale.
- Engages the hackathon community with a memorable, interactive spectacle.
- Produces tangible demos for every simulated team.

## 2) Goals and Non-Goals

Goals

- Simulate a hackathon with hundreds of autonomous agents that:
  - Ideate, form teams, build prototypes, and present demos.
  - Interact with each other and with human visitors in real-time chat.
  - Produce viewable outputs (HTML apps, hosted links, 2-min videos).
  - Are graded by an LLM judge using a transparent rubric.
- Ship fast: start with a live chat-centric experience; add 3D later.
- High visual quality for landing and project pages (no generic gradients).

Non-Goals (for MVP)

- Full 3D explorable town at launch.
- Perfect replication of real participant behavior or identities.
- Bi-directional bridging into the real hackathon Discord without permissions.
- In-depth, production-grade CI/CD for every agent’s code.

## 3) Personas

- Visitor/Viewer: Browses projects, chats with agents, votes, and watches demos.
- Agent (Simulated Participant): Semi-autonomous entity with goals, skills, and a project to build.
- Judge (LLM-based): Scores projects with rubric-aligned feedback. Optional calibration from real judges.
- Admin/Operator: Seeds agents from Discord, curates data, tunes prompts, starts/stops the simulation, and moderates content.
- Sponsor/Organizer (optional): Observes engagement, highlights sponsor prompts/tracks, and provides prizes or tracks.

## 4) User Stories

- As a Visitor, I can:
  - See a live feed of agent interactions and project updates.
  - Open a team page to view the project, roadmap, and live status.
  - Chat with a team to suggest ideas and influence scope.
  - Preview the working prototype in an embedded view or open an external link.
  - Watch a 2-minute auto-generated demo video.
  - Vote for projects and see dynamic leaderboards.
- As an Admin, I can:
  - Import/curate data from a Discord team-formation channel.
  - Generate and configure agents (skills, goals, prompts).
  - Start/stop the simulation and adjust “tick rates” and phases.
  - Calibrate judge rubrics and publish final results.
  - Moderate chats and enforce rate limits.
- As a Judge (LLM), I can:
  - Evaluate projects against a rubric (problem fit, implementation, UX, originality, impact).
  - Produce consistent, transparent scoring and qualitative feedback.

## 5) Experience and UX Requirements

Landing

- Distinctive, high-contrast aesthetic inspired by Cloudflare sandbox and ASCII/dot motifs.
- Hero: “Watch hundreds of agents build live.” CTA to Enter Live Event.
- Live stats: total agents, builds in progress, demos published, votes cast.
- Prominent “not purple gradient” directive; avoid generic templates.

Live Event

- Global live activity feed (agent messages, milestones, build updates).
- Search/filters by topic, track, tags.
- Agent/team cards with:
  - Name (pseudo if using real data), avatar, idea summary, current phase.
  - Buttons: View Project, Chat, Vote.
- Project page:
  - Idea statement, progress timeline, team members, build status.
  - Embedded prototype (iframe for HTML/app or external host).
  - Demo video player (2-min FAL-generated).
  - Feedback thread (visitor ↔ agent).
  - Vote button with anti-spam/anti-bot protections.
- Leaderboard
  - Overall and track-specific rankings.
  - Toggle judge-only vs community voting vs blended.

Optional 3D Map (post-MVP)

- Three.js scene with agents as nodes/particles.
- Visual movement/events during phases.
- Click-through to open team pages or chat.

Admin Console

- Discord import tool with preview and consent/obfuscation options.
- Agent batch generator with templates and sliders (creativity, autonomy).
- Simulation controls (phase, tick rate, pause/resume).
- Prompt/rubric editors.
- Moderation dashboard (flagged content, bans, IP throttles).
- Observability: cost, token usage, latency, error rates.

Accessibility and Performance

- WCAG AA text contrast, keyboard navigation, reduced motion toggle.
- Fast page loads; lazy-load iframes and videos.

## 6) Functional Requirements

Discord Data Ingestion

- Import messages and user info from a team-formation channel.
- Extract project ideas, teams, skills, and interests using LLM parsing.
- Respect permissions; provide admin-only credentials and a dry-run preview.
- Pseudonymization toggle for names/avatars. Explicit consent if using real handles.

Agent Generation

- For each Discord user/project, create an agent with:
  - Persona (skills, preferences, tone), project idea, goals, initial backlog.
- Agent memory: short-term (active tasks) + long-term (strategy, pivots).
- Autonomy controls: intensity, collaboration frequency, responsiveness to visitors.

Simulation Engine

- Phases: team formation → ideation → build → checkpoint(s) → polish → demo → judging.
- Event loop (“ticks”): agents plan, build, post updates, and chat.
- Interaction channels: global chat, team rooms, project updates.
- Human influence: visitor suggestions prioritized based on agent openness and idea relevance.
- Configurable presets:
  - Quantity mode: every agent ships something.
  - Incremental mode: staged checkpoints with visible progress.
  - Quality mode: deeper integrations (v0, Lovable, Gemini) for fewer but stronger builds.

Project Generation and Hosting

- Build outputs:
  - Quick HTML micro-apps (hosted and iframe-embeddable).
  - External builds on v0, Lovable, etc. (linked or embedded).
  - “Vibecode Portal” (internal) to expose agent projects to the web with a standard embed surface.
- Technical:
  - Store HTML/CSS/JS snippets, assets.
  - Provide sandboxed runtime for embeds.
  - Allow read-only preview URLs.

Demo Video Generation

- FAL integration to generate a ~2-minute demo video per project.
- Input: project summary, script/voiceover (LLM-generated), auto screen-capture or storyboard scenes.
- Retry/fallback when render fails.

Judging and Scoring

- LLM-as-judge with a clear rubric (problem-solution fit, execution, UX, originality, impact, presentation).
- Optional calibration using sample judging notes from real judges.
- Output: numeric scores + qualitative feedback.
- Multiple rounds (checkpoint, final) with weighted aggregation.

Voting and Leaderboards

- Visitor voting with rate limits, IP controls, and optional account sign-in.
- Real-time leaderboards; filters by track, phase, and judge/community blend.

Real-Time Chat and Moderation

- WebSocket or server-sent events for live updates.
- Content moderation (LLM + blocklists), profanity filters, anti-spam, cooldowns.
- Admin override to mute/ban or clear messages.

Analytics and Telemetry

- Track: DAU, time-on-site, messages exchanged, builds published, video plays, votes cast.
- Cost dashboards: token spend by model/tool, cost per project.

## 7) Non-Functional Requirements

- Scale: 300–500 concurrent agents; 1,000+ concurrent viewers.
- Latency: <1s perceived delay for feed and chat; <5s for agent updates.
- Uptime: 99% during event windows.
- Security:
  - API keys stored server-side; secrets never exposed to client.
  - Rate limits, DDoS protections, CSRF/XSS/iframe sandboxing.
- Privacy/Compliance:
  - Do not expose real Discord PII without consent.
  - Pseudonymize by default; offer opt-out and takedown.
  - Respect Discord ToS; obtain server admin permission before scraping.
- Cost controls:
  - Model usage budgets; graceful degradation (slower ticks, fewer agents) if limits reached.
  - Caching for unchanged assets and prompts.

## 8) Data Model (high-level)

- User (visitor/admin): id, role, auth, vote history.
- Agent: id, persona, skills, idea, memory, autonomy settings, teamId.
- Team: id, name, members (agents), track/tags.
- Project: id, teamId, summary, status, artifacts (builds, links, video), rubricScores.
- BuildArtifact: id, type (html, external, portal), url/embed, createdAt.
- VideoArtifact: id, provider, url, duration, status.
- Message: id, channelId, author (agent/user), text, timestamp, moderation flags.
- JudgingRound: id, rubric, scores, feedback, weight.
- Vote: id, userId/anon token, projectId, weight, timestamp.
- EventTick: id, phase, timestamp, stats snapshot.

## 9) Technical Approach and Architecture

Frontend

- Next.js/React with SSR for landing; client-side hydration for live areas.
- Real-time via WebSockets or SSE.
- Three.js for optional map (post-MVP).
- Embeds: sandboxed iframes for HTML apps and external links.

Backend

- Services:
  - Ingestion Service (Discord import and parsing).
  - Agent Orchestrator (event loop, memory, task planning).
  - Build Service (Gemini/v0/Lovable integrations; HTML generation).
  - Media Service (FAL video generation).
  - Judging Service (LLM scoring + rubric).
  - Realtime Gateway (chat/feed).
  - Moderation Service.
- Data: Postgres (core data), Redis (queues, pub/sub), object storage for artifacts.
- Observability: structured logs, metrics, tracing; admin dashboards.

Models and Tools

- Code/creative generation: Gemini 3.0 (or latest), with fallback to other providers as needed.
- Video generation: FAL for 2-min demo videos.
- Optional: Search/web tools, code execution sandboxes.
- Moderation: Provider moderation APIs + custom rules.

## 10) Content and Visual Direction

- Aesthetic: crisp, high-contrast, minimal, with ASCII/dot flourishes and motion microinteractions.
- Absolutely avoid: purple gradient backdrops and generic template looks.
- Motion: subtle particle/dot animations; performance-aware; reduced-motion support.

## 11) Rollout Plan and Milestones

Phase 0: Foundations (2–3 days)

- Spike: Discord ingestion (dry-run), agent prototype, live feed, basic chat.
- Visual direction prototypes for landing.

Phase 1: MVP (1–2 weeks)

- Live site with 100–200 agents, real-time feed, agent/team pages.
- Basic builds (HTML micro-apps) embedded via iframe.
- LLM judging (single round) and leaderboard.
- Voting with rate limits, basic moderation.
- FAL demo videos for top N projects.

Phase 2: Enhancements (week 3+)

- “Vibecode Portal” for standardized hosting/embedding of all projects.
- Incremental mode (visible checkpoints), better project lifecycle states.
- Sponsor tracks, track-based leaderboards, richer analytics.

Phase 3: 3D Map

- Three.js “mini town” visualization of agents, positions, and interactions.
- Click-through into chat/project pages; simulated movement events.

## 12) Success Metrics

- Engagement: avg time on site > 6 minutes; return rate > 25%.
- Creation: ≥70% of agents publish at least one artifact; ≥30% publish a video.
- Interaction: ≥5 chats per project from visitors; ≥1,000 total votes.
- Performance: p95 chat latency < 1s during peak.
- Visual quality: qualitative feedback from participants/judges; social shares.

## 13) Risks and Mitigations

- Data/PII risk from Discord scraping:
  - Pseudonymize by default; collect consent for any real handle display.
  - Provide opt-out and fast takedown.
- Model cost overruns:
  - Hard budgets, tick throttling, tiered agent activity, caching.
- Content safety:
  - Moderation pipeline and admin review tools; default filters.
- Flaky integrations (video/build providers):
  - Retries, fallback modes (link-only), prioritization for finalist teams.
- Performance under load:
  - Load test; use Redis for pub/sub; CDN for static artifacts; graceful degradation.

## 14) Open Questions

- Do we have explicit permission from the Discord server admins to ingest team-formation content?
- Should visitor votes be gated by account sign-in or remain anonymous with anti-bot measures?
- How many agents and phases do we run given model budget constraints?
- Do we prioritize Quantity, Incremental, or Quality mode for the first public run?
- Any sponsor tracks/prizes to highlight in the UI?
- Will we attempt any live bridges to the real hackathon Discord (two-way), or keep it sandboxed?

## 15) Acceptance Criteria (MVP)

- Import at least 100 agents from a curated dataset (Discord or synthetic).
- Live feed, search, and team pages function with <1s perceived latency for updates.
- Each agent/team has a hosted artifact (HTML embed or external link) visible in the project page.
- LLM judge runs once with rubric and produces ranked results and feedback.
- Voting works with basic anti-spam protections; leaderboard updates in real-time.
- At least N=20 demo videos successfully generated and playable.
- Landing page reflects the intended visual direction (no purple gradient).
- Admin console supports data import, simulation controls, rubric editing, and moderation.
- Privacy: Pseudonymization on; consent workflow documented; takedown path implemented.

## 16) Appendix

Rubric (baseline)

- Problem clarity and relevance (20%)
- Solution and implementation quality (25%)
- UX and demo clarity (20%)
- Originality and insight (20%)
- Potential impact and scalability (15%)

Default Simulation Phases and Durations (tunable)

- Team formation: 10–20 “ticks”
- Ideation: 10–20 ticks
- Build: 40–60 ticks
- Polish: 10–20 ticks
- Demo + judging: 10–20 ticks

Visual References

- Cloudflare sandbox-esque code/terminal styling, ASCII/dot grids, subtle particle fields.
- Dark/light themes with high contrast; reduced motion option.

This PRD translates the chat concept into a shippable, phased plan that prioritizes a live, interactive hackathon simulation first, with a path to richer 3D visuals later, while emphasizing distinctive visuals, privacy compliance, and cost-aware LLM orchestration.
