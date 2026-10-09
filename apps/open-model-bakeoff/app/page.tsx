"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HistoryTable } from "@/components/history-table";
import {
  emptyPanel,
  ProviderPanel,
  type PanelData,
  type Winners,
} from "@/components/provider-panel";
import {
  clearHistory,
  loadHistory,
  saveRun,
  type RunRecord,
  type RunResult,
} from "@/lib/history";
import { DEFAULT_MODEL_KEY, getModel, MODELS } from "@/lib/models";
import { estimateCost, PRICES_AS_OF } from "@/lib/prices";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import type { ProviderStatus, RaceEvent } from "@/lib/race-types";

const DEFAULT_PROMPT =
  "Explain, in about 150 words, why open-weight models now make up the majority of tokens served on AI gateways.";

type Panels = Record<ProviderId, PanelData>;
type WinnersMap = Record<ProviderId, Winners>;

const noWinners = (): WinnersMap =>
  Object.fromEntries(
    PROVIDERS.map((p) => [p.id, { ttft: false, tokPerSec: false, cost: false }])
  ) as WinnersMap;

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

function makeRunRecord(
  modelKey: string,
  prompt: string,
  results: Partial<Record<ProviderId, RunResult>>
): RunRecord {
  return {
    id: crypto.randomUUID(),
    at: Date.now(),
    modelKey,
    prompt: prompt.trim(),
    results,
  };
}

