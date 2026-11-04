import { z } from "zod";

export const decisionSchema = z.object({
  branch: z.string().min(1),
  decision: z.string().min(1),
});

export const specSchema = z.object({
  title: z.string().min(1),
  problem: z.string().min(1),
  users: z.string().min(1),
  scope: z.string().min(1),
  openRisks: z.array(z.string().min(1)).min(1),
  nonGoals: z.array(z.string().min(1)).min(1),
});

export const turnSchema = z.object({
  branch: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  recommendation: z.string().min(1),
  answer: z.string().trim().min(1).max(2000),
  accepted: z.boolean(),
});

export const requestSchema = z.object({
  idea: z.string().trim().min(1).max(4000),
  turns: z.array(turnSchema).max(24),
});

export const stepSchema = z
  .object({
    status: z.enum(["question", "confirm", "spec"]),
    branch: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
    recommendation: z.string(),
    settled: z.array(decisionSchema),
    remaining: z.array(z.string().min(1)),
    spec: specSchema.nullable(),
  })
  .superRefine((step, ctx) => {
    if (step.status === "spec") {
      if (!step.spec) {
        ctx.addIssue({ code: "custom", message: "spec is required", path: ["spec"] });
      }
      return;
    }
    if (!step.recommendation.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "recommendation is required",
        path: ["recommendation"],
      });
    }
    if (step.spec) {
      ctx.addIssue({ code: "custom", message: "spec must be null", path: ["spec"] });
    }
  });

export type Decision = z.infer<typeof decisionSchema>;
export type Spec = z.infer<typeof specSchema>;
export type Turn = z.infer<typeof turnSchema>;
export type GrillRequest = z.infer<typeof requestSchema>;
export type GrillStep = z.infer<typeof stepSchema>;

export interface Progress {
  index: number;
  total: number;
  percent: number;
}

export interface SkillInfo {
  name: "grill-me";
  commit: string;
  files: string[];
}

export interface GrillPayload {
  step: GrillStep;
  progress: Progress;
  mode: "mock" | "live";
  provider: string | null;
  model: string | null;
  skill: SkillInfo;
}
