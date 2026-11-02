"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ShowResponse } from "@/lib/types";
import { AccountsBento } from "./stage/bento";
import { ProductFrame, Still } from "./stage/frame";
import { IdeaBento, IdeaStillView } from "./stage/idea-view";
import { AccountsScreen, CashflowScreen } from "./stage/screens";
import { StateStills } from "./stage/states";

const IDEA_KEY = "stageshow-studio-idea";

type Kind = "preset" | "idea";
type Panel = "all" | "accounts" | "cashflow" | "states" | "bento";

function visible(panel: Panel, name: Panel) {
  return panel === "all" || panel === name;
}

function Column({
  title,
  treatment,
  show,
  panel,
}: {
  title: string;
  treatment: "with" | "without";
  show: ShowResponse;
  panel: Panel;
}) {
  const copy = treatment === "with" ? show.withStageshow : show.withoutStageshow;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{copy.headline}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {show.kind === "preset" && show.accounts ? (
          <>
            {visible(panel, "accounts") ? (
              <>
                <Still label={copy.captions.desktop}>
                  <ProductFrame treatment={treatment} shot="desk">
                    <AccountsScreen data={show.accounts} frame="desk" />
                  </ProductFrame>
                </Still>
                <Still label={copy.captions.phone}>
                  <ProductFrame treatment={treatment} shot="phone">
                    <AccountsScreen data={show.accounts} frame="phone" />
                  </ProductFrame>
                </Still>
              </>
            ) : null}
            {visible(panel, "cashflow") ? (
              <Still label={copy.captions.cashflow}>
                <ProductFrame treatment={treatment} shot="desk">
                  <CashflowScreen data={show.accounts} />
                </ProductFrame>
              </Still>
            ) : null}
            {visible(panel, "states") ? (
              <Still label={copy.captions.states}>
                <div className={treatment === "with" ? "sa-ground" : undefined}>
                  <StateStills data={show.accounts} treatment={treatment} />
                </div>
              </Still>
            ) : null}
            {visible(panel, "bento") ? (
              <Still label="Bento">
                <AccountsBento data={show.accounts} treatment={treatment} />
              </Still>
            ) : null}
          </>
        ) : null}

        {show.kind === "idea" && show.idea ? (
          <>
            {(panel === "all" || panel === "accounts") &&
              (treatment === "with"
                ? show.idea.withStageshow
                : show.idea.withoutStageshow
              ).stills.map((still, index) => (
                <Still key={still.id} label={still.caption}>
                  <ProductFrame treatment={treatment} shot={still.frame === "phone" ? "phone" : "desk"}>
                    <IdeaStillView
                      scene={
                        treatment === "with"
                          ? show.idea!.withStageshow
                          : show.idea!.withoutStageshow
                      }
                      index={index}
                    />
                  </ProductFrame>
                </Still>
              ))}
            {panel === "cashflow" || panel === "states" ? (
              <p className="text-sm text-muted-foreground">
                Connect, sync, and cash flow states belong to the Setasides Accounts preset.
              </p>
            ) : null}
            {visible(panel, "bento") ? (
              <Still label="Bento">
                <IdeaBento
                  scene={
                    treatment === "with"
                      ? show.idea.withStageshow
                      : show.idea.withoutStageshow
                  }
                  treatment={treatment}
                />
              </Still>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function Studio() {
  const [kind, setKind] = useState<Kind>("preset");
  const [idea, setIdea] = useState("");
  const [panel, setPanel] = useState<Panel>("all");
  const [show, setShow] = useState<ShowResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(false);

  const run = useCallback(async (nextKind: Kind, nextIdea: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: nextKind, idea: nextIdea }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message =
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : "Could not generate.";
        setError(message);
        return;
      }
      setShow(body as ShowResponse);
    } catch {
      setError("Could not reach the generator.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(IDEA_KEY);
        if (saved) setIdea(saved);
      } catch {
        // Private mode can block storage. The preset still loads.
      }
      void run("preset", "");
      hydrated.current = true;
    }, 0);
    return () => window.clearTimeout(id);
  }, [run]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(IDEA_KEY, idea);
    } catch {
      // Ignore storage failures.
    }
  }, [idea]);

  return (
    <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Stageshow Studio</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The same brief, drawn two ways. With Stageshow is a product shot. Without it is a screenshot in a box.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Brief</CardTitle>
          <CardDescription>
            Setasides Accounts is the default. Switch to your idea, then generate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(kind, idea);
            }}
          >
            <ToggleGroup
              value={[kind]}
              spacing={0}
              variant="outline"
              onValueChange={(value) => {
                const next = value[0];
                if (next === "preset" || next === "idea") setKind(next);
              }}
            >
              <ToggleGroupItem value="preset">Setasides Accounts</ToggleGroupItem>
              <ToggleGroupItem value="idea">Your idea</ToggleGroupItem>
            </ToggleGroup>
            <Textarea
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="A calm reading list for the books you already own"
              aria-label="Product idea"
              rows={3}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Generating…" : "Generate"}
              </Button>
              {show ? (
                <Badge variant="secondary">
                  {show.mode === "mock" ? "Mock" : `Live · ${show.provider}`}
                </Badge>
              ) : null}
              {show?.kind === "preset" ? (
                <Badge variant="outline">
                  {show.dataSource === "local" ? "Local accounts file" : "Park sample"}
                </Badge>
              ) : null}
            </div>
            {error ? <p className="text-sm">{error}</p> : null}
            {show?.notice ? (
              <p className="text-sm text-muted-foreground">{show.notice}</p>
            ) : null}
            {show?.dataSource === "local" ? (
              <p className="text-sm text-muted-foreground">
                Reading accounts.local.json. Share screenshots from the Park sample, with that file removed.
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Tabs
        value={panel}
        onValueChange={(value) => {
          if (
            value === "all" ||
            value === "accounts" ||
            value === "cashflow" ||
            value === "states" ||
            value === "bento"
          ) {
            setPanel(value);
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="cashflow">Cash flow</TabsTrigger>
          <TabsTrigger value="states">States</TabsTrigger>
          <TabsTrigger value="bento">Bento</TabsTrigger>
        </TabsList>
        <TabsContent value={panel} className="pt-4">
          {loading && !show ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          ) : null}
          {show ? (
            <div className="grid items-start gap-4 md:grid-cols-2">
              <Column
                title="With Stageshow"
                treatment="with"
                show={show}
                panel={panel}
              />
              <Column
                title="Without Stageshow"
                treatment="without"
                show={show}
                panel={panel}
              />
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      <footer className="text-xs leading-relaxed text-muted-foreground">
        Faux UI follows{" "}
        <a
          className="underline underline-offset-2"
          href="https://x.com/benjitaylor/status/2116593247854453244"
        >
          Benji Taylor&apos;s Stageshow
        </a>{" "}
        (
        <a
          className="underline underline-offset-2"
          href="https://github.com/benjitaylor/skills/tree/main/stageshow"
        >
          benjitaylor/skills
        </a>
        ). The skill is installed at generate time and is not vendored here. Setasides stills use the
        fictional Park household unless you drop in a local accounts file.
      </footer>
    </main>
  );
}
