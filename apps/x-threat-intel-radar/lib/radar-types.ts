export type RadarPost = {
  id: string;
  text: string;
  url: string;
  author: { username: string; name: string };
  createdAt: string;
  metrics: { likes: number; reposts: number; replies: number; quotes: number };
  engagement: number;
  ageHours: number;
  velocity: number;
};

export type CveEntry = {
  cveId: string;
  velocity: number;
  engagement: number;
  postCount: number;
  newestPostAt: string;
  posts: RadarPost[];
};

export type RateLimitInfo = {
  limit: number | null;
  remaining: number | null;
  resetAt: string | null;
};

export type RadarResponse = {
  mode: "live" | "mock";
  generatedAt: string;
  windowHours: number;
  query: string;
  scannedPosts: number;
  entries: CveEntry[];
  rateLimit: RateLimitInfo | null;
};

export type RadarErrorCode = "auth" | "rate_limited" | "upstream" | "network";

export type RadarError = {
  error: {
    code: RadarErrorCode;
    status: number;
    message: string;
    resetAt?: string | null;
  };
  rateLimit?: RateLimitInfo | null;
};
