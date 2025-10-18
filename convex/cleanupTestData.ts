import { mutation } from "./_generated/server";

export const deleteExtraTeams = mutation({
  handler: async (ctx) => {
    const stacks = await ctx.db.query("agent_stacks").collect();
    
    if (stacks.length > 5) {
      const toDelete = stacks.slice(5);
      
      for (const stack of toDelete) {
        const agentStates = await ctx.db
          .query("agent_states")
          .withIndex("by_stack", (q) => q.eq("stack_id", stack._id))
          .collect();
        for (const state of agentStates) {
          await ctx.db.delete(state._id);
        }
        
        const projectIdeas = await ctx.db
          .query("project_ideas")
          .withIndex("by_stack", (q) => q.eq("stack_id", stack._id))
          .collect();
        for (const idea of projectIdeas) {
          await ctx.db.delete(idea._id);
        }
        
        const todos = await ctx.db
          .query("todos")
          .withIndex("by_stack", (q) => q.eq("stack_id", stack._id))
          .collect();
        for (const todo of todos) {
          await ctx.db.delete(todo._id);
        }
        
        await ctx.db.delete(stack._id);
      }
      
      return { deleted: toDelete.length, remaining: 5 };
    }
    
    return { deleted: 0, remaining: stacks.length };
  },
});

