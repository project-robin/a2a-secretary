import { defineCatalog, defineSchema } from "@json-render/core";
import { z } from "zod";

export const agentSchema = defineSchema((s) => ({
  spec: s.object({
    root: s.string(),
    elements: s.record(s.any()),
  }),
  catalog: s.record(s.any()),
}));

// @ts-ignore
export const agentCatalog = defineCatalog(agentSchema, {
  ConfirmationCard: {
    props: z.object({
      title: z.string(),
      description: z.string(),
      confirmationId: z.string(),
      options: z.array(
        z.object({ label: z.string(), value: z.string() })
      ),
    }),
    actions: {
      onConfirm: z.object({ value: z.string() }),
    },
  },

  TaskCard: {
    props: z.object({
      title: z.string(),
      status: z.enum(["pending", "in_progress", "done"]),
      description: z.optional(z.string()),
      participants: z.optional(z.array(z.string())),
    }),
    actions: {
      onComplete: z.object({}),
    },
  },

  TimeProposal: {
    props: z.object({
      title: z.string(),
      options: z.array(
        z.object({
          date: z.string(),
          time: z.string(),
          availability: z.number(),
        })
      ),
    }),
    actions: {
      onSelect: z.object({ date: z.string(), time: z.string() }),
    },
  },

  StatusUpdate: {
    props: z.object({
      title: z.string(),
      items: z.array(
        z.object({
          agent: z.string(),
          status: z.enum(["waiting", "responded", "confirmed", "declined"]),
          message: z.optional(z.string()),
        })
      ),
    }),
  },

  ContactCard: {
    props: z.object({
      name: z.string(),
      handle: z.string(),
      bio: z.optional(z.string()),
      agentUrl: z.string(),
    }),
    actions: {
      onConnect: z.object({}),
    },
  },

  MemoryCard: {
    props: z.object({
      key: z.string(),
      value: z.string(),
      source: z.string(),
    }),
    actions: {
      onForget: z.object({ key: z.string() }),
    },
  },
});