export default function Home() {
  const [statuses, setStatuses] = useState<ProviderStatus[] | null>(null);
  const [checked, setChecked] = useState<Record<ProviderId, boolean>>({
    together: true,
    fireworks: true,
    baseten: true,
  });
  const [modelKey, setModelKey] = useState(DEFAULT_MODEL_KEY);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [panels, setPanels] = useState<Panels>({
    together: emptyPanel(),
    fireworks: emptyPanel(),
    baseten: emptyPanel(),
  });
  const [winners, setWinners] = useState<WinnersMap>(noWinners());
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setHistory(loadHistory());
    });
    fetch("/api/providers")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setStatuses(d.providers);
      })
      .catch(() => {
        if (!cancelled) setStatuses([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const model = getModel(modelKey)!;

  const availability = useMemo(() => {
    const map = {} as Record<
      ProviderId,
      { enabled: boolean; reason: string | null; mock: boolean }
    >;
    for (const p of PROVIDERS) {
      const status = statuses?.find((s) => s.id === p.id);
      if (!model.ids[p.id]) {
        map[p.id] = {
          enabled: false,
          reason: `${p.name} does not serve ${model.label} on serverless.`,
          mock: false,
        };
      } else if (status && !status.hasKey) {
        map[p.id] = { enabled: false, reason: null, mock: false };
      } else {
        map[p.id] = { enabled: true, reason: null, mock: status?.mock ?? false };
      }
    }
    return map;
  }, [statuses, model]);

  const idlePanelFor = useCallback(
    (id: ProviderId): PanelData => {
      const a = availability[id];
      if (!a.enabled) {
        return { ...emptyPanel("disabled"), errorMessage: a.reason };
      }
      if (!checked[id]) return emptyPanel("unchecked");
      return { ...emptyPanel(), mock: a.mock };
    },
    [availability, checked]
  );

  // Idle panels reflect key status, model choice, and checkboxes; panels that
  // hold run results are shown as-is.
  const displayPanels = useMemo(() => {
    const next = {} as Panels;
    for (const p of PROVIDERS) {
      const st = panels[p.id].status;
      next[p.id] =
        st === "idle" || st === "disabled" || st === "unchecked"
          ? idlePanelFor(p.id)
          : panels[p.id];
    }
    return next;
  }, [panels, idlePanelFor]);

  const racers = PROVIDERS.filter((p) => availability[p.id].enabled && checked[p.id]);

  const computeWinners = (results: Partial<Record<ProviderId, RunResult>>) => {
    const done = PROVIDERS.filter((p) => {
      const r = results[p.id];
      return r && !r.error;
    });
    const next = noWinners();
    if (done.length >= 2) {
      const best = (
        key: "ttftMs" | "tokPerSec" | "costUsd",
        dir: "min" | "max"
      ): ProviderId | null => {
        let bestId: ProviderId | null = null;
        let bestVal: number | null = null;
        for (const p of done) {
          const v = results[p.id]?.[key];
          if (v === null || v === undefined) continue;
          if (
            bestVal === null ||
            (dir === "min" ? v < bestVal : v > bestVal)
          ) {
            bestVal = v;
            bestId = p.id;
          }
        }
        return bestId;
      };
      const ttftWinner = best("ttftMs", "min");
      const speedWinner = best("tokPerSec", "max");
      const costWinner = best("costUsd", "min");
      if (ttftWinner) next[ttftWinner].ttft = true;
      if (speedWinner) next[speedWinner].tokPerSec = true;
      if (costWinner) next[costWinner].cost = true;
    }
    setWinners(next);
  };

  const run = async () => {
    if (running || racers.length === 0 || !prompt.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setWinners(noWinners());
    setPanels(() => {
      const next = {} as Panels;
      for (const p of PROVIDERS) {
        next[p.id] = racers.some((r) => r.id === p.id)
          ? { ...emptyPanel("waiting"), mock: availability[p.id].mock }
          : idlePanelFor(p.id);
      }
      return next;
    });

    const results: Partial<Record<ProviderId, RunResult>> = {};

    await Promise.all(
      racers.map(async (p) => {
        const result = await raceOne(
          p.id,
          modelKey,
          prompt,
          controller.signal,
          (updater) =>
            setPanels((prev) => ({ ...prev, [p.id]: updater(prev[p.id]) }))
        );
        if (result) results[p.id] = result;
      })
    );

    if (!controller.signal.aborted) {
      computeWinners(results);
      if (Object.keys(results).length > 0) {
        setHistory(saveRun(makeRunRecord(modelKey, prompt, results)));
      }
      setRunning(false);
    }
  };

  const raceOne = async (
    providerId: ProviderId,
    modelKey: string,
    prompt: string,
    signal: AbortSignal,
    update: (fn: (prev: PanelData) => PanelData) => void
  ): Promise<RunResult | null> => {
    let text = "";
    let ttftMs: number | null = null;
    let streamMs: number | null = null;
    let usageIn: number | null = null;
    let usageOut: number | null = null;
    let errorMessage: string | null = null;
    const mock = availability[providerId].mock;

    try {
      const res = await fetch("/api/race", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, modelKey, prompt }),
        signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as RaceEvent;
          if (event.type === "first") {
            ttftMs = event.ttftMs;
            update((prev) => ({ ...prev, status: "streaming", ttftMs: event.ttftMs }));
          } else if (event.type === "delta") {
            text += event.text;
            const t = text;
            update((prev) => ({ ...prev, status: "streaming", text: t }));
          } else if (event.type === "usage") {
            usageIn = event.inputTokens;
            usageOut = event.outputTokens;
          } else if (event.type === "done") {
            ttftMs = event.ttftMs ?? ttftMs;
            streamMs = event.streamMs;
          } else if (event.type === "error") {
            errorMessage = event.message;
          }
        }
      }
    } catch (err) {
      if (signal.aborted) return null;
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    if (signal.aborted) return null;

    if (errorMessage) {
      update((prev) => ({ ...prev, status: "error", errorMessage }));
      return {
        ttftMs: null,
        tokPerSec: null,
        inputTokens: null,
        outputTokens: null,
        tokensEstimated: false,
        costUsd: null,
        error: errorMessage,
        mock,
        textSnippet: "",
      };
    }

    const tokensEstimated = usageOut === null;
    const outputTokens = usageOut ?? (text ? estimateTokens(text) : 0);
    const inputTokens = usageIn ?? estimateTokens(prompt);
    const tokPerSec =
      streamMs && streamMs > 0 && outputTokens > 1
        ? outputTokens / (streamMs / 1000)
        : null;
    const costUsd = estimateCost(providerId, modelKey, inputTokens, outputTokens);

    const result: RunResult = {
      ttftMs,
      tokPerSec,
      inputTokens,
      outputTokens,
      tokensEstimated,
      costUsd,
      error: null,
      mock,
      textSnippet: text.slice(0, 280),
    };
    update((prev) => ({
      ...prev,
      status: "done",
      ttftMs,
      tokPerSec,
      inputTokens,
      outputTokens,
      tokensEstimated,
      costUsd,
    }));
    return result;
  };

  const loadRun = (run: RunRecord) => {
    abortRef.current?.abort();
    setRunning(false);
    setModelKey(run.modelKey);
    setPrompt(run.prompt);
    setPanels(() => {
      const next = {} as Panels;
      for (const p of PROVIDERS) {
        const r = run.results[p.id];
        if (!r) {
          next[p.id] = idlePanelFor(p.id);
        } else if (r.error) {
          next[p.id] = {
            ...emptyPanel("error"),
            errorMessage: r.error,
            mock: r.mock,
            fromHistory: true,
          };
        } else {
          next[p.id] = {
            status: "done",
            text: r.textSnippet + (r.textSnippet.length >= 280 ? "…" : ""),
            ttftMs: r.ttftMs,
            tokPerSec: r.tokPerSec,
            inputTokens: r.inputTokens,
            outputTokens: r.outputTokens,
            tokensEstimated: r.tokensEstimated,
            costUsd: r.costUsd,
            errorMessage: null,
            mock: r.mock,
            fromHistory: true,
          };
        }
      }
      return next;
    });
    computeWinners(run.results);
  };

  const anyMock = statuses?.some((s) => s.mock) ?? false;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Open-model bakeoff</h1>
        <p className="text-sm text-muted-foreground">
          Race Together AI, Fireworks, and Baseten serving the same open-weight
          model. One prompt, three streams, live TTFT / tokens-per-second /
          cost.
        </p>
        {anyMock ? (
          <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
            Mock mode is on (MOCK_PROVIDERS=1): providers without an API key
            stream a canned response with simulated latency.
          </p>
        ) : null}
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Model</span>
            <Select
              value={modelKey}
              onValueChange={(v) => {
                if (typeof v === "string") setModelKey(v);
              }}
            >
              <SelectTrigger className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            {PROVIDERS.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-1.5 text-sm ${
                  availability[p.id].enabled ? "" : "text-muted-foreground"
                }`}
              >
                <Checkbox
                  checked={checked[p.id] && availability[p.id].enabled}
                  disabled={!availability[p.id].enabled || running}
                  onCheckedChange={(v) =>
                    setChecked((prev) => ({ ...prev, [p.id]: v === true }))
                  }
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type a prompt to send to every enabled provider at once…"
            className="min-h-20 flex-1"
            disabled={running}
          />
          <Button
            onClick={run}
            disabled={running || racers.length === 0 || !prompt.trim()}
            className="sm:w-28"
          >
            {running ? "Racing…" : "Run"}
          </Button>
        </div>
        {statuses !== null && racers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No provider is enabled. Add at least one API key to{" "}
            <code className="font-mono">.env.local</code> (see{" "}
            <code className="font-mono">.env.example</code>) and restart.
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PROVIDERS.map((p) => (
          <ProviderPanel
            key={p.id}
            name={p.name}
            data={displayPanels[p.id]}
            winners={winners[p.id]}
          />
        ))}
      </section>

      <HistoryTable
        runs={history}
        onSelect={loadRun}
        onClear={() => {
          clearHistory();
          setHistory([]);
        }}
      />

      <footer className="border-t pt-4 text-xs text-muted-foreground">
        Single-shot numbers from your network at one moment — not a benchmark.
        Prices are hard-coded in <code className="font-mono">lib/prices.ts</code>{" "}
        as of {PRICES_AS_OF}. Token counts fall back to a chars÷4 estimate when a
        provider doesn&apos;t return usage. Timing is measured server-side so
        browser rendering doesn&apos;t skew the numbers.
      </footer>
    </main>
  );
}
