import type { Answer, DepEdge, TaxonomyData, Topic } from "./types";

export interface GraphIndex {
  topicById: Map<string, Topic>;
  /** Edges where the key topic is the dependent (its prerequisites). */
  prereqEdges: Map<string, DepEdge[]>;
}

export function buildIndex(data: TaxonomyData): GraphIndex {
  const topicById = new Map<string, Topic>();
  for (const t of data.topics) topicById.set(t.id, t);
  const prereqEdges = new Map<string, DepEdge[]>();
  for (const e of data.edges) {
    const list = prereqEdges.get(e.topicId);
    if (list) list.push(e);
    else prereqEdges.set(e.topicId, [e]);
  }
  return { topicById, prereqEdges };
}

export function prereqsOf(
  index: GraphIndex,
  topicId: string,
  includeSoft: boolean,
): DepEdge[] {
  const edges = index.prereqEdges.get(topicId) ?? [];
  return includeSoft ? edges : edges.filter((e) => e.strength === "hard");
}

/** All transitive prerequisites of `targetId` (excluding the target itself). */
export function collectAncestors(
  index: GraphIndex,
  targetId: string,
  includeSoft: boolean,
): Set<string> {
  const seen = new Set<string>();
  const stack = [targetId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const e of prereqsOf(index, id, includeSoft)) {
      if (!seen.has(e.prerequisiteId)) {
        seen.add(e.prerequisiteId);
        stack.push(e.prerequisiteId);
      }
    }
  }
  seen.delete(targetId);
  return seen;
}

/**
 * Ordered learn-first path: a topological sort of the target's ancestors plus
 * the target, breaking ties by starting age, then name.
 */
export function learnFirstPath(
  index: GraphIndex,
  targetId: string,
  includeSoft: boolean,
): string[] {
  const nodes = collectAncestors(index, targetId, includeSoft);
  nodes.add(targetId);
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const id of nodes) indegree.set(id, 0);
  for (const id of nodes) {
    for (const e of prereqsOf(index, id, includeSoft)) {
      if (!nodes.has(e.prerequisiteId)) continue;
      indegree.set(id, (indegree.get(id) ?? 0) + 1);
      const list = dependents.get(e.prerequisiteId);
      if (list) list.push(id);
      else dependents.set(e.prerequisiteId, [id]);
    }
  }
  const byPriority = (a: string, b: string) => {
    const ta = index.topicById.get(a)!;
    const tb = index.topicById.get(b)!;
    return ta.ageRangeStart - tb.ageRangeStart || ta.name.localeCompare(tb.name);
  };
  const ready = [...nodes].filter((id) => indegree.get(id) === 0);
  const order: string[] = [];
  while (ready.length > 0) {
    ready.sort(byPriority);
    const id = ready.shift()!;
    order.push(id);
    for (const dep of dependents.get(id) ?? []) {
      const d = indegree.get(dep)! - 1;
      indegree.set(dep, d);
      if (d === 0) ready.push(dep);
    }
  }
  return order;
}

export const MAX_QUESTIONS = 12;

export interface PlacementState {
  /** Topic ids in the order they were (or will be) asked. */
  askedOrder: string[];
  /** Next topic to ask, or null when the check is finished. */
  nextQuestion: string | null;
  done: boolean;
  /** Explicit "yes" answers plus their assumed-mastered hard ancestors. */
  mastered: Set<string>;
  /** Explicit "not yet" answers. */
  missing: Set<string>;
  /** Explicit "not sure" answers. */
  unsure: Set<string>;
}

/**
 * Replays the placement check from a map of answers. BFS backward from the
 * target: "yes" marks the concept and its hard ancestors as assumed mastered,
 * "not yet" / "not sure" queue the concept's hard prerequisites, capped at
 * MAX_QUESTIONS questions.
 */
export function computePlacement(
  index: GraphIndex,
  targetId: string,
  answers: Record<string, Answer>,
): PlacementState {
  const mastered = new Set<string>();
  const missing = new Set<string>();
  const unsure = new Set<string>();
  const askedOrder: string[] = [];
  const queued = new Set<string>([targetId]);
  const queue = [targetId];
  let nextQuestion: string | null = null;

  while (queue.length > 0 && askedOrder.length < MAX_QUESTIONS) {
    const id = queue.shift()!;
    if (mastered.has(id) || missing.has(id) || unsure.has(id)) continue;
    const answer = answers[id];
    if (!answer) {
      nextQuestion = id;
      break;
    }
    askedOrder.push(id);
    if (answer === "yes") {
      mastered.add(id);
      for (const anc of collectAncestors(index, id, false)) mastered.add(anc);
    } else {
      (answer === "not_yet" ? missing : unsure).add(id);
      for (const e of prereqsOf(index, id, false)) {
        if (!queued.has(e.prerequisiteId)) {
          queued.add(e.prerequisiteId);
          queue.push(e.prerequisiteId);
        }
      }
    }
  }

  return {
    askedOrder,
    nextQuestion,
    done: nextQuestion === null,
    mastered,
    missing,
    unsure,
  };
}

export interface GapReport {
  mastered: string[];
  missing: string[];
  untested: string[];
  /** Missing concepts whose hard prerequisites are all mastered, topo order. */
  learnNext: string[];
}

export function buildGapReport(
  index: GraphIndex,
  targetId: string,
  placement: PlacementState,
): GapReport {
  const order = learnFirstPath(index, targetId, false);
  const mastered: string[] = [];
  const missing: string[] = [];
  const untested: string[] = [];
  for (const id of order) {
    if (placement.mastered.has(id)) mastered.push(id);
    else if (placement.missing.has(id)) missing.push(id);
    else untested.push(id);
  }
  const learnNext = missing.filter((id) =>
    prereqsOf(index, id, false).every(
      (e) => placement.mastered.has(e.prerequisiteId),
    ),
  );
  return { mastered, missing, untested, learnNext };
}

export function fillName(prompt: string, name: string): string {
  return prompt.replaceAll("{{name}}", name);
}
