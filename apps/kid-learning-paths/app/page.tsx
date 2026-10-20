import { LearningPathsApp } from "@/components/learning-paths-app";
import { getTaxonomy } from "@/lib/taxonomy";

export default function Home() {
  const data = getTaxonomy();
  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Kid Learning Paths
        </h1>
        <p className="text-muted-foreground text-sm">
          Pick a goal, see the prerequisite tree, run a quick placement check,
          and get a gap report with AI practice — powered by the open Marble
          Skill Taxonomy ({data.topics.length.toLocaleString()} concepts,{" "}
          {data.edges.length.toLocaleString()} links).
        </p>
      </header>
      <main className="flex-1">
        <LearningPathsApp data={data} />
      </main>
      <footer className="text-muted-foreground border-t pt-4 text-xs">
        Marble Skill Taxonomy (v1) · © Generative Spark, Inc. (Marble) ·{" "}
        <a
          href="https://withmarble.com"
          className="underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          https://withmarble.com
        </a>{" "}
        · licensed under ODbL 1.0 (database) and CC BY-SA 4.0 (content).
      </footer>
    </div>
  );
}
