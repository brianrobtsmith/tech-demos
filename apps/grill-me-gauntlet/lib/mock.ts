import { isExampleIdea } from "@/lib/example";
import { stepSchema, type GrillStep, type Progress, type Turn } from "@/lib/types";

interface Question {
  branch: string;
  title: string;
  body: string;
  recommendation: string;
}

const EXAMPLE_QUESTIONS: Question[] = [
  {
    branch: "Users",
    title: "Who shares the goal?",
    body: "Is this for two people who already plan together in Setasides, or for any two people who want a joint fund even if they do not share a plan?",
    recommendation:
      "Couples who already share a Setasides plan. The goal sits on that plan. People who are not on the plan are out of v1.",
  },
  {
    branch: "Problem",
    title: "Which surprise are we removing?",
    body: "An irregular bill can go wrong in two ways. Nobody is accumulating toward it, or the couple disagrees about whose money it is. Which failure is v1 for?",
    recommendation:
      "Nothing is accumulating, so insurance, travel, or a repair arrives as a surprise. Disagreement about whose money it is can wait.",
  },
  {
    branch: "Sharing",
    title: "What can each person do?",
    body: "Shared could mean both people can see the goal, or that both can also change the target and record a planned contribution. What is v1?",
    recommendation:
      "Both people can see the target, the due date, and progress, and either can record a planned contribution. Neither action moves money at a bank.",
  },
  {
    branch: "Scope",
    title: "How many goals ship in v1?",
    body: "A couple might track one next bill, or a list such as insurance, travel, and repairs at the same time. What do we ship?",
    recommendation:
      "A list of named goals. The home view highlights the one due soonest so the screen stays quiet.",
  },
  {
    branch: "Amount",
    title: "Who picks the monthly amount?",
    body: "We could divide the target evenly across the months that are left, or leave the amount entirely to the couple. Which one?",
    recommendation:
      "Suggest an even monthly amount from the target and the due date, and let the couple override it. No yield, no investment, and no advice.",
  },
  {
    branch: "Risks",
    title: "What do we leave open?",
    body: "This can ship wrong if the monthly number sounds like advice, if shared is read as a bank transfer, or if two people overwrite one target. What stays unresolved in v1?",
    recommendation:
      "Label the monthly amount as arithmetic from the target and the due date, not as advice. Say on the screen that no money moves. When two people edit one target, last write wins, and the screen says so.",
  },
  {
    branch: "Non-goals",
    title: "What do we refuse?",
    body: "The tempting extras are a real transfer between bank accounts, inviting someone who is not on the plan, and replacing the cash-flow screen. Are those out?",
    recommendation:
      "No real transfer between bank accounts. No inviting someone who is not on the plan. No replacing the cash-flow screen.",
  },
];

const CONFLICT_QUESTION: Question = {
  branch: "Conflict",
  title: "What happens when you disagree?",
  body: "You treated disagreement as the problem, not the surprise bill. In v1, how does a conflict over the goal end?",
  recommendation: "Last write wins, and the screen says so. No vote and no approval step.",
};

function clip(idea: string, max = 180) {
  const trimmed = idea.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function freeformQuestions(idea: string): Question[] {
  const quoted = clip(idea);
  return [
    {
      branch: "Users",
      title: "Who is this for?",
      body: `Who feels the pain in "${quoted}" — one person using it alone, or a group?`,
      recommendation:
        "The person who feels that pain, using it alone. Not a team product in v1.",
    },
    {
      branch: "Problem",
      title: "Which moment does this remove?",
      body: "What is the moment they have to improvise today, because the product does not hold this yet?",
      recommendation:
        "The moment they have to keep the idea in their head, because nothing in the product remembers it.",
    },
    {
      branch: "Scope",
      title: "What is the smallest proof?",
      body: "What is the smallest version that would show the idea works?",
      recommendation:
        "One screen that does the core action. No accounts, no billing, and no notifications.",
    },
    {
      branch: "Risks",
      title: "Which assumption is load-bearing?",
      body: "If one guess is wrong, the rest of the work is wasted. Which guess is that?",
      recommendation:
        "That people want this often enough to open the app for it. If that is false, stop.",
    },
    {
      branch: "Non-goals",
      title: "What will you refuse?",
      body: "Name what v1 will not become, even if it is tempting.",
      recommendation: "No integrations, no sharing, and no automation. Those are a second product.",
    },
  ];
}

function questionsFor(idea: string, answered: Turn[]): Question[] {
  if (!isExampleIdea(idea)) return freeformQuestions(idea);
  const questions = [...EXAMPLE_QUESTIONS];
  const problem = answered.find((turn) => turn.branch === "Problem");
  if (
    problem &&
    !problem.accepted &&
    /disagree|whose money|ownership|fight|argue|conflict/i.test(problem.answer)
  ) {
    const sharing = questions.findIndex((question) => question.branch === "Sharing");
    questions.splice(sharing, 0, CONFLICT_QUESTION);
  }
  return questions;
}

function sentences(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()];
}

