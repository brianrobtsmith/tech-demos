"use client";

import { coverPhrase, formatAsOf, money } from "@/lib/format";
import type { AccountRow, AccountsFile } from "@/lib/types";

const KINDS: Record<string, string> = {
  checking: "This month’s spending",
  savings: "Covers what's due in the next 2 years",
  longTerm: "Everything beyond 2 years",
};

const YIELD_DISCLAIMER =
  "Target yields aren’t a promise. Returns can be lower, and long-term savings can lose value.";

function Nav({ active }: { active: "Accounts" | "Cash flow" }) {
  const tabs = ["Accounts", "Plans", "Cash flow"] as const;
  return (
    <div className="sa-nav" aria-hidden="true">
      {tabs.map((tab) => (
        <span key={tab} className={tab === active ? "on" : undefined}>
          {tab}
        </span>
      ))}
    </div>
  );
}

function targetLine(account: AccountRow): string {
  const yieldBit = account.targetYield
    ? `Target yield ${account.targetYield}`
    : null;
  if (account.role === "checking" && account.target != null) {
    return `Target ${money(account.target)} · 2 months of Monthly plans + Your Number`;
  }
  if (account.role === "savings" && account.target != null) {
    return `Target ${money(account.target)} · Covers what's due in the next 2 years${yieldBit ? ` · ${yieldBit}` : ""}`;
  }
  return `No fixed dollar target · ${yieldBit ?? "Target yield 5%+"} · the rest after Checking and Savings are topped up`;
}

function AccountBlock({ account }: { account: AccountRow }) {
  return (
    <div className="sa-acct">
      <div className="sa-row2">
        <div>
          <div className="sa-nm">{account.name}</div>
          {KINDS[account.role] ? (
            <div className="sa-kind">{KINDS[account.role]}</div>
          ) : null}
        </div>
        <div className="sa-amt">{money(account.balance)}</div>
      </div>
      <div className="sa-meta">{targetLine(account)}</div>
      <div className="sa-bar" aria-hidden="true">
        <i style={{ width: `${Math.max(0, Math.min(100, account.barPct))}%` }} />
      </div>
      <div className="sa-status">{account.status}</div>
      {account.meta ? <div className="sa-rate">{account.meta}</div> : null}
      {account.earnedThisYear ? (
        <div className="sa-rate">
          Earned this year: {money(account.earnedThisYear.amount)}{" "}
          {account.earnedThisYear.label}
        </div>
      ) : null}
      {typeof account.marketChangeYtd === "number" ? (
        <div className="sa-rate">
          {account.marketChangeYtd > 0 ? "+" : ""}
          {money(account.marketChangeYtd)} market change (separate from income)
        </div>
      ) : null}
      {account.role === "longTerm" ? (
        <div className="sa-rate">Past returns aren’t a promise of future results.</div>
      ) : null}
    </div>
  );
}

function ThreeAccounts({ data }: { data: AccountsFile }) {
  return (
    <>
      <div className="sa-sec">
        <span className="n">Your three accounts</span>
        <span className="dim">Fill order</span>
      </div>
      <div className="sa-acct-wrap">
        {data.accounts.map((account) => (
          <AccountBlock key={account.role} account={account} />
        ))}
      </div>
      <div className="sa-disclaimer">{YIELD_DISCLAIMER}</div>
    </>
  );
}

function Move({ data }: { data: AccountsFile }) {
  const move = data.suggestedMove;
  const order = ["checking", "savings", "longTerm"];
  const keys = Object.keys(move.beforeAfter).sort(
    (a, b) => order.indexOf(a) - order.indexOf(b),
  );
  return (
    <>
      <div className="sa-sec">
        <span className="n">Suggested move</span>
        <span className="dim">Primary saver</span>
      </div>
      <div className="sa-card">
        <div className="sa-move-title">{move.title}</div>
        <div className="sa-move-sub">{move.subtitle}</div>
        <div className="sa-ba">
          {keys.map((key) => {
            const pair = move.beforeAfter[key];
            const name =
              data.accounts.find((account) => account.role === key)?.name ?? key;
            if (!pair) return null;
            return (
              <div className="box" key={key}>
                <div className="sa-k">{name}</div>
                <div className="line">
                  <span>Before</span>
                  <b>{money(pair.before)}</b>
                </div>
                <div className="line">
                  <span>After</span>
                  <b>{money(pair.after)}</b>
                </div>
              </div>
            );
          })}
        </div>
        <button className="sa-btn" type="button">
          Approve and move
        </button>
        <button className="sa-btn-ghost" type="button">
          I’ll move it myself
        </button>
        <div className="sa-note">Moves only between your own accounts.</div>
      </div>
    </>
  );
}

