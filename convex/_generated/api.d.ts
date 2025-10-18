import type {
  FunctionReference,
} from "convex/server";

export declare const api: {
  agents: {
    createStack: FunctionReference<"mutation", "public", { participant_name: string }, any>;
    listStacks: FunctionReference<"query", "public", {}, any>;
    getStack: FunctionReference<"query", "public", { stackId: any }, any>;
    updateAgentState: FunctionReference<"mutation", "public", any, any>;
    getAgentState: FunctionReference<"query", "public", any, any>;
    updatePhase: FunctionReference<"mutation", "public", any, any>;
  };
  artifacts: {
    create: FunctionReference<"mutation", "public", any, any>;
    getLatest: FunctionReference<"query", "public", any, any>;
    list: FunctionReference<"query", "public", any, any>;
    getByVersion: FunctionReference<"query", "public", any, any>;
  };
  messages: {
    send: FunctionReference<"mutation", "public", any, any>;
    getBroadcasts: FunctionReference<"query", "public", any, any>;
    getDirectMessages: FunctionReference<"query", "public", any, any>;
    markAsRead: FunctionReference<"mutation", "public", any, any>;
    getTimeline: FunctionReference<"query", "public", any, any>;
  };
  project_ideas: {
    create: FunctionReference<"mutation", "public", any, any>;
    get: FunctionReference<"query", "public", any, any>;
    list: FunctionReference<"query", "public", any, any>;
    updateStatus: FunctionReference<"mutation", "public", any, any>;
    update: FunctionReference<"mutation", "public", any, any>;
  };
  todos: {
    create: FunctionReference<"mutation", "public", any, any>;
    list: FunctionReference<"query", "public", any, any>;
    getPending: FunctionReference<"query", "public", any, any>;
    updateStatus: FunctionReference<"mutation", "public", any, any>;
    remove: FunctionReference<"mutation", "public", any, any>;
  };
  traces: {
    log: FunctionReference<"mutation", "public", any, any>;
    list: FunctionReference<"query", "public", any, any>;
    getRecent: FunctionReference<"query", "public", any, any>;
    getByAgentType: FunctionReference<"query", "public", any, any>;
  };
};

export declare const internal: {
  agents: {
    createStack: FunctionReference<"mutation", "internal", { participant_name: string }, any>;
    listStacks: FunctionReference<"query", "internal", {}, any>;
    getStack: FunctionReference<"query", "internal", { stackId: any }, any>;
    updateAgentState: FunctionReference<"mutation", "internal", any, any>;
    getAgentState: FunctionReference<"query", "internal", any, any>;
    updatePhase: FunctionReference<"mutation", "internal", any, any>;
  };
  artifacts: {
    create: FunctionReference<"mutation", "internal", any, any>;
    getLatest: FunctionReference<"query", "internal", any, any>;
    list: FunctionReference<"query", "internal", any, any>;
    getByVersion: FunctionReference<"query", "internal", any, any>;
  };
  messages: {
    send: FunctionReference<"mutation", "internal", any, any>;
    getBroadcasts: FunctionReference<"query", "internal", any, any>;
    getDirectMessages: FunctionReference<"query", "internal", any, any>;
    markAsRead: FunctionReference<"mutation", "internal", any, any>;
    getTimeline: FunctionReference<"query", "internal", any, any>;
  };
  project_ideas: {
    create: FunctionReference<"mutation", "internal", any, any>;
    get: FunctionReference<"query", "internal", any, any>;
    list: FunctionReference<"query", "internal", any, any>;
    updateStatus: FunctionReference<"mutation", "internal", any, any>;
    update: FunctionReference<"mutation", "internal", any, any>;
  };
  todos: {
    create: FunctionReference<"mutation", "internal", any, any>;
    list: FunctionReference<"query", "internal", any, any>;
    getPending: FunctionReference<"query", "internal", any, any>;
    updateStatus: FunctionReference<"mutation", "internal", any, any>;
    remove: FunctionReference<"mutation", "internal", any, any>;
  };
  traces: {
    log: FunctionReference<"mutation", "internal", any, any>;
    list: FunctionReference<"query", "internal", any, any>;
    getRecent: FunctionReference<"query", "internal", any, any>;
    getByAgentType: FunctionReference<"query", "internal", any, any>;
  };
};
