"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type PanelStatus =
  | "idle"
  | "disabled"
  | "unchecked"
  | "waiting"
  | "streaming"
  | "done"
  | "error";

export interface PanelData {
  status: PanelStatus;
  text: string;
  ttftMs: number | null;
  tokPerSec: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  tokensEstimated: boolean;
  costUsd: number | null;
  errorMessage: string | null;
  mock: boolean;
  fromHistory: boolean;
}

export const emptyPanel = (status: PanelStatus = "idle"): PanelData => ({
  status,
  text: "",
  ttftMs: null,
  tokPerSec: null,
  inputTokens: null,
  outputTokens: null,
  tokensEstimated: false,
  costUsd: null,
  errorMessage: null,
  mock: false,
  fromHistory: false,
});

export interface Winners {
  ttft: boolean;
  tokPerSec: boolean;
  cost: boolean;
}

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  return `${Math.round(ms).toLocaleString()} ms`;
}

function fmtTokPerSec(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)} tok/s`;
}

function fmtCost(v: number | null): string {
  if (v === null) return "—";
  if (v > 0 && v < 0.000001) return "<$0.000001";
  return `$${v.toFixed(6)}`;
}

function Metric({
  label,
  value,
  winner,
}: {
  label: string;
  value: string;
  winner?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-1 font-mono text-sm tabular-nums">
        {value}
        {winner ? <span title="Winner">🏆</span> : null}
      </span>
    </div>
  );
}

export function ProviderPanel({
  name,
  data,
  winners,
}: {
  name: string;
  data: PanelData;
  winners: Winners;
}) {
  const { status } = data;
  const dimmed = status === "disabled" || status === "unchecked";

  return (
    <Card className={dimmed ? "opacity-60" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{name}</CardTitle>
        <div className="flex items-center gap-1.5">
          {data.mock ? <Badge variant="outline">mock</Badge> : null}
          {data.fromHistory ? <Badge variant="outline">from history</Badge> : null}
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="h-56 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
          {status === "disabled" ? (
            <p className="text-muted-foreground">
              {data.errorMessage ?? (
                <>
                  No API key found. Add this provider&apos;s key to{" "}
                  <code className="font-mono">.env.local</code> and restart the
                  dev server to enable it.
                </>
              )}
            </p>
          ) : status === "unchecked" ? (
            <p className="text-muted-foreground">
              Unchecked — this provider sits out the next run.
            </p>
          ) : status === "error" ? (
            <p className="text-destructive">{data.errorMessage ?? "Request failed."}</p>
          ) : status === "waiting" ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : data.text ? (
            data.text
          ) : (
            <p className="text-muted-foreground">
              Output streams here when you hit Run.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <Metric label="TTFT" value={fmtMs(data.ttftMs)} winner={winners.ttft} />
          <Metric
            label="Speed"
            value={fmtTokPerSec(data.tokPerSec)}
            winner={winners.tokPerSec}
          />
          <Metric
            label={`Tokens in/out${data.tokensEstimated ? " (est.)" : ""}`}
            value={
              data.inputTokens === null && data.outputTokens === null
                ? "—"
                : `${data.inputTokens ?? "?"} / ${data.outputTokens ?? "?"}`
            }
          />
          <Metric label="Est. cost" value={fmtCost(data.costUsd)} winner={winners.cost} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: PanelStatus }) {
  switch (status) {
    case "disabled":
      return <Badge variant="secondary">no key</Badge>;
    case "unchecked":
      return <Badge variant="secondary">off</Badge>;
    case "waiting":
      return <Badge variant="secondary">waiting…</Badge>;
    case "streaming":
      return <Badge>streaming</Badge>;
    case "done":
      return <Badge variant="outline">done</Badge>;
    case "error":
      return <Badge variant="destructive">error</Badge>;
    default:
      return <Badge variant="outline">ready</Badge>;
  }
}
