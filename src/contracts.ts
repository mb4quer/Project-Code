import type { TrainingCapability, TrainingData } from './runtime/trainingStorage';
export type Files = Record<string, string>;
export type DemoId = 'vanilla' | 'react';
export interface Workspace { trainingData?: TrainingData; id: DemoId; files: Files; activeFile: string; version: number; updatedAt: string; checkpoint?: { files: Files; createdAt: string } }
export type LessonView = 'dashboard' | 'topic' | 'lab';
export interface LearningLocation { view: LessonView; projectId?: string; topicId?: string; stepId?: string; challengeId?: string }
export interface LessonWorkspace { trainingData?: TrainingData; files: Files; activeFile: string; version: number; updatedAt: string; checkpoint?: { files: Files; createdAt: string } }
export interface QuestionAttempt { questionId: string; identity: string; answer: string; correct: boolean; revealedBeforeAttempt: boolean; at: string }
export interface QuestionReveal { questionId: string; identity: string; at: string }
export interface BlankAttempt { blankId: string; answer: string; correct: boolean; at: string }
export interface ChallengeResult { challengeId: string; passed: boolean; at: string; message?: string; checks?: string[] }
export interface TopicLearningProgress {
  activityIds: string[];
  blankAttempts: Record<string, BlankAttempt[]>;
  questionAttempts: Record<string, QuestionAttempt[]>;
  reveals: QuestionReveal[];
  revealedQuestionIdentities: string[];
  creditedQuestionIds: string[];
  creditedQuestionIdentities: string[];
  challengeResults: Record<string, ChallengeResult>;
  challengeAttempts: Record<string, ChallengeResult[]>;
  lastMissQuestionId?: string;
  pendingEquivalentGroup?: string;
}
/** Optional so schema-1 snapshots saved by Phase 1 can be migrated without loss. */
export interface LearningSession { version: 1; location: LearningLocation; topics: Record<string, TopicLearningProgress>; projectWorkspaces: Record<string, LessonWorkspace>; challengeWorkspaces: Record<string, LessonWorkspace> }
export interface Session { schemaVersion: 1; revision: number; writerId: string; currentWorkspace: DemoId; workspaces: Record<DemoId, Workspace>; location: { projectId: string; topicId: string; activityId: string }; progress: { attempts: Record<string, unknown[]>; creditedQuestionIds: Record<string, string[]>; challengeResults: Record<string, unknown>; completedActivityIds: string[]; completedMilestoneIds: string[] }; learning?: LearningSession }
export interface RuntimeEvent { type: 'status' | 'console' | 'error'; level?: 'log' | 'info' | 'warn' | 'error'; message: string }
export interface RuntimeController { run(files: Files, storage?: TrainingCapability, weather?: { live?: import('./runtime/weatherApi').WeatherCapability }): Promise<void>; stop(): void; dispose(): void }
