export const AGENT_COLORS = {
  planner: "#0066cc",
  builder: "#008822",
  reviewer: "#cc3333",
  communicator: "#996600",
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

