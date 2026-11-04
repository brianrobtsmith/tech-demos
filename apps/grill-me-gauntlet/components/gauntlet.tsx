"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EXAMPLE_IDEA, isExampleIdea } from "@/lib/example";
import { specToMarkdown } from "@/lib/spec";
import type { GrillPayload, GrillStep, Progress as GrillProgress, Turn } from "@/lib/types";

const STORAGE_KEY = "grill-me-gauntlet:session:v1";

type Phase = "idea" | "interview" | "spec";

interface Session {
  idea: string;
  turns: Turn[];
  step: GrillStep | null;
  progress: GrillProgress | null;
  phase: Phase;
}

interface ModeInfo {
  mode: "mock" | "live";
  reason: string;
  provider: string | null;
  model: string | null;
}

const EMPTY: Session = {
  idea: EXAMPLE_IDEA,
  turns: [],
  step: null,
  progress: null,
  phase: "idea",
};

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const session = value as Session;
  return typeof session.idea === "string" && Array.isArray(session.turns) && typeof session.phase === "string";
}

const listeners = new Set<() => void>();
let currentSession: Session = EMPTY;
let sessionLoaded = false;

function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readStoredSession(): Session {
  if (sessionLoaded) return currentSession;
  sessionLoaded = true;
  if (typeof window === "undefined") return currentSession;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return currentSession;
    const parsed: unknown = JSON.parse(raw);
    if (isSession(parsed) && parsed.idea.trim()) currentSession = parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return currentSession;
}

