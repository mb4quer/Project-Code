import { z } from 'zod';
import type { Files } from '../contracts';

/** IDs and paths are stable so saved learner progress can survive content revisions. */
export const StableIdSchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, 'must be a stable kebab-case ID');
export const ContentStatusSchema = z.enum(['draft', 'published']);
export const FilesSchema: z.ZodType<Files> = z.record(z.string());

export const ActivityKindSchema = z.enum(['reading', 'guided-coding']);
export const BehaviorValidationSchema = z.object({ observable: z.string().min(1), checks: z.array(z.string().min(1)).min(1) });

/** Draft activities may be outline-only. Published activities carry runnable teaching material. */
export const ActivitySchema = z.object({
  id: StableIdSchema, path: z.string().regex(/^projects\/[^/]+\/topics\/[^/]+\/activities\/[^/]+$/), title: z.string().min(1), kind: ActivityKindSchema, order: z.number().int().positive(), objective: z.string().min(1), outline: z.string().min(1), estimatedMinutes: z.number().int().positive().optional(),
  explanation: z.string().min(1).optional(), instructions: z.array(z.string().min(1)).min(1).optional(), starterFiles: FilesSchema.optional(), validation: BehaviorValidationSchema.optional(), hints: z.array(z.string().min(1)).min(1).optional(), referenceSolution: FilesSchema.optional(),
});

export const BlankKindSchema = z.enum(['conceptual', 'code']);
export const AnswerNormalizationSchema = z.object({ trim: z.literal(true), collapseWhitespace: z.boolean(), caseSensitive: z.boolean(), lineEndings: z.literal('lf') });
export const BlankSchema = z.object({ id: StableIdSchema, path: z.string().regex(/^projects\/[^/]+\/topics\/[^/]+\/blanks\/[^/]+$/), kind: BlankKindSchema, prompt: z.string().min(1), acceptedAnswers: z.array(z.string().min(1)).min(1), explanation: z.string().min(1), normalization: AnswerNormalizationSchema });

export const QuestionReasoningCategorySchema = z.enum(['prediction', 'debugging', 'explanation', 'application']);
export const AssessmentQuestionSchema = z.object({
  id: StableIdSchema, path: z.string().regex(/^projects\/[^/]+\/topics\/[^/]+\/questions\/[^/]+$/), prompt: z.string().min(1), kind: z.enum(['conceptual', 'code']), reasoningCategory: QuestionReasoningCategorySchema, equivalenceGroup: StableIdSchema.optional(), acceptedAnswers: z.array(z.string().min(1)).min(1), misconceptionFeedback: z.string().min(1), reviewed: z.boolean(), identity: StableIdSchema,
});

export const ChallengeSchema = z.object({
  id: StableIdSchema, path: z.string().regex(/^projects\/[^/]+\/topics\/[^/]+\/challenges\/[^/]+$/), title: z.string().min(1), order: z.number().int().positive(), objective: z.string().min(1), starterFiles: FilesSchema, instructions: z.array(z.string().min(1)).min(1), examples: z.array(z.string().min(1)).min(1), behaviorValidation: BehaviorValidationSchema, hints: z.array(z.string().min(1)).min(1), reference: z.array(StableIdSchema).min(1),
  /** Draft challenges can omit this; published challenges must provide a reviewable solution. */
  referenceSolution: FilesSchema.optional(),
});

export const GateSchema = z.object({
  type: z.literal('topic-gate'), guidedActivityIds: z.array(StableIdSchema).min(1), requiredChallengeIds: z.array(StableIdSchema).length(3), minimumDistinctCorrectQuestionIds: z.literal(10), revealedAnswerEarnsCredit: z.literal(false), requiresFreshEquivalentAfterReveal: z.literal(true), wrongAnswerResetsProgress: z.literal(false),
  /** Do not retry a missed item until all currently eligible unseen items have been offered. */
  retryPolicy: z.literal('exhaust-unseen-before-missed'),
});

export const TopicSchema = z.object({ id: StableIdSchema, path: z.string().regex(/^projects\/[^/]+\/topics\/[^/]+$/), projectId: StableIdSchema, title: z.string().min(1), order: z.number().int().positive(), status: ContentStatusSchema, summary: z.string().min(1), prerequisiteTopicIds: z.array(StableIdSchema), activities: z.array(ActivitySchema).min(1), blanks: z.array(BlankSchema), assessmentQuestions: z.array(AssessmentQuestionSchema), challenges: z.array(ChallengeSchema), gate: GateSchema });
export const ProjectSchema = z.object({ id: StableIdSchema, path: z.string().regex(/^projects\/[^/]+$/), title: z.string().min(1), order: z.number().int().positive(), status: ContentStatusSchema, description: z.string().min(1), prerequisiteProjectIds: z.array(StableIdSchema), topicIds: z.array(StableIdSchema).min(1) });
export const ProgressionSchema = z.object({ minimumDistinctCorrectQuestionIds: z.literal(10), revealedAnswerEarnsCreditOnSameId: z.literal(false), freshEquivalentRequiredAfterReveal: z.literal(true), wrongAnswerResetsProgress: z.literal(false), retryOrder: z.literal('exhaust-unseen-before-missed') });
export const CurriculumSchema = z.object({ id: StableIdSchema, title: z.string().min(1), prerequisiteKnowledge: z.array(z.string().min(1)).min(1), version: z.literal(1), status: ContentStatusSchema, projects: z.array(ProjectSchema).min(1), topics: z.array(TopicSchema).min(1), progression: ProgressionSchema });

export type StableId = z.infer<typeof StableIdSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type Blank = z.infer<typeof BlankSchema>;
export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;
export type Challenge = z.infer<typeof ChallengeSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Curriculum = z.infer<typeof CurriculumSchema>;
export const ContentSchema = CurriculumSchema;
export const curriculumSchema = CurriculumSchema;
