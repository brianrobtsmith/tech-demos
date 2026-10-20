"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { learnFirstPath, prereqsOf, type GraphIndex } from "@/lib/graph";
import type { DepEdge } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_DEPTH = 10;

function TreeNode({
  index,
  topicId,
  edge,
  includeSoft,
  depth,
}: {
  index: GraphIndex;
  topicId: string;
  edge: DepEdge | null;
  includeSoft: boolean;
  depth: number;
}) {
  const [open, setOpen] = React.useState(depth < 2);
  const topic = index.topicById.get(topicId);
  if (!topic) return null;
  const children = prereqsOf(index, topicId, includeSoft);
  const hasChildren = children.length > 0 && depth < MAX_DEPTH;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("py-1", depth > 0 && "border-l pl-4")}>
        <div className="flex items-start gap-1.5">
          <CollapsibleTrigger
            disabled={!hasChildren}
            className={cn(
              "mt-0.5 rounded p-0.5 transition-transform",
              open && hasChildren && "rotate-90",
              !hasChildren && "opacity-20",
            )}
            aria-label="Toggle prerequisites"
          >
            <ChevronRight className="size-4" />
          </CollapsibleTrigger>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium">{topic.name}</span>
              <span className="text-muted-foreground text-xs">
                ages {topic.ageRangeStart}–{topic.ageRangeEnd}
              </span>
              {edge && (
                <Badge
                  variant={edge.strength === "hard" ? "default" : "outline"}
                  className="text-[10px]"
                >
                  {edge.strength}
                </Badge>
              )}
            </div>
            {edge && (
              <p className="text-muted-foreground text-xs italic">
                why: {edge.reason}
              </p>
            )}
          </div>
        </div>
        {hasChildren && (
          <CollapsibleContent className="ml-2.5">
            {children.map((e) => (
              <TreeNode
                key={`${e.prerequisiteId}-${e.topicId}`}
                index={index}
                topicId={e.prerequisiteId}
                edge={e}
                includeSoft={includeSoft}
                depth={depth + 1}
              />
            ))}
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

export function PrereqTreeCard({
  index,
  targetId,
}: {
  index: GraphIndex;
  targetId: string;
}) {
  const [includeSoft, setIncludeSoft] = React.useState(false);
  const path = React.useMemo(
    () => learnFirstPath(index, targetId, includeSoft),
    [index, targetId, includeSoft],
  );
  const target = index.topicById.get(targetId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>2 · Prerequisite tree</CardTitle>
        <CardDescription>
          Everything that leads up to “{target?.name}”, with the reason for
          each link. {path.length - 1} prerequisite
          {path.length - 1 === 1 ? "" : "s"} in total.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            id="soft-links"
            checked={includeSoft}
            onCheckedChange={setIncludeSoft}
          />
          <Label htmlFor="soft-links" className="font-normal">
            Include soft links (helpful but not required)
          </Label>
        </div>
        <Tabs defaultValue="tree">
          <TabsList>
            <TabsTrigger value="tree">Tree</TabsTrigger>
            <TabsTrigger value="path">Learn-first path</TabsTrigger>
          </TabsList>
          <TabsContent value="tree" className="max-h-[28rem] overflow-y-auto">
            <TreeNode
              index={index}
              topicId={targetId}
              edge={null}
              includeSoft={includeSoft}
              depth={0}
            />
          </TabsContent>
          <TabsContent value="path" className="max-h-[28rem] overflow-y-auto">
            <ol className="space-y-1.5">
              {path.map((id, i) => {
                const t = index.topicById.get(id)!;
                return (
                  <li key={id} className="flex items-baseline gap-2 text-sm">
                    <span className="text-muted-foreground w-6 shrink-0 text-right tabular-nums">
                      {i + 1}.
                    </span>
                    <span className={cn(id === targetId && "font-semibold")}>
                      {t.name}
                      {id === targetId && " (goal)"}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      ages {t.ageRangeStart}–{t.ageRangeEnd} · {t.subject}
                    </span>
                  </li>
                );
              })}
            </ol>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
