const { z } = require('zod');
const { statuses, priorities } = require('../../domain/occurrenceTransitions');

const createSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(5).max(4000),
  category: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(300),
});

const filterSchema = z.object({
  category: z.string().trim().optional(),
  status: z.enum(statuses).optional(),
  priority: z.enum(priorities).optional(),
});

const commentSchema = z.object({ text: z.string().trim().min(1).max(2000) });
const prioritySchema = z.object({ priority: z.enum(priorities) });
const assigneeSchema = z.object({ assigneeId: z.uuid().nullable() });
const statusSchema = z.object({
  status: z.enum(statuses),
  observation: z.string().trim().min(2).max(500),
});
const solutionSchema = z.object({ solution: z.string().trim().min(2).max(4000) });
const evaluationSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).nullable().optional(),
});

module.exports = {
  createSchema,
  filterSchema,
  commentSchema,
  prioritySchema,
  assigneeSchema,
  statusSchema,
  solutionSchema,
  evaluationSchema,
};
