import type { CveEntry, RadarPost } from "./radar-types";

export const CVE_PATTERN = /CVE-\d{4}-\d{4,}/gi;

/**
 * Keyword query for X recent search. X tokenizes on punctuation, so the bare
 * term `CVE` matches posts containing IDs like "CVE-2026-12345"; the security
 * keywords narrow the stream and the regex filter below drops false positives.
 */
export const SEARCH_QUERY =
  'CVE (exploit OR exploited OR vulnerability OR "zero-day" OR 0day OR RCE OR PoC OR patch OR advisory) -is:retweet lang:en';

export const WINDOW_HOURS = 24;
export const MAX_POSTS_PER_CVE = 10;

export function extractCveIds(text: string): string[] {
  const matches = text.match(CVE_PATTERN) ?? [];
  return [...new Set(matches.map((m) => m.toUpperCase()))];
}

export type RawPost = {
  id: string;
  text: string;
  createdAt: string;
  author: { username: string; name: string };
  metrics: { likes: number; reposts: number; replies: number; quotes: number };
};

/** Minimum post age for velocity math, so a brand-new post doesn't divide by ~0. */
const MIN_AGE_HOURS = 0.25;

export function toRadarPost(raw: RawPost, now: number): RadarPost {
  const engagement =
    raw.metrics.likes + raw.metrics.reposts + raw.metrics.replies + raw.metrics.quotes;
  const ageHours = Math.max(
    (now - new Date(raw.createdAt).getTime()) / 3_600_000,
    MIN_AGE_HOURS,
  );
  return {
    id: raw.id,
    text: raw.text,
    url: `https://x.com/${raw.author.username}/status/${raw.id}`,
    author: raw.author,
    createdAt: raw.createdAt,
    metrics: raw.metrics,
    engagement,
    ageHours,
    velocity: engagement / ageHours,
  };
}

/** Group posts by the CVE IDs they mention and rank CVEs by summed velocity. */
export function buildLeaderboard(rawPosts: RawPost[], now: number): CveEntry[] {
  const byCve = new Map<string, RadarPost[]>();

  for (const raw of rawPosts) {
    const cveIds = extractCveIds(raw.text);
    if (cveIds.length === 0) continue;
    const post = toRadarPost(raw, now);
    for (const cveId of cveIds) {
      const list = byCve.get(cveId) ?? [];
      list.push(post);
      byCve.set(cveId, list);
    }
  }

  const entries: CveEntry[] = [...byCve.entries()].map(([cveId, posts]) => {
    const sorted = [...posts].sort((a, b) => b.velocity - a.velocity);
    return {
      cveId,
      velocity: posts.reduce((sum, p) => sum + p.velocity, 0),
      engagement: posts.reduce((sum, p) => sum + p.engagement, 0),
      postCount: posts.length,
      newestPostAt: posts.reduce(
        (newest, p) => (p.createdAt > newest ? p.createdAt : newest),
        posts[0].createdAt,
      ),
      posts: sorted.slice(0, MAX_POSTS_PER_CVE),
    };
  });

  return entries.sort((a, b) => b.velocity - a.velocity);
}
