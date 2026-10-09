"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RunRecord } from "@/lib/history";
import { getModel } from "@/lib/models";
import { PROVIDERS } from "@/lib/providers";

function fmtCell(run: RunRecord, providerId: (typeof PROVIDERS)[number]["id"]): string {
  const r = run.results[providerId];
  if (!r) return "—";
  if (r.error) return "error";
  const ttft = r.ttftMs !== null ? `${Math.round(r.ttftMs)}ms` : "—";
  const speed = r.tokPerSec !== null ? `${r.tokPerSec.toFixed(0)}t/s` : "—";
  const cost = r.costUsd !== null ? `$${r.costUsd.toFixed(5)}` : "—";
  return `${ttft} · ${speed} · ${cost}`;
}

export function HistoryTable({
  runs,
  onSelect,
  onClear,
}: {
  runs: RunRecord[];
  onSelect: (run: RunRecord) => void;
  onClear: () => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">
          History <span className="text-muted-foreground">(last 10 runs, stored in your browser)</span>
        </h2>
        <Button variant="outline" size="sm" onClick={onClear} disabled={runs.length === 0}>
          Clear
        </Button>
      </div>
      {runs.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No runs yet. Race the providers and results will show up here — they
          survive a page reload.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prompt</TableHead>
                <TableHead>Model</TableHead>
                {PROVIDERS.map((p) => (
                  <TableHead key={p.id}>{p.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow
                  key={run.id}
                  className="cursor-pointer"
                  title="Click to load this run's metrics into the panels"
                  onClick={() => onSelect(run)}
                >
                  <TableCell className="max-w-56 truncate">{run.prompt}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {getModel(run.modelKey)?.label ?? run.modelKey}
                  </TableCell>
                  {PROVIDERS.map((p) => (
                    <TableCell key={p.id} className="whitespace-nowrap font-mono text-xs tabular-nums">
                      {fmtCell(run, p.id)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
