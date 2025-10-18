/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentExecution from "../agentExecution.js";
import type * as agents from "../agents.js";
import type * as artifacts from "../artifacts.js";
import type * as crons from "../crons.js";
import type * as lib_agents_builder from "../lib/agents/builder.js";
import type * as lib_agents_communicator from "../lib/agents/communicator.js";
import type * as lib_agents_index from "../lib/agents/index.js";
import type * as lib_agents_planner from "../lib/agents/planner.js";
import type * as lib_agents_reviewer from "../lib/agents/reviewer.js";
import type * as lib_llmProvider from "../lib/llmProvider.js";
import type * as lib_orchestration_graphExecution from "../lib/orchestration/graphExecution.js";
import type * as lib_orchestration_index from "../lib/orchestration/index.js";
import type * as lib_orchestration_orchestrator from "../lib/orchestration/orchestrator.js";
import type * as lib_orchestration_types from "../lib/orchestration/types.js";
import type * as lib_orchestration_workDetection from "../lib/orchestration/workDetection.js";
import type * as messages from "../messages.js";
import type * as orchestration from "../orchestration.js";
import type * as project_ideas from "../project_ideas.js";
import type * as testData from "../testData.js";
import type * as todos from "../todos.js";
import type * as traces from "../traces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  agentExecution: typeof agentExecution;
  agents: typeof agents;
  artifacts: typeof artifacts;
  crons: typeof crons;
  "lib/agents/builder": typeof lib_agents_builder;
  "lib/agents/communicator": typeof lib_agents_communicator;
  "lib/agents/index": typeof lib_agents_index;
  "lib/agents/planner": typeof lib_agents_planner;
  "lib/agents/reviewer": typeof lib_agents_reviewer;
  "lib/llmProvider": typeof lib_llmProvider;
  "lib/orchestration/graphExecution": typeof lib_orchestration_graphExecution;
  "lib/orchestration/index": typeof lib_orchestration_index;
  "lib/orchestration/orchestrator": typeof lib_orchestration_orchestrator;
  "lib/orchestration/types": typeof lib_orchestration_types;
  "lib/orchestration/workDetection": typeof lib_orchestration_workDetection;
  messages: typeof messages;
  orchestration: typeof orchestration;
  project_ideas: typeof project_ideas;
  testData: typeof testData;
  todos: typeof todos;
  traces: typeof traces;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agentWorkpool: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
        },
        any
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        {
          before?: number;
          limit?: number;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
        },
        any
      >;
      enqueue: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism: number;
          };
          fnArgs: any;
          fnHandle: string;
          fnName: string;
          fnType: "action" | "mutation" | "query";
          onComplete?: { context?: any; fnHandle: string };
          retryBehavior?: {
            base: number;
            initialBackoffMs: number;
            maxAttempts: number;
          };
          runAt: number;
        },
        string
      >;
      enqueueBatch: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism: number;
          };
          items: Array<{
            fnArgs: any;
            fnHandle: string;
            fnName: string;
            fnType: "action" | "mutation" | "query";
            onComplete?: { context?: any; fnHandle: string };
            retryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            runAt: number;
          }>;
        },
        Array<string>
      >;
      status: FunctionReference<
        "query",
        "internal",
        { id: string },
        | { previousAttempts: number; state: "pending" }
        | { previousAttempts: number; state: "running" }
        | { state: "finished" }
      >;
      statusBatch: FunctionReference<
        "query",
        "internal",
        { ids: Array<string> },
        Array<
          | { previousAttempts: number; state: "pending" }
          | { previousAttempts: number; state: "running" }
          | { state: "finished" }
        >
      >;
    };
  };
};
