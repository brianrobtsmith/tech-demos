"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Sparkles } from "lucide-react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SAMPLE_PROFILES, type SampleProfile } from "@/lib/samples";
import type { Topic } from "@/lib/types";
import { cn } from "@/lib/utils";

const AGES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

interface SetupCardProps {
  topics: Topic[];
  childName: string;
  age: number;
  subject: string;
  targetId: string | null;
  onChildNameChange: (name: string) => void;
  onAgeChange: (age: number) => void;
  onSubjectChange: (subject: string) => void;
  onTargetChange: (id: string | null) => void;
  onLoadSample: (profile: SampleProfile) => void;
}

export function SetupCard({
  topics,
  childName,
  age,
  subject,
  targetId,
  onChildNameChange,
  onAgeChange,
  onSubjectChange,
  onTargetChange,
  onLoadSample,
}: SetupCardProps) {
  const [open, setOpen] = React.useState(false);

  const subjects = React.useMemo(
    () => [...new Set(topics.map((t) => t.subject))].sort(),
    [topics],
  );

  // Concepts whose age range overlaps the child's age ±1.
  const candidates = React.useMemo(
    () =>
      topics
        .filter(
          (t) =>
            t.ageRangeStart <= age + 1 &&
            t.ageRangeEnd >= age - 1 &&
            (subject === "all" || t.subject === subject),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [topics, age, subject],
  );

  const target = targetId ? topics.find((t) => t.id === targetId) : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>1 · Child &amp; goal</CardTitle>
        <CardDescription>
          Pick an age and a target concept, or load a sample profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PROFILES.map((p) => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => onLoadSample(p)}
            >
              <Sparkles className="size-3.5" />
              {p.label}
              <Badge variant="secondary" className="ml-1">
                Sample data
              </Badge>
            </Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="child-name">Child&apos;s name</Label>
            <Input
              id="child-name"
              placeholder="e.g. Alex"
              value={childName}
              onChange={(e) => onChildNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Age</Label>
            <Select
              value={String(age)}
              onValueChange={(v) => onAgeChange(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGES.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a} years old
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subject} onValueChange={onSubjectChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Target concept ({candidates.length} match the age)</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between font-normal"
              >
                {target ? (
                  <span className="truncate">
                    {target.name}
                    <span className="text-muted-foreground">
                      {" "}
                      · {target.subject} · ages {target.ageRangeStart}–
                      {target.ageRangeEnd}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Search for a concept…
                  </span>
                )}
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <Command>
                <CommandInput placeholder="Search concepts…" />
                <CommandList>
                  <CommandEmpty>No concept found.</CommandEmpty>
                  <CommandGroup>
                    {candidates.map((t) => (
                      <CommandItem
                        key={t.id}
                        value={`${t.name} ${t.domain} ${t.subject}`}
                        onSelect={() => {
                          onTargetChange(t.id === targetId ? null : t.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "size-4",
                            targetId === t.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="flex-1 truncate">{t.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {t.subject} · {t.ageRangeStart}–{t.ageRangeEnd}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {target && (
            <p className="text-muted-foreground text-sm">
              {target.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