function Retirement({ data }: { data: AccountsFile }) {
  return (
    <>
      <div className="sa-sec">
        <span className="n">Retirement</span>
        <span className="dim">Read-only · {money(data.totals.retirement)}</span>
      </div>
      <div className="sa-card sa-ret">
        {data.retirement.map((row) => (
          <div className="row" key={`${row.owner}-${row.name}`}>
            <div>
              <div className="sa-rn">{row.name}</div>
              <div className="sa-rm">
                {row.owner} · {row.detail}
                <br />
                As of {formatAsOf(row.asOf)}
              </div>
            </div>
            <div className="sa-rv">{money(row.balance)}</div>
          </div>
        ))}
        <div className="sa-honesty">
          Based on current IRS rules. Not tax advice. We never move retirement money.
        </div>
      </div>
    </>
  );
}

function Total({ data }: { data: AccountsFile }) {
  return (
    <div className="sa-total">
      <div className="sa-lbl">Total balance</div>
      <div className="sa-big">{money(data.totals.totalBalance)}</div>
      <div className="sa-subs">
        <div className="sa-subbox">
          <div className="sa-k">Non-retirement</div>
          <div className="sa-v">{money(data.totals.nonRetirement)}</div>
        </div>
        <div className="sa-subbox">
          <div className="sa-k">Retirement</div>
          <div className="sa-v">{money(data.totals.retirement)}</div>
        </div>
      </div>
    </div>
  );
}

