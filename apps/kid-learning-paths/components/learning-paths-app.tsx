"use client";

import * as React from "react";
import { GapReportCard } from "@/components/gap-report";
import { PlacementCheckCard } from "@/components/placement-check";
import { PrereqTreeCard } from "@/components/prereq-tree";
import { SetupCard } from "@/components/setup-card";
import {
  buildGapReport,
  buildIndex,
  computePlacement,
} from "@/lib/graph";
import { SAMPLE_PROFILES, sampleAnswer, type SampleProfile } from "@/lib/samples";
import type { Answer, TaxonomyData } from "@/lib/types";

const STORAGE_KEY = "kid-learning-paths-v1";

interface PersistedState {
  childName: string;
  age: number;
  subject: string;
  targetId: string | null;
  answers: Record<string, Answer>;
  sampleProfileId: string | null;
}

export function LearningPathsApp({ data }: { data: TaxonomyData }) {
  const index = React.useMemo(() => buildIndex(data), [data]);

  const [childName, setChildName] = React.useState("");
  const [age, setAge] = React.useState(7);
  const [subject, setSubject] = React.useState("all");
  const [targetId, setTargetId] = React.useState<string | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, Answer>>({});
  const [sampleProfileId, setSampleProfileId] = React.useState<string | null>(
    null,
  );
  const [hydrated, setHydrated] = React.useState(false);

  // Restore from localStorage after mount (avoids SSR hydration mismatch).
  // One-time hydration from an external store is a legitimate setState-in-effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as PersistedState;
        setChildName(s.childName ?? "");
        setAge(s.age ?? 7);
        setSubject(s.subject ?? "all");
        setTargetId(s.targetId ?? null);
        setAnswers(s.answers ?? {});
        setSampleProfileId(s.sampleProfileId ?? null);
      }
    } catch {
      // Ignore corrupt saved state.
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  React.useEffect(() => {
    if (!hydrated) return;
    const state: PersistedState = {
      childName,
      age,
      subject,
      targetId,
      answers,
      sampleProfileId,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, childName, age, subject, targetId, answers, sampleProfileId]);

  const placement = React.useMemo(
    () => (targetId ? computePlacement(index, targetId, answers) : null),
    [index, targetId, answers],
  );
  const report = React.useMemo(
    () =>
      targetId && placement?.done
        ? buildGapReport(index, targetId, placement)
        : null,
    [index, targetId, placement],
  );

  const clearAnswers = (markManual = true) => {
    setAnswers({});
    if (markManual) setSampleProfileId(null);
  };

  const handleTargetChange = (id: string | null) => {
    setTargetId(id);
    clearAnswers();
  };

  const handleAnswer = (topicId: string, answer: Answer) => {
    setSampleProfileId(null);
    setAnswers((prev) => ({ ...prev, [topicId]: answer }));
  };

  const handleUndo = () => {
    if (!placement || placement.askedOrder.length === 0) return;
    const last = placement.askedOrder[placement.askedOrder.length - 1];
    setSampleProfileId(null);
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[last];
      return next;
    });
  };

  // Pre-fills the whole flow with clearly-fake answers by replaying the
  // placement engine against the profile's deterministic answer rule.
  const loadSample = (profile: SampleProfile) => {
    setChildName(profile.childName);
    setAge(profile.age);
    setSubject("all");
    setTargetId(profile.targetId);
    setSampleProfileId(profile.id);
    const sampleAnswers: Record<string, Answer> = {};
    for (;;) {
      const p = computePlacement(index, profile.targetId, sampleAnswers);
      if (!p.nextQuestion) break;
      const topic = index.topicById.get(p.nextQuestion)!;
      sampleAnswers[p.nextQuestion] = sampleAnswer(profile, topic);
    }
    setAnswers(sampleAnswers);
  };

  const sampleLabel =
    SAMPLE_PROFILES.find((p) => p.id === sampleProfileId)?.label ?? null;

  return (
    <div className="space-y-6">
      <SetupCard
        topics={data.topics}
        childName={childName}
        age={age}
        subject={subject}
        targetId={targetId}
        onChildNameChange={(v) => {
          setChildName(v);
          setSampleProfileId(null);
        }}
        onAgeChange={setAge}
        onSubjectChange={setSubject}
        onTargetChange={handleTargetChange}
        onLoadSample={loadSample}
      />
      {targetId && placement && (
        <>
          <PrereqTreeCard index={index} targetId={targetId} />
          <PlacementCheckCard
            index={index}
            childName={childName}
            placement={placement}
            sampleLabel={sampleLabel}
            onAnswer={handleAnswer}
            onUndo={handleUndo}
            onReset={() => clearAnswers()}
          />
          {report && (
            <GapReportCard
              index={index}
              report={report}
              childName={childName}
              age={age}
              sampleLabel={sampleLabel}
            />
          )}
        </>
      )}
      {!targetId && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          Pick a target concept above (or load a sample profile) to see its
          prerequisite tree and run a placement check.
        </p>
      )}
    </div>
  );
}