function writeSession(next: Session) {
  currentSession = next;
  sessionLoaded = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

function subscribeReady() {
  return () => {};
}

function previewBranches(idea: string) {
  return isExampleIdea(idea)
    ? ["Users", "Problem", "Sharing", "Scope", "Amount", "Risks", "Non-goals", "Confirm"]
    : ["Users", "Problem", "Scope", "Risks", "Non-goals", "Confirm"];
}

function downloadMarkdown(filename: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function postGrill(idea: string, turns: Turn[]): Promise<GrillPayload> {
  const response = await fetch("/api/grill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea, turns }),
  });
  const data = (await response.json().catch(() => null)) as { error?: string } | GrillPayload | null;
  if (!response.ok || !data || !("step" in data)) {
    throw new Error(data && "error" in data && data.error ? data.error : "The interview failed.");
  }
  return data;
}

export function Gauntlet() {
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const session = useSyncExternalStore(subscribeSession, readStoredSession, () => EMPTY);
  const [mode, setMode] = useState<ModeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [pending, setPending] = useState<{ idea: string; turns: Turn[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/grill")
      .then((response) => response.json())
      .then((data: ModeInfo) => {
        if (!cancelled && data?.mode) setMode(data);
      })
      .catch(() => {
        if (!cancelled) setMode({ mode: "mock", reason: "status unavailable", provider: null, model: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(idea: string, turns: Turn[]) {
    setPending({ idea, turns });
    setLoading(true);
    setError(null);
    try {
      const payload = await postGrill(idea, turns);
      setCustom("");
      writeSession({
        idea,
        turns,
        step: payload.step,
        progress: payload.progress,
        phase: payload.step.status === "spec" ? "spec" : "interview",
      });
      if (payload.mode) {
        setMode({
          mode: payload.mode,
          reason: payload.mode === "mock" ? "scripted" : payload.provider ?? "live",
          provider: payload.provider,
          model: payload.model,
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The interview failed.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    writeSession({ ...EMPTY, idea: session.idea });
    setCustom("");
    setError(null);
    setPending(null);
  }

  function answer(text: string, accepted: boolean) {
    const step = session.step;
    if (!step || step.status === "spec") return;
    const turn: Turn = {
      branch: step.branch,
      title: step.title,
      body: step.body,
      recommendation: step.recommendation,
      answer: text,
      accepted,
    };
    void run(session.idea, [...session.turns, turn]);
  }

  if (!ready) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  const { idea, step, progress, phase, turns } = session;
  const modeLabel =
    mode?.mode === "live"
      ? `Live · ${mode.provider ?? "provider"} · ${mode.model ?? "gpt-oss-120b"}`
      : "Mock · no keys";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Grill-me gauntlet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One question at a time, before anything gets built. The agent follows Matt Pocock&apos;s grill-me skill and will not write a spec until you confirm.
          </p>
        </div>
        <Badge variant="outline">{modeLabel}</Badge>
      </header>

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>The idea</CardTitle>
            <CardDescription>
              {isExampleIdea(idea)
                ? "Fictional Setasides feature. Setasides is a personal savings and planning app. No real people or balances."
                : "Free-form. The mock interview quotes this text. Still no real personal or financial data."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Textarea
              aria-label="Product idea"
              value={idea}
              disabled={phase !== "idea" || loading}
              onChange={(event) => writeSession({ ...session, idea: event.target.value })}
              className="min-h-28"
            />
            {phase === "idea" ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => writeSession({ ...session, idea: EXAMPLE_IDEA })}>
                  Use the Setasides example
                </Button>
                <Button type="button" disabled={loading || idea.trim().length === 0} onClick={() => void run(idea.trim(), [])}>
                  {loading ? "Starting…" : "Start grilling"}
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={reset} disabled={loading}>
                Start over
              </Button>
            )}
            {turns.length > 0 ? (
              <div className="flex flex-col gap-3 pt-2">
                <h2 className="text-sm font-medium">Settled so far</h2>
                <ul className="flex flex-col gap-3">
                  {turns
                    .filter((turn) => turn.branch !== "Confirm" || !turn.accepted)
                    .map((turn, index) => (
                      <li key={`${turn.branch}-${index}`} className="text-sm">
                        <div className="font-medium">{turn.branch}</div>
                        <p className="text-muted-foreground">{turn.answer}</p>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {phase === "spec" ? "Spec" : phase === "interview" ? "Question" : "Progress"}
            </CardTitle>
            <CardDescription>
              {phase === "idea"
                ? "Branches fill in as each decision is settled."
                : "Yes accepts the recommendation. A different answer reshapes the tree."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Progress value={progress?.percent ?? 0} aria-label="Interview progress">
              <ProgressLabel>
                {progress && phase !== "idea"
                  ? `Question ${progress.index} of ${progress.total}`
                  : "Not started"}
              </ProgressLabel>
            </Progress>
            <BranchList idea={idea} step={step} phase={phase} />
            <Separator />
            {error ? (
              <div className="flex flex-col gap-2" role="alert">
                <p className="text-sm text-destructive">{error}</p>
                {pending ? (
                  <Button type="button" variant="outline" disabled={loading} onClick={() => void run(pending.idea, pending.turns)}>
                    Try again
                  </Button>
                ) : null}
              </div>
            ) : null}
            {loading ? (
              <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-32" />
              </div>
            ) : null}
            {!loading && !error && phase === "idea" ? (
              <p className="text-sm text-muted-foreground">
                Start grilling to get the first question. Yes accepts the recommended answer. You can write a different one instead.
              </p>
            ) : null}
            {!loading && !error && step && step.status !== "spec" ? (
              <div className="flex flex-col gap-3" aria-live="polite">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{step.branch}</Badge>
                </div>
                <h2 className="text-base font-medium">{step.title}</h2>
                <p className="text-sm leading-relaxed">{step.body}</p>
                <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                  <div className="text-xs font-medium text-muted-foreground">Recommended</div>
                  <p className="mt-1">{step.recommendation}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => answer(step.recommendation, true)}>
                    Yes, use this
                  </Button>
                </div>
                <Textarea
                  aria-label="A different answer"
                  placeholder="Or write a different answer"
                  value={custom}
                  onChange={(event) => setCustom(event.target.value)}
                  className="min-h-20"
                />
                <Button type="button" variant="outline" disabled={custom.trim().length === 0} onClick={() => answer(custom.trim(), false)}>
                  Send a different answer
                </Button>
              </div>
            ) : null}
            {!loading && !error && step?.status === "spec" && step.spec ? (
              <SpecView
                idea={idea}
                step={step}
                onDownload={() => downloadMarkdown("grill-me-spec.md", specToMarkdown(step.spec!, idea, step.settled))}
              />
            ) : null}
          </CardContent>
          {phase !== "idea" ? (
            <CardFooter className="text-xs text-muted-foreground">
              {mode?.mode === "live"
                ? "Live answers come from gpt-oss-120b. The skill text is on the server."
                : "Mock answers are scripted so the page works with no API key."}
            </CardFooter>
          ) : null}
        </Card>
      </div>

      <footer className="text-xs leading-relaxed text-muted-foreground">
        <p>
          Skill:{" "}
          <a className="underline" href="https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me" target="_blank" rel="noreferrer">
            grill-me
          </a>{" "}
          by Matt Pocock, MIT, loaded from <span className="font-mono">skills/upstream</span> at commit 4ae2317. Found via{" "}
          <a className="underline" href="https://x.com/gregisenberg/status/2117734977312047537" target="_blank" rel="noreferrer">
            Greg Isenberg
          </a>
          . Upstream asks a whole frontier in one round; this page asks the next frontier decision one at a time.
        </p>
        <p className="mt-1">
          Optional live mode uses a US-hosted open model (gpt-oss-120b on Together, Fireworks, or Baseten). No Chinese-lab models. This is not financial advice, and the app stores no real personal or financial data.
        </p>
      </footer>
    </main>
  );
}

function BranchList({ idea, step, phase }: { idea: string; step: GrillStep | null; phase: Phase }) {
  const items =
    phase === "idea" || !step
      ? previewBranches(idea).map((label) => ({ label, state: "upcoming" as const }))
      : step.status === "spec"
        ? step.settled.map((item) => ({ label: item.branch, state: "done" as const }))
        : [
            ...step.settled.map((item) => ({ label: item.branch, state: "done" as const })),
            { label: step.branch, state: "current" as const },
            ...step.remaining.map((label) => ({ label, state: "upcoming" as const })),
          ];

  return (
    <ol className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="flex items-center gap-2 text-sm">
          {item.state === "done" ? (
            <Check className="size-3.5 text-foreground" aria-hidden />
          ) : (
            <span
              className={
                item.state === "current"
                  ? "size-2 rounded-full bg-foreground ring-4 ring-foreground/15"
                  : "size-2 rounded-full bg-muted-foreground/30"
              }
              aria-hidden
            />
          )}
          <span className={item.state === "upcoming" ? "text-muted-foreground" : "font-medium"}>
            {item.label}
            {item.state === "current" ? " · now" : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

function SpecView({ idea, step, onDownload }: { idea: string; step: GrillStep; onDownload: () => void }) {
  const spec = step.spec;
  if (!spec) return null;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-medium">{spec.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Starting idea: {idea}</p>
      </div>
      <SpecSection title="Problem" body={spec.problem} />
      <SpecSection title="Users" body={spec.users} />
      <SpecSection title="Scope" body={spec.scope} />
      <ListSection title="Open risks" items={spec.openRisks} />
      <ListSection title="Non-goals" items={spec.nonGoals} />
      <div>
        <h3 className="text-sm font-medium">Decisions</h3>
        <ol className="mt-1 flex list-decimal flex-col gap-1 pl-5 text-sm text-muted-foreground">
          {step.settled.map((item, index) => (
            <li key={`${item.branch}-${index}`}>
              <span className="font-medium text-foreground">{item.branch}.</span> {item.decision}
            </li>
          ))}
        </ol>
      </div>
      <Button type="button" onClick={onDownload}>
        Download markdown
      </Button>
    </div>
  );
}

function SpecSection({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{body}</p>
    </section>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
