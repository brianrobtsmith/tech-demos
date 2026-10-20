export interface Topic {
  id: string;
  type: string;
  subject: string;
  domain: string;
  name: string;
  description: string;
  ageRangeStart: number;
  ageRangeEnd: number;
  centrality: number;
  evidence: string[];
  assessmentPrompt: string;
}

export interface DepEdge {
  topicId: string;
  prerequisiteId: string;
  strength: "hard" | "soft";
  reason: string;
}

export interface TaxonomyData {
  version: string;
  topics: Topic[];
  edges: DepEdge[];
}

export type Answer = "yes" | "not_yet" | "not_sure";

export interface PracticeResult {
  questions: string[];
  activity: string;
  provider: string;
  model: string;
  mock: boolean;
}
