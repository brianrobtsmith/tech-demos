"use client";

import { Fragment, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Flame,
  FlaskConical,
  Heart,
  KeyRound,
  MessageCircle,
  Quote,
  RadarIcon,
  RefreshCw,
  Repeat2,
  TimerOff,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CVE_PATTERN } from "@/lib/radar";
import type { RadarError, RadarPost, RadarResponse } from "@/lib/radar-types";

const REFRESH_INTERVAL_MS = 60_000;

function formatVelocity(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 10) return Math.round(v).toString();
  return v.toFixed(1);
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function timeAgo(iso: string): string {
  const mins = Math.max(Math.round((Date.now() - new Date(iso).getTime()) / 60_000), 0);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function useCountdown(targetIso: string | null | undefined): string | null {
  const now = useNow(1000);
  if (!targetIso) return null;
  const seconds = Math.max(Math.round((new Date(targetIso).getTime() - now) / 1000), 0);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function HighlightedText({ text }: { text: string }) {
  const parts = text.split(new RegExp(`(${CVE_PATTERN.source})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        /^CVE-\d{4}-\d{4,}$/i.test(part) ? (
          <span key={i} className="rounded bg-amber-100 px-1 font-mono text-[13px] font-semibold text-amber-900">
            {part.toUpperCase()}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function PostCard({ post }: { post: RadarPost }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm font-medium">{post.author.name}</span>
        <span className="text-xs text-muted-foreground">@{post.author.username}</span>
        <span className="text-xs text-muted-foreground">· {timeAgo(post.createdAt)}</span>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs font-medium text-primary underline underline-offset-2"
        >
          View on X ↗
        </a>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
        <HighlightedText text={post.text} />
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Heart className="size-3.5" /> {formatCount(post.metrics.likes)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Repeat2 className="size-3.5" /> {formatCount(post.metrics.reposts)}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="size-3.5" /> {formatCount(post.metrics.replies)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Quote className="size-3.5" /> {formatCount(post.metrics.quotes)}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 font-medium text-foreground/70">
          <Zap className="size-3.5" /> {formatVelocity(post.velocity)} eng/hr
        </span>
      </div>
    </div>
  );
}

function RateLimitMeter({ data }: { data: RadarResponse }) {
  const countdown = useCountdown(data.rateLimit?.resetAt);
  const { rateLimit } = data;
  if (!rateLimit || rateLimit.limit === null || rateLimit.remaining === null) return null;
  const pct = (rateLimit.remaining / rateLimit.limit) * 100;
  return (
    <div className="flex min-w-56 flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-muted-foreground">API rate limit</span>
        <span className="font-mono">
          {rateLimit.remaining}/{rateLimit.limit}
          {countdown ? <span className="text-muted-foreground"> · resets {countdown}</span> : null}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: RadarError["error"]; onRetry: () => void }) {
  const countdown = useCountdown(error.code === "rate_limited" ? error.resetAt : null);
  if (error.code === "rate_limited") {
    return (
      <Alert>
        <TimerOff />
        <AlertTitle>Rate limit reached (HTTP 429)</AlertTitle>
        <AlertDescription>
          The X API recent-search quota for this window is used up.
          {countdown ? (
            <> The limit resets in <span className="font-mono font-semibold">{countdown}</span>.</>
          ) : (
            " Try again shortly."
          )}
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry now
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  if (error.code === "auth") {
    return (
      <Alert variant="destructive">
        <KeyRound />
        <AlertTitle>Authentication failed (HTTP {error.status})</AlertTitle>
        <AlertDescription>
          {error.message} Check that <code className="font-mono">X_BEARER_TOKEN</code> in{" "}
          <code className="font-mono">.env.local</code> is a valid app-only bearer token with access
          to recent search, then restart the dev server. Unset it (or set{" "}
          <code className="font-mono">MOCK=1</code>) to use mock data instead.
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>
        {error.message}
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

function Leaderboard({ data }: { data: RadarResponse }) {
  if (data.entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No posts mentioning CVE IDs found in the last {data.windowHours}h window. Try refreshing in
        a few minutes.
      </div>
    );
  }
  return (
    <Accordion className="rounded-xl border bg-card px-4">
      {data.entries.map((entry, rank) => (
        <AccordionItem key={entry.cveId} value={entry.cveId}>
          <AccordionTrigger className="hover:no-underline">
            <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 pr-2">
              <span className="w-7 font-mono text-sm text-muted-foreground">#{rank + 1}</span>
              <span className="font-mono text-sm font-semibold tracking-tight">{entry.cveId}</span>
              {rank === 0 && (
                <Badge className="bg-orange-100 text-orange-900">
                  <Flame data-icon="inline-start" /> hottest
                </Badge>
              )}
              <span className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  {entry.postCount} post{entry.postCount === 1 ? "" : "s"}
                </span>
                <span>{formatCount(entry.engagement)} engagements</span>
                <Badge variant="secondary" className="font-mono">
                  <Zap data-icon="inline-start" />
                  {formatVelocity(entry.velocity)}/hr
                </Badge>
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2 pb-2">
              {entry.posts.map((post) => (
                <PostCard key={`${entry.cveId}-${post.id}`} post={post} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function Dashboard() {
  const searchParams = useSearchParams();
  const simulate = searchParams.get("simulate");

  const [data, setData] = useState<RadarResponse | null>(null);
  const [error, setError] = useState<RadarError["error"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const url = simulate ? `/api/radar?simulate=${simulate}` : "/api/radar";
      const res = await fetch(url, { cache: "no-store" });
      const body = (await res.json()) as RadarResponse | RadarError;
      if (!res.ok || "error" in body) {
        setError((body as RadarError).error ?? { code: "upstream", status: res.status, message: "Unexpected response." });
        setData(null);
      } else {
        setData(body);
        setError(null);
      }
    } catch {
      setError({ code: "network", status: 0, message: "Could not reach the radar API." });
      setData(null);
    } finally {
      setUpdatedAt(new Date());
      setLoading(false);
      inFlight.current = false;
    }
  }, [simulate]);

  useEffect(() => {
    const kickoff = setTimeout(load, 0);
    const timer = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <RadarIcon className="size-5" />
        </div>
        <div className="mr-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">X Threat Intel Radar</h1>
            {data?.mode === "mock" && (
              <Badge className="bg-amber-100 text-amber-900">
                <FlaskConical data-icon="inline-start" /> MOCK DATA
              </Badge>
            )}
            {data?.mode === "live" && <Badge className="bg-emerald-100 text-emerald-900">LIVE</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            CVEs trending on X, ranked by engagement velocity (likes + reposts + replies + quotes
            per hour)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </header>

      {data?.mode === "mock" && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Showing realistic fixture data — no <code className="font-mono">X_BEARER_TOKEN</code> is
          configured (or <code className="font-mono">MOCK=1</code> is set). All CVE IDs, posts, and
          handles below are fictional.
        </p>
      )}

      <Card size="sm" className="mt-5">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Tracked CVEs</div>
            <div className="font-mono text-lg font-semibold">{data ? data.entries.length : "–"}</div>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div>
            <div className="text-xs text-muted-foreground">Posts scanned</div>
            <div className="font-mono text-lg font-semibold">{data ? data.scannedPosts : "–"}</div>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div>
            <div className="text-xs text-muted-foreground">Window</div>
            <div className="font-mono text-lg font-semibold">{data ? `${data.windowHours}h` : "–"}</div>
          </div>
          <div className="ml-auto">{data && <RateLimitMeter data={data} />}</div>
        </CardContent>
      </Card>

      <div className="mt-5">
        {error ? (
          <ErrorState error={error} onRetry={load} />
        ) : !data && loading ? (
          <LoadingState />
        ) : data ? (
          <Leaderboard data={data} />
        ) : null}
      </div>

      <footer className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {updatedAt ? `Last updated ${updatedAt.toLocaleTimeString()}` : "Loading…"} · auto-refresh
          every 60s
        </span>
        <span className="font-mono">GET /2/tweets/search/recent</span>
      </footer>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}
