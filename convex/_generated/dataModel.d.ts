import { GenericId } from "convex/values";

export type DataModel = {
  agent_stacks: {
    document: {
      _id: GenericId<"agent_stacks">;
      _creationTime: number;
      participant_name: string;
      phase: string;
      created_at: number;
    };
    fieldPaths:
      | "_id"
      | "_creationTime"
      | "participant_name"
      | "phase"
      | "created_at";
    indexes: {};
    searchIndexes: {};
    vectorIndexes: {};
  };
  agent_states: {
    document: {
      _id: GenericId<"agent_states">;
      _creationTime: number;
      stack_id: GenericId<"agent_stacks">;
      agent_type: string;
      memory: {
        facts: string[];
        learnings: string[];
      };
      current_context: {
        active_task?: string;
        recent_messages: string[];
        focus?: string;
      };
      updated_at: number;
    };
    fieldPaths:
      | "_id"
      | "_creationTime"
      | "stack_id"
      | "agent_type"
      | "memory"
      | "memory.facts"
      | "memory.learnings"
      | "current_context"
      | "current_context.active_task"
      | "current_context.recent_messages"
      | "current_context.focus"
      | "updated_at";
    indexes: {
      by_stack: {
        stack_id: GenericId<"agent_stacks">;
      };
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  project_ideas: {
    document: {
      _id: GenericId<"project_ideas">;
      _creationTime: number;
      stack_id: GenericId<"agent_stacks">;
      title: string;
      description: string;
      status: string;
      created_by: string;
      created_at: number;
    };
    fieldPaths:
      | "_id"
      | "_creationTime"
      | "stack_id"
      | "title"
      | "description"
      | "status"
      | "created_by"
      | "created_at";
    indexes: {
      by_stack: {
        stack_id: GenericId<"agent_stacks">;
      };
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  todos: {
    document: {
      _id: GenericId<"todos">;
      _creationTime: number;
      stack_id: GenericId<"agent_stacks">;
      content: string;
      status: string;
      assigned_by: string;
      priority: number;
      created_at: number;
      completed_at?: number;
    };
    fieldPaths:
      | "_id"
      | "_creationTime"
      | "stack_id"
      | "content"
      | "status"
      | "assigned_by"
      | "priority"
      | "created_at"
      | "completed_at";
    indexes: {
      by_stack: {
        stack_id: GenericId<"agent_stacks">;
      };
      by_status: {
        stack_id: GenericId<"agent_stacks">;
        status: string;
      };
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  messages: {
    document: {
      _id: GenericId<"messages">;
      _creationTime: number;
      from_stack_id: GenericId<"agent_stacks">;
      to_stack_id?: GenericId<"agent_stacks">;
      from_agent_type: string;
      content: string;
      message_type: string;
      read_by: GenericId<"agent_stacks">[];
      created_at: number;
    };
    fieldPaths:
      | "_id"
      | "_creationTime"
      | "from_stack_id"
      | "to_stack_id"
      | "from_agent_type"
      | "content"
      | "message_type"
      | "read_by"
      | "created_at";
    indexes: {
      by_recipient: {
        to_stack_id: GenericId<"agent_stacks">;
      };
      by_sender: {
        from_stack_id: GenericId<"agent_stacks">;
      };
      broadcasts: {
        message_type: string;
      };
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  artifacts: {
    document: {
      _id: GenericId<"artifacts">;
      _creationTime: number;
      stack_id: GenericId<"agent_stacks">;
      type: string;
      version: number;
      content?: string;
      url?: string;
      metadata: {
        description?: string;
        tech_stack?: string[];
        build_time_ms?: number;
      };
      created_at: number;
    };
    fieldPaths:
      | "_id"
      | "_creationTime"
      | "stack_id"
      | "type"
      | "version"
      | "content"
      | "url"
      | "metadata"
      | "metadata.description"
      | "metadata.tech_stack"
      | "metadata.build_time_ms"
      | "created_at";
    indexes: {
      by_stack: {
        stack_id: GenericId<"agent_stacks">;
      };
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  agent_traces: {
    document: {
      _id: GenericId<"agent_traces">;
      _creationTime: number;
      stack_id: GenericId<"agent_stacks">;
      agent_type: string;
      thought: string;
      action: string;
      result?: any;
      timestamp: number;
    };
    fieldPaths:
      | "_id"
      | "_creationTime"
      | "stack_id"
      | "agent_type"
      | "thought"
      | "action"
      | "result"
      | "timestamp";
    indexes: {
      by_stack: {
        stack_id: GenericId<"agent_stacks">;
      };
      by_time: {
        timestamp: number;
      };
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
};

export type Id<TableName extends keyof DataModel> = GenericId<TableName>;
