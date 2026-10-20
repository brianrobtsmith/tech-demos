"use client";

import * as React from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { GapReport, GraphIndex } from "@/lib/graph";
import type { PracticeResult, Topic } from "@/lib/types";

function TopicList({
  index,
  ids,
  empty,
}: {
  index: GraphIndex;
  ids: string[];
  empty: string;
}) {
  if (ids.length === 0)
    return <p className="text-muted-foreground text-sm">{empty}</p>;
  return (
    <ul className="space-y-1">
      {ids.map((id) => {
        const t = index.topicById.get(id)!;
        return (
          <li key={id} className="text-sm">
            {t.name}{" "}
            <span className="text-muted-foreground text-xs">
              ages {t.ageRangeStart}–{t.ageRangeEnd}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function GapReportCard({
  index,
  report,
  childName,
  age,
  sampleLabel,
}: {
  index: GraphIndex;
  report: GapReport;
  childName: string;
  age: number;
  sampleLabel: string | null;
}) {
  const [practiceTopic, setPracticeTopic] = React.useState<Topic | null>(null);
  const [practice, setPractice] = React.useState<PracticeResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const name = childName.trim() || "your child";

  async function generatePractice(topic: Topic) {
    setPracticeTopic(topic);
    setPractice(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: topic.id, childName: name, age }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Request failed");
      setPractice(body as PracticeResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          4 · Gap report
          {sampleLabel && <Badge variant="secondary">Sample data</Badge>}
        </CardTitle>
        <CardDescription>
          Where {name} stands on the path to the goal, and what to learn next.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <span className="size-2 rounded-full bg-green-500" />
              Mastered ({report.mastered.length})
            </h3>
            <TopicList
              index={index}
              ids={report.mastered}
              empty="Nothing confirmed yet."
            />
          </div>
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <span className="size-2 rounded-full bg-red-500" />
              Missing ({report.missing.length})
            </h3>
            <TopicList
              index={index}
              ids={report.missing}
              empty="No gaps found."
            />
          </div>
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <span className="size-2 rounded-full bg-amber-400" />
              Untested ({report.untested.length})
            </h3>
            <TopicList
              index={index}
              ids={report.untested}
              empty="Everything was covered."
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            Learn next — gaps whose prerequisites are already mastered
          </h3>
          {report.learnNext.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {report.missing.length === 0
                ? "No gaps — the goal looks within reach."
                : "No gap is unlocked yet; work through the untested concepts first."}
            </p>
          ) : (
            <ol className="space-y-2">
              {report.learnNext.map((id, i) => {
                const t = index.topicById.get(id)!;
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <span className="text-muted-foreground w-5 text-right tabular-nums">
                      {i + 1}.
                    </span>
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground text-xs">
                      ages {t.ageRangeStart}–{t.ageRangeEnd}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generatePractice(t)}
                    >
                      <Wand2 className="size-3.5" /> Generate practice
                    </Button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {report.missing.length > report.learnNext.length && (
          <div className="space-y-2">
            <h3 className="text-muted-foreground text-sm font-semibold">
              Other gaps (locked behind the ones above)
            </h3>
            <ul className="space-y-2">
              {report.missing
                .filter((id) => !report.learnNext.includes(id))
                .map((id) => {
                  const t = index.topicById.get(id)!;
                  return (
                    <li
                      key={id}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <span>{t.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => generatePractice(t)}
                      >
                        <Wand2 className="size-3.5" /> Generate practice
                      </Button>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}
      </CardContent>

      <Dialog
        open={practiceTopic !== null}
        onOpenChange={(open) => !open && setPracticeTopic(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Practice: {practiceTopic?.name}</DialogTitle>
            <DialogDescription>
              3 questions and 1 hands-on activity for {name}, age {age}.
            </DialogDescription>
          </DialogHeader>
          {loading && (
            <div className="space-y-3">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" /> Generating…
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          {practice && (
            <div className="space-y-4">
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                {practice.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
              <div className="bg-muted/50 rounded-lg border p-3 text-sm">
                <p className="mb-1 font-semibold">Hands-on activity</p>
                <p>{practice.activity}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={practice.mock ? "secondary" : "default"}>
                  {practice.mock
                    ? "Mock mode — canned output, no API key"
                    : `gpt-oss-120b via ${practice.provider}`}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                AI-generated, adapted from Marble Skill Taxonomy (CC BY-SA
                4.0).
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
