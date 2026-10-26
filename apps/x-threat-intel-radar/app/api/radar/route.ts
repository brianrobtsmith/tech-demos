import { NextRequest, NextResponse } from "next/server";
import { buildLeaderboard, SEARCH_QUERY, WINDOW_HOURS, type RawPost } from "@/lib/radar";
import { getMockRawPosts, getMockRateLimit } from "@/lib/mock-data";
import type { RadarError, RadarResponse, RateLimitInfo } from "@/lib/radar-types";

const X_SEARCH_URL = "https://api.x.com/2/tweets/search/recent";

type XTweet = {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
  };
};

type XUser = { id: string; name: string; username: string };

function readRateLimit(headers: Headers): RateLimitInfo {
  const limit = headers.get("x-rate-limit-limit");
  const remaining = headers.get("x-rate-limit-remaining");
  const reset = headers.get("x-rate-limit-reset");
  return {
    limit: limit ? Number(limit) : null,
    remaining: remaining ? Number(remaining) : null,
    resetAt: reset ? new Date(Number(reset) * 1000).toISOString() : null,
  };
}

function errorResponse(
  code: RadarError["error"]["code"],
  status: number,
  message: string,
  extras: { resetAt?: string | null; rateLimit?: RateLimitInfo | null } = {},
) {
  const body: RadarError = {
    error: { code, status, message, resetAt: extras.resetAt ?? null },
    rateLimit: extras.rateLimit ?? null,
  };
  return NextResponse.json(body, { status });
}

function mockResponse(now: number): NextResponse {
  const body: RadarResponse = {
    mode: "mock",
    generatedAt: new Date(now).toISOString(),
    windowHours: WINDOW_HOURS,
    query: SEARCH_QUERY,
    scannedPosts: getMockRawPosts(now).length,
    entries: buildLeaderboard(getMockRawPosts(now), now),
    rateLimit: getMockRateLimit(now),
  };
  return NextResponse.json(body);
}

export async function GET(request: NextRequest) {
  const now = Date.now();
  const simulate = request.nextUrl.searchParams.get("simulate");

  // Demo-only error simulation so the 401/429 UI states can be exercised
  // without burning real quota (documented in the README).
  if (simulate === "401") {
    return errorResponse("auth", 401, "Unauthorized: the bearer token was rejected by the X API.");
  }
  if (simulate === "429") {
    return errorResponse("rate_limited", 429, "Rate limit exceeded for recent search.", {
      resetAt: new Date(now + 9 * 60_000).toISOString(),
      rateLimit: { limit: 450, remaining: 0, resetAt: new Date(now + 9 * 60_000).toISOString() },
    });
  }

  const token = process.env.X_BEARER_TOKEN;
  if (process.env.MOCK === "1" || !token) {
    return mockResponse(now);
  }

  const params = new URLSearchParams({
    query: SEARCH_QUERY,
    max_results: "100",
    start_time: new Date(now - WINDOW_HOURS * 3_600_000).toISOString(),
    "tweet.fields": "created_at,public_metrics,author_id",
    expansions: "author_id",
    "user.fields": "name,username",
  });

  let upstream: Response;
  try {
    upstream = await fetch(`${X_SEARCH_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return errorResponse("network", 502, "Could not reach the X API (network error).");
  }

  const rateLimit = readRateLimit(upstream.headers);

  if (upstream.status === 429) {
    return errorResponse("rate_limited", 429, "X API rate limit exceeded for recent search.", {
      resetAt: rateLimit.resetAt,
      rateLimit,
    });
  }
  if (upstream.status === 401 || upstream.status === 403) {
    return errorResponse(
      "auth",
      upstream.status,
      upstream.status === 401
        ? "Unauthorized: the bearer token was rejected by the X API."
        : "Forbidden: this token's access level cannot use recent search.",
      { rateLimit },
    );
  }
  if (!upstream.ok) {
    return errorResponse("upstream", 502, `X API returned ${upstream.status}.`, { rateLimit });
  }

  const payload = (await upstream.json()) as {
    data?: XTweet[];
    includes?: { users?: XUser[] };
  };

  const users = new Map((payload.includes?.users ?? []).map((u) => [u.id, u]));
  const rawPosts: RawPost[] = (payload.data ?? []).map((tweet) => {
    const user = users.get(tweet.author_id);
    return {
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at,
      author: {
        username: user?.username ?? "i",
        name: user?.name ?? "Unknown",
      },
      metrics: {
        likes: tweet.public_metrics.like_count,
        reposts: tweet.public_metrics.retweet_count,
        replies: tweet.public_metrics.reply_count,
        quotes: tweet.public_metrics.quote_count,
      },
    };
  });

  const body: RadarResponse = {
    mode: "live",
    generatedAt: new Date(now).toISOString(),
    windowHours: WINDOW_HOURS,
    query: SEARCH_QUERY,
    scannedPosts: rawPosts.length,
    entries: buildLeaderboard(rawPosts, now),
    rateLimit,
  };
  return NextResponse.json(body);
}