export function AccountsScreen({
  data,
  frame,
}: {
  data: AccountsFile;
  frame: "desk" | "phone";
}) {
  const sub = `${data.household.label} · as of ${formatAsOf(data.household.asOf)}`;
  if (frame === "phone") {
    return (
      <div className="setaside">
        <div className="sa-phone">
          <div className="sa-title">Accounts</div>
          <div className="sa-sub">{sub}</div>
          <Total data={data} />
          <ThreeAccounts data={data} />
          <Move data={data} />
          <Retirement data={data} />
          <Nav active="Accounts" />
        </div>
      </div>
    );
  }

  return (
    <div className="setaside">
      <div className="sa-desk">
        <div className="sa-topbar">
          <div>
            <div className="sa-title">Accounts</div>
            <div className="sa-sub">{sub}</div>
          </div>
          <Nav active="Accounts" />
        </div>
        <div className="sa-layout">
          <div className="sa-col">
            <Total data={data} />
            <ThreeAccounts data={data} />
            <Move data={data} />
          </div>
          <div className="sa-col">
            <Retirement data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CashflowScreen({ data }: { data: AccountsFile }) {
  const flow = data.cashFlow;
  const counted = flow.investmentIncomeCounted === true;
  const outPct =
    flow.totalIn > 0
      ? Math.max(0, Math.min(100, (flow.moneyOut.total / flow.totalIn) * 100))
      : 0;
  const ahead = flow.difference >= 0;
  const diffText =
    flow.differenceLabel ??
    `${money(Math.abs(flow.difference))} ${ahead ? "ahead" : "short"}`;
  const people = flow.moneyIn;
  const first = people[0];
  const second = people[1];
  const lt = data.accounts.find((account) => account.role === "longTerm")?.balance ?? 0;
  const cost = flow.moneyOut.total;
  const inv = flow.investmentIncomeMonthly;
  const never = cost - inv;
  const isPark = data.household.label === "Dana & Sam Park";

  const oneIncome = (person: { person: string; takeHome: number }) => {
    const gap = cost - person.takeHome - inv;
    const short = gap > 0;
    const months = short ? lt / gap : 0;
    return { gap, short, months };
  };

  return (
    <div className="setaside">
      <div className="sa-desk">
        <div className="sa-topbar">
          <div>
            <div className="sa-title">Cash flow</div>
            <div className="sa-sub">{data.household.label} · each month</div>
          </div>
          <Nav active="Cash flow" />
        </div>
        <div className="sa-layout">
          <div className="sa-col">
            <div className="sa-sec">
              <span className="n">Money in</span>
              <span className="dim">Take-home</span>
            </div>
            <div className="sa-card">
              {people.map((person) => (
                <div className="sa-person" key={person.person}>
                  <div>
                    <div className="sa-nm">{person.person}</div>
                    <div className="sa-kind tight">Paychecks</div>
                  </div>
                  <div className="sa-amt-md">{money(person.takeHome)}</div>
                </div>
              ))}
              <div className="sa-inv">
                <div>
                  <div className="sa-nm" style={{ color: "var(--sa-muted)" }}>
                    Investment income
                  </div>
                  <div className="sa-kind tight">
                    Interest and dividends from Savings and Long-term savings · avg last 12 months
                  </div>
                </div>
                <div>
                  <div className="sa-amt-g">{money(inv)}/mo</div>
                  <div className="sa-rein">{flow.investmentIncomeNote ?? "Reinvested"}</div>
                </div>
              </div>
              <div className="sa-total-line">
                <div className="sa-nm">Total in</div>
                <div className="sa-amt-md">{money(flow.totalIn)}</div>
              </div>
              {counted ? null : (
                <div className="sa-meta">
                  + {money(inv)}/mo reinvested (not counted in Total in while both work)
                </div>
              )}
            </div>

            <div className="sa-sec">
              <span className="n">Money out</span>
              <span className="dim">From Plans</span>
            </div>
            <div className="sa-card">
              <div className="sa-person">
                <div>
                  <div className="sa-nm">Monthly plans</div>
                  <div className="sa-kind tight">Envelopes + debt minimums</div>
                </div>
                <div className="sa-amt-md">{money(flow.moneyOut.monthlyPlans)}</div>
              </div>
              <div className="sa-person">
                <div>
                  <div className="sa-nm">Your Number</div>
                  <div className="sa-kind tight">Future plans this month</div>
                </div>
                <div className="sa-amt-md">{money(flow.moneyOut.yourNumber)}</div>
              </div>
              <div className="sa-total-line">
                <div className="sa-nm">Total out</div>
                <div className="sa-amt-md">{money(flow.moneyOut.total)}</div>
              </div>
              <div className="sa-meta">
                Set on Plans. <span className="sa-link">Change in Plans</span>
              </div>
            </div>

            <div className="sa-sec">
              <span className="n">This month</span>
              <span className="dim">In vs out</span>
            </div>
            <div className="sa-card">
              <div className="sa-hline">
                <span className="lab">In</span>
                <div className="track">
                  <i style={{ width: "100%" }} />
                </div>
                <span className="v">{money(flow.totalIn)}</span>
              </div>
              <div className="sa-hline">
                <span className="lab">Out</span>
                <div className="track">
                  <i style={{ width: `${outPct}%` }} />
                </div>
                <span className="v">{money(flow.moneyOut.total)}</span>
              </div>
              <div className="sa-meta">
                Bars scaled to money in (paychecks). Blue only. Reinvested income not in the In bar.
              </div>
            </div>

            <div className="sa-diff">
              <div className="sa-lbl">Difference</div>
              <div className="sa-big" style={ahead ? undefined : { color: "var(--sa-muted)" }}>
                {diffText}
              </div>
              <div className="sa-meta">
                Each month. Extra goes to long-term savings through the suggested move on Accounts.
              </div>
            </div>

            <div className="sa-sec">
              <span className="n">Household setting</span>
              <span className="dim">Default</span>
            </div>
            <div className="sa-card">
              <div className="sa-setting">
                <div>
                  <div className="sa-nm" style={{ fontSize: 13 }}>
                    Count investment income every month
                  </div>
                  <div className="sa-meta">
                    Turn on if you live on it today, e.g. in retirement.
                  </div>
                </div>
                <div
                  className={counted ? "sa-tog on" : "sa-tog"}
                  aria-label={
                    counted
                      ? "Count investment income every month: on"
                      : "Count investment income every month: off"
                  }
                />
              </div>
            </div>
          </div>

          <div className="sa-col">
            <div className="sa-sec">
              <span className="n">Who needs to work?</span>
              <span className="dim">Estimates</span>
            </div>
            <div className="sa-card">
              <div className="sa-cost">
                Monthly cost <b>{money(cost)}</b> · Monthly plans {money(flow.moneyOut.monthlyPlans)} + Your Number {money(flow.moneyOut.yourNumber)}
                <br />
                {first ? (
                  <>
                    Take-home · {first.person} <b>{money(first.takeHome)}</b>/mo
                  </>
                ) : null}
                {second ? (
                  <>
                    {" "}
                    · {second.person} <b>{money(second.takeHome)}</b>/mo
                  </>
                ) : null}
                <br />
                Investment income <b>{money(inv)}</b>/mo (12-mo avg) · Long-term savings on hand: <b>{money(lt)}</b>
              </div>

              <div className="sa-scenario">
                <div className="sh">
                  <span className="sn">Both work</span>
                  <span className={ahead ? "sv" : "sv short"}>{diffText}</span>
                </div>
                <div className="sd">
                  {money(flow.totalIn)} in each month. Extra can go to Long-term savings.
                </div>
                <div className="math">
                  Investment income is reinvested (not counted while both work).
                </div>
              </div>

              {[first, second].filter(Boolean).map((person) => {
                const row = oneIncome(person!);
                return (
                  <div className="sa-scenario" key={person!.person}>
                    <div className="sh">
                      <span className="sn">Only {person!.person} works</span>
                      <span className={row.short ? "sv short" : "sv"}>
                        {money(Math.abs(row.gap))} {row.short ? "short" : "ahead"}
                      </span>
                    </div>
                    <div className="sd">
                      {row.short ? (
                        <>
                          Long-term savings cover that for about <b>{coverPhrase(row.months)}</b>.
                        </>
                      ) : (
                        "Take-home covers the month."
                      )}
                    </div>
                    <div className="math">
                      Counts {money(inv)}/mo of investment income.
                      {row.short
                        ? ` ${money(lt)} ÷ ${money(row.gap)} ≈ ${(lt / row.gap).toFixed(1)} months.`
                        : ""}{" "}
                      Income needed so savings never run out: about {money(never)}/mo (monthly cost minus investment income). Estimate, not a guarantee.
                    </div>
                  </div>
                );
              })}

              <div className="sa-scenario">
                <div className="sh">
                  <span className="sn">Neither works</span>
                  <span className={never > 0 ? "sv short" : "sv"}>
                    {money(Math.abs(never))} {never > 0 ? "short" : "ahead"}
                  </span>
                </div>
                <div className="sd">
                  Long-term savings last about{" "}
                  <b>{never > 0 ? coverPhrase(lt / never) : "the month"}</b>.
                </div>
                <div className="math">
                  Counts {money(inv)}/mo of investment income.
                  {never > 0
                    ? ` ${money(lt)} ÷ ${money(never)} ≈ ${(lt / never).toFixed(1)} months.`
                    : ""}{" "}
                  Retirement money: {money(data.totals.retirement)} today.
                  {data.retirement[0]
                    ? ` ${data.retirement[0].owner}’s ${data.retirement[0].name} is ${data.retirement[0].detail}${isPark ? " (example)" : ""}.`
                    : ""}
                </div>
                {isPark ? (
                  <>
                    <div className="sa-forecast">
                      <div className="f">
                        <div className="fk">Bear</div>
                        <div className="fv">$520k</div>
                      </div>
                      <div className="f">
                        <div className="fk">Base</div>
                        <div className="fv">$710k</div>
                      </div>
                      <div className="f">
                        <div className="fk">Bull</div>
                        <div className="fv">$980k</div>
                      </div>
                    </div>
                    <div className="math">
                      Estimates at Dana’s 401(k) availability in 2039. Assumes stated growth rates. Estimate, not a guarantee. Can be lower; balances can lose value.
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
