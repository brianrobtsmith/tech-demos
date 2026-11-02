export type Holding = {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  asOf: string;
  stale?: boolean;
};

export type AccountRow = {
  role: string;
  name: string;
  balance: number;
  target: number | null;
  status: string;
  barPct: number;
  meta?: string;
  mask?: string;
  targetYield?: string;
  earnedThisYear?: { amount: number; label: string };
  marketChangeYtd?: number;
  holdings?: Holding[];
};

export type AccountsFile = {
  household: { label: string; asOf: string };
  totals: {
    totalBalance: number;
    nonRetirement: number;
    retirement: number;
  };
  accounts: AccountRow[];
  suggestedMove: {
    amount: number;
    fromRole: string;
    toRole: string;
    title: string;
    subtitle: string;
    beforeAfter: Record<string, { before: number; after: number }>;
  };
  retirement: Array<{
    name: string;
    owner: string;
    balance: number;
    detail: string;
    asOf: string;
  }>;
  cashFlow: {
    moneyIn: Array<{ person: string; takeHome: number }>;
    totalIn: number;
    investmentIncomeMonthly: number;
    investmentIncomeCounted?: boolean;
    investmentIncomeNote?: string;
    moneyOut: { monthlyPlans: number; yourNumber: number; total: number };
    difference: number;
    differenceLabel?: string;
  };
};

export type IdeaRow = {
  name: string;
  kind: string;
  value: string;
  barPct: number;
  status: string;
};

export type IdeaStill = {
  id: string;
  caption: string;
  frame: "window" | "phone";
  title: string;
  subtitle: string;
  heroLabel: string;
  heroValue: string;
  rows: IdeaRow[];
};

export type IdeaScene = {
  productName: string;
  summary: string;
  stills: IdeaStill[];
  bento: {
    statValue: string;
    statLabel: string;
    statement: string;
    bars: Array<{ label: string; pct: number; value: string }>;
  };
};

export type SideCopy = {
  headline: string;
  captions: {
    desktop: string;
    phone: string;
    cashflow: string;
    states: string;
  };
};

export type ShowResponse = {
  mode: "mock" | "live";
  provider: string | null;
  model: string | null;
  dataSource: "sample" | "local" | "none";
  kind: "preset" | "idea";
  notice: string | null;
  withStageshow: SideCopy;
  withoutStageshow: SideCopy;
  accounts: AccountsFile | null;
  idea: {
    withStageshow: IdeaScene;
    withoutStageshow: IdeaScene;
  } | null;
};
