"use client";

import { Check, HelpCircle, RotateCcw, Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  MAX_QUESTIONS,
  fillName,
  type GraphIndex,
  type PlacementState,
} from "@/lib/graph";
import type { Answer } from "@/lib/types";

interface PlacementCheckCardProps {
  index: GraphIndex;
  childName: string;
  placement: PlacementState;
  sampleLabel: string | null;
  onAnswer: (topicId: string, answer: Answer) => void;
  onUndo: () => void;
  onReset: () => void;
}

export function PlacementCheckCard({
  index,
  childName,
  placement,
  sampleLabel,
  onAnswer,
  onUndo,
  onReset,
}: PlacementCheckCardProps) {
  const askedCount = placement.askedOrder.length;
  const current = placement.nextQuestion
    ? index.topicById.get(placement.nextQuestion)
    : null;
  const name = childName.trim() || "your child";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          3 · Placement check
          {sampleLabel && <Badge variant="secondary">Sample data</Badge>}
        </CardTitle>
        <CardDescription>
          Starts at the goal and works backward through prerequisites. Answer
          from what you&apos;ve seen {name} do — max {MAX_QUESTIONS} questions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Progress
            value={(askedCount / MAX_QUESTIONS) * 100}
            className="h-2 flex-1"
          />
          <span className="text-muted-foreground text-xs tabular-nums">
            {askedCount}/{MAX_QUESTIONS}
          </span>
        </div>

        {sampleLabel && (
          <p className="text-muted-foreground text-sm">
            Answers below were pre-filled from the “{sampleLabel}” sample
            profile — they are fake demo data, not a real child&apos;s results.
          </p>
        )}

        {current ? (
          <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{current.subject}</Badge>
              <span className="text-sm font-medium">{current.name}</span>
              <span className="text-muted-foreground text-xs">
                ages {current.ageRangeStart}–{current.ageRangeEnd}
              </span>
            </div>
            <p className="text-base">
              {fillName(current.assessmentPrompt, name)}
            </p>
            {current.evidence[0] && (
              <p className="text-muted-foreground text-sm">
                What to look for: {current.evidence[0]}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={() => onAnswer(current.id, "yes")}>
                <Check className="size-4" /> Yes
              </Button>
              <Button
                variant="outline"
                onClick={() => onAnswer(current.id, "not_yet")}
              >
                <X className="size-4" /> Not yet
              </Button>
              <Button
                variant="ghost"
                onClick={() => onAnswer(current.id, "not_sure")}
              >
                <HelpCircle className="size-4" /> Not sure
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm">
            <p className="font-medium">
              Placement check complete after {askedCount} question
              {askedCount === 1 ? "" : "s"}.
            </p>
            <p className="text-muted-foreground">
              {placement.mastered.size} concepts look solid,{" "}
              {placement.missing.size} need work. See the gap report below.
            </p>
          </div>
        )}

        {askedCount > 0 && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onUndo}>
                <Undo2 className="size-3.5" /> Undo last
              </Button>
              <Button variant="ghost" size="sm" onClick={onReset}>
                <RotateCcw className="size-3.5" /> Restart check
              </Button>
            </div>
            <ul className="text-muted-foreground space-y-0.5 text-xs">
              {placement.askedOrder.map((id, i) => {
                const t = index.topicById.get(id)!;
                const a = placement.mastered.has(id)
                  ? "Yes"
                  : placement.missing.has(id)
                    ? "Not yet"
                    : "Not sure";
                return (
                  <li key={id}>
                    {i + 1}. {t.name} — <span className="font-medium">{a}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
