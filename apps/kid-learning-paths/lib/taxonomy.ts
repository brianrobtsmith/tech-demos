import "server-only";
import topicsJson from "@/data/topics.json";
import depsJson from "@/data/dependencies.json";
import type { DepEdge, TaxonomyData, Topic } from "./types";

interface RawTopic extends Topic {
  standards: string[];
}

const rawTopics = (topicsJson as { version: string; topics: RawTopic[] })
  .topics;
const rawEdges = (depsJson as { dependencies: DepEdge[] }).dependencies;

let cached: TaxonomyData | null = null;

/** Slimmed taxonomy shipped to the client (standards stripped; shown nowhere). */
export function getTaxonomy(): TaxonomyData {
  if (!cached) {
    cached = {
      version: (topicsJson as { version: string }).version,
      topics: rawTopics.map((t) => ({
        id: t.id,
        type: t.type,
        subject: t.subject,
        domain: t.domain,
        name: t.name,
        description: t.description,
        ageRangeStart: t.ageRangeStart,
        ageRangeEnd: t.ageRangeEnd,
        centrality: t.centrality,
        evidence: t.evidence,
        assessmentPrompt: t.assessmentPrompt,
      })),
      edges: rawEdges.map((e) => ({
        topicId: e.topicId,
        prerequisiteId: e.prerequisiteId,
        strength: e.strength,
        reason: e.reason,
      })),
    };
  }
  return cached;
}

export function getTopicById(id: string): Topic | undefined {
  return getTaxonomy().topics.find((t) => t.id === id);
}
