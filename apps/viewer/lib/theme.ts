export const AGENT_COLORS = {
  planner: "#00d4ff",
  builder: "#00ff41",
  reviewer: "#ff6b6b",
  communicator: "#ffd700",
} as const;

export const SCORE_COLORS = {
  gold: "#ffd700",
  silver: "#c0c0c0",
  bronze: "#cd7f32",
} as const;

export const ACCENT_COLORS = {
  primary: "#00ff41",
  secondary: "#00d4ff",
  tertiary: "#ff6b6b",
  quaternary: "#ffd700",
} as const;

export type AgentType = keyof typeof AGENT_COLORS;
export type ScoreTier = keyof typeof SCORE_COLORS;

