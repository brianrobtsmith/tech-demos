"use client";

import { money } from "@/lib/format";
import type { AccountsFile } from "@/lib/types";

export function AccountsBento({
  data,
  treatment,
}: {
  data: AccountsFile;
  treatment: "with" | "without";
}) {
  const checking = data.accounts.find((account) => account.role === "checking");
  const ahead = data.cashFlow.difference >= 0;
  const diff = money(Math.abs(data.cashFlow.difference));
  const outPct =
    data.cashFlow.totalIn > 0
      ? Math.max(
          0,
          Math.min(100, (data.cashFlow.moneyOut.total / data.cashFlow.totalIn) * 100),
        )
      : 0;

  if (treatment === "without") {
    const cells = [
      ["Total", money(data.totals.totalBalance)],
      ["Ahead", `${ahead ? "" : "−"}${diff}`],
      ["Move", money(data.suggestedMove.amount)],
      ["Out", money(data.cashFlow.moneyOut.total)],
    ];
    return (
      <div className="setaside">
        <div className="sa-flatgrid">
          {cells.map(([label, value]) => (
            <div className="sa-flatcell" key={label}>
              <div className="k">{label}</div>
              <div className="n" style={label === "Ahead" && !ahead ? { color: "#64748b" } : undefined}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="setaside">
      <div className="sa-bento">
        <div className="sa-tile sa-tile-hero">
          <div className="sa-tile-copy">
            <b>Accounts. </b>
            <span>One total, then the sleeve you spend from.</span>
          </div>
          <div className="sa-total" style={{ marginBottom: 10 }}>
            <div className="sa-lbl">Total balance</div>
            <div className="sa-big" style={{ fontSize: 32 }}>
              {money(data.totals.totalBalance)}
            </div>
          </div>
          {checking ? (
            <div className="sa-card" style={{ marginBottom: 0 }}>
              <div className="sa-row2">
                <div>
                  <div className="sa-nm">{checking.name}</div>
                  <div className="sa-kind">This month&apos;s spending</div>
                </div>
                <div className="sa-amt">{money(checking.balance)}</div>
              </div>
              <div className="sa-bar" style={{ marginTop: 8 }}>
                <i style={{ width: "100%" }} />
              </div>
              <div className="sa-status">{checking.status}</div>
            </div>
          ) : null}
        </div>
        <div className="sa-tile">
          <div className="sa-stat-lead">Each month</div>
          <div
            className="sa-stat-num"
            style={ahead ? undefined : { color: "#64748b" }}
          >
            {diff}
          </div>
          <div className="sa-stat-label">{ahead ? "ahead" : "short"}</div>
        </div>
        <div className="sa-tile">
          <div className="sa-k">Suggested move</div>
          <p className="sa-statement">{data.suggestedMove.title}</p>
        </div>
        <div className="sa-tile sa-tile-wide">
          <div className="sa-tile-copy">
            <b>Cash flow. </b>
            <span>Paychecks in, plans out.</span>
          </div>
          <div className="sa-hline">
            <span className="lab">In</span>
            <div className="track">
              <i style={{ width: "100%" }} />
            </div>
            <span className="v">{money(data.cashFlow.totalIn)}</span>
          </div>
          <div className="sa-hline">
            <span className="lab">Out</span>
            <div className="track">
              <i style={{ width: `${outPct}%` }} />
            </div>
            <span className="v">{money(data.cashFlow.moneyOut.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