function answerFor(turns: Turn[], branch: string) {
  const match = [...turns].reverse().find((turn) => turn.branch === branch);
  return match?.answer.trim() ?? "";
}

function titleFor(idea: string) {
  if (isExampleIdea(idea)) return "Shared goals for irregular expenses";
  const words = idea.trim().replace(/[.]+$/, "").split(/\s+/).slice(0, 8).join(" ");
  return words.length > 64 ? `${words.slice(0, 61)}…` : words;
}

function buildSpec(idea: string, turns: Turn[]) {
  const example = isExampleIdea(idea);
  const scopeBranches = new Set(example ? ["Sharing", "Conflict", "Scope", "Amount"] : ["Scope"]);
  const scope = turns
    .filter((turn) => scopeBranches.has(turn.branch))
    .map((turn) => turn.answer.trim())
    .filter(Boolean)
    .join("\n\n");
  const corrections = turns
    .filter((turn) => turn.branch === "Confirm" && !turn.accepted)
    .map((turn) => `Still open: ${turn.answer.trim()}`);

  return {
    title: titleFor(idea),
    problem: answerFor(turns, "Problem"),
    users: answerFor(turns, "Users"),
    scope,
    openRisks: [...sentences(answerFor(turns, "Risks")), ...corrections],
    nonGoals: sentences(answerFor(turns, "Non-goals")),
  };
}

function settledFrom(turns: Turn[], confirmed: boolean) {
  const settled = turns
    .filter((turn) => turn.branch !== "Confirm")
    .map((turn) => ({ branch: turn.branch, decision: turn.answer.trim() }));
  for (const turn of turns) {
    if (turn.branch === "Confirm" && !turn.accepted) {
      settled.push({ branch: "Correction", decision: turn.answer.trim() });
    }
  }
  if (confirmed) {
    settled.push({ branch: "Shared understanding", decision: "Confirmed. Write the spec." });
  }
  return settled;
}

function progressFor(index: number, total: number, done: boolean): Progress {
  return {
    index: done ? total : index,
    total,
    percent: done ? 100 : Math.round(((index - 1) / total) * 100),
  };
}

interface MockResult {
  step: GrillStep;
  progress: Progress;
}

export function nextMock(idea: string, turns: Turn[]): MockResult {
  const substantive: Turn[] = [];
  for (const turn of turns) {
    if (turn.branch === "Confirm") {
      const questions = questionsFor(idea, substantive);
      if (substantive.length !== questions.length) {
        throw new Error("The confirmation arrived before the interview finished.");
      }
      continue;
    }
    const questions = questionsFor(idea, substantive);
    const expected = questions[substantive.length];
    if (!expected || turn.branch !== expected.branch) {
      throw new Error("That answer does not match the question that was asked.");
    }
    substantive.push(turn);
  }

  const questions = questionsFor(idea, substantive);
  const total = questions.length + 1;
  const last = turns[turns.length - 1];

  if (substantive.length < questions.length) {
    const question = questions[substantive.length];
    if (!question) throw new Error("The interview has no question to ask.");
    const remaining = questions.slice(substantive.length + 1).map((item) => item.branch);
    remaining.push("Confirm");
    const step = stepSchema.parse({
      status: "question",
      branch: question.branch,
      title: question.title,
      body: question.body,
      recommendation: question.recommendation,
      settled: settledFrom(substantive, false),
      remaining,
      spec: null,
    });
    return { step, progress: progressFor(substantive.length + 1, total, false) };
  }

  if (last?.branch === "Confirm" && last.accepted) {
    const step = stepSchema.parse({
      status: "spec",
      branch: "Spec",
      title: "Shared understanding",
      body: "The frontier is empty and you confirmed. Here is the spec.",
      recommendation: "",
      settled: settledFrom(turns, true),
      remaining: [],
      spec: buildSpec(idea, turns),
    });
    return { step, progress: progressFor(total, total, true) };
  }

  const note = last?.branch === "Confirm" && !last.accepted ? last.answer.trim() : "";
  const body = note
    ? `You wrote: “${note}”. Should the spec keep the decisions above and add that note as an open point?`
    : "Saying yes writes a one-page spec from the decisions above and stops the interview. If something is still wrong, say what to change.";
  const step = stepSchema.parse({
    status: "confirm",
    branch: "Confirm",
    title: "Is this a shared understanding?",
    body,
    recommendation: note
      ? "Yes. Add that note and write the spec."
      : "Yes. Write the spec from these decisions.",
    settled: settledFrom(turns.filter((turn) => turn.branch !== "Confirm" || !turn.accepted), false),
    remaining: [],
    spec: null,
  });
  return { step, progress: progressFor(total, total, false) };
}
