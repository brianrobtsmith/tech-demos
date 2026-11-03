"use client";

import { useEffect, useRef, useState } from "react";
import { formatAsOf, money } from "@/lib/format";
import type { AccountsFile } from "@/lib/types";

function useOnceVisible<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);
  return [ref, visible] as const;
}

function ConnectStill({ data }: { data: AccountsFile }) {
  const [ref, visible] = useOnceVisible<HTMLDivElement>();
  const [step, setStep] = useState(0);
  const checking = data.accounts.find((account) => account.role === "checking");

  useEffect(() => {
    if (!visible) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = (reduce ? [3] : [0, 1, 2, 3]).map((next, index) =>
      window.setTimeout(() => setStep(next), reduce ? 0 : index * 1400),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [visible]);

  return (
    <div className="sa-state" ref={ref}>
      {step === 0 ? (
        <>
          <div className="sa-lbl">Accounts</div>
          <div className="sa-nm" style={{ margin: "8px 0 4px" }}>
            Connect your accounts (recommended)
          </div>
          <div className="sa-meta">Balances show up here after you connect a bank.</div>
          <button className="sa-btn" type="button">
            Connect your bank
          </button>
          <div className="sa-note">Prefer not to connect? Upload statements instead.</div>
        </>
      ) : null}
      {step === 1 ? (
        <>
          <div className="sa-nm">Before you connect</div>
          <div className="sa-meta" style={{ marginTop: 8 }}>
            We&apos;ll read balances and transactions to help your plan. We never see your bank password. We don&apos;t move money from this step.
          </div>
          <button className="sa-btn" type="button" style={{ marginTop: 12 }}>
            Continue
          </button>
        </>
      ) : null}
      {step === 2 ? (
        <>
          <div className="sa-nm">Choose a bank</div>
          <div className="sa-picker">
            <button type="button" className="on">
              Example Bank
            </button>
            <button type="button">North Credit Union</button>
            <button type="button">Harbor Trust</button>
          </div>
        </>
      ) : null}
      {step === 3 ? (
        <>
          <div className="sa-nm">Example Bank connected</div>
          <div className="sa-meta">Getting your history…</div>
          <div className="sa-bar">
            <i style={{ width: "64%" }} />
          </div>
          <div className="sa-row2" style={{ marginTop: 10 }}>
            <div>
              <div className="sa-nm">{checking?.name ?? "Checking"}</div>
              <div className="sa-kind">
                ···{checking?.mask ?? "8049"}
              </div>
            </div>
            <div className="sa-amt">{money(checking?.balance ?? 0)}</div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SyncingStill() {
  return (
    <div className="sa-state">
      <div className="sa-nm">Updating balances…</div>
      <div className="sa-bar indet" style={{ marginTop: 12 }}>
        <i />
      </div>
      <div className="sa-meta">
        Balances and purchases update after your bank sends them—usually within a day, often sooner. Not the second you swipe.
      </div>
    </div>
  );
}

function LiveUpdateStill({ data }: { data: AccountsFile }) {
  const checking = data.accounts.find((account) => account.role === "checking");
  const target = checking?.balance ?? 0;
  const [ref, visible] = useOnceVisible<HTMLDivElement>();
  const from = Math.max(0, target - 1200);
  const [value, setValue] = useState(from);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const id = window.setTimeout(() => {
        setValue(target);
        setDone(true);
      }, 0);
      return () => window.clearTimeout(id);
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1100);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDone(true);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, target, from]);

  return (
    <div className="sa-state" ref={ref}>
      <div className="sa-lbl">Checking ···{checking?.mask ?? "8049"}</div>
      <div className="sa-tick" style={{ marginTop: 6 }}>
        {money(value)}
      </div>
      <div className="sa-status" style={{ marginTop: 8 }}>
        {done ? "Balance updated" : "Updating balances…"}
      </div>
    </div>
  );
}

function ReauthStill() {
  return (
    <div className="sa-state">
      <div className="sa-banner">
        <p>Reconnect Example Bank to keep balances current</p>
        <button className="sa-btn" type="button">
          Reconnect
        </button>
      </div>
      <div className="sa-meta">
        Example Bank needs you to sign in again. Balances stay as of the last update until you do.
      </div>
    </div>
  );
}

function DisconnectStill({ data }: { data: AccountsFile }) {
  const [ref, visible] = useOnceVisible<HTMLDivElement>();
  const [removed, setRemoved] = useState(false);
  const checking = data.accounts.find((account) => account.role === "checking");

  useEffect(() => {
    if (!visible) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => setRemoved(true), reduce ? 0 : 1500);
    return () => window.clearTimeout(id);
  }, [visible]);

  return (
    <div className="sa-state" ref={ref}>
      {removed ? (
        <>
          <div className="sa-nm">Example Bank disconnected</div>
          <div className="sa-status" style={{ marginTop: 6 }}>
            Disconnected · data as of {formatAsOf(data.household.asOf)}
          </div>
          <div className="sa-meta">Your plan and past suggestions stay.</div>
        </>
      ) : (
        <>
          <div className="sa-row2">
            <div>
              <div className="sa-nm">Example Bank</div>
              <div className="sa-kind">
                {checking?.name ?? "Checking"} ···{checking?.mask ?? "8049"}
              </div>
            </div>
            <div className="sa-amt">{money(checking?.balance ?? 0)}</div>
          </div>
          <div className="sa-meta" style={{ marginTop: 10 }}>
            Disconnect Example Bank? We&apos;ll stop updating these accounts. Your plan and past suggestions stay unless you delete them.
          </div>
          <button className="sa-btn" type="button">
            Disconnect
          </button>
        </>
      )}
    </div>
  );
}

function price(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function StaleStill({ data }: { data: AccountsFile }) {
  const holdings =
    data.accounts.find((account) => account.holdings && account.holdings.length > 0)
      ?.holdings ?? [];
  return (
    <div className="sa-state">
      <div className="sa-nm">Long-term savings</div>
      <div className="sa-kind">Holdings</div>
      {holdings.length === 0 ? (
        <div className="sa-meta">No holdings in this file.</div>
      ) : (
        holdings.map((holding) => (
          <div className="sa-hold" key={holding.symbol}>
            <div>
              <div className="sa-sym">
                {holding.symbol}{" "}
                <span className="sa-kind">{holding.name}</span>
              </div>
              <div className="sa-stale">
                {holding.shares} shares · {price(holding.price)}
              </div>
              <div className="sa-stale">
                {holding.stale
                  ? `Price may be stale · as of ${formatAsOf(holding.asOf)}`
                  : `As of ${formatAsOf(holding.asOf)}`}
              </div>
            </div>
            <div className="sa-amt" style={{ fontSize: 16 }}>
              {price(holding.shares * holding.price)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const STATE_COPY = [
  ["Connect", "Connect your bank"],
  ["Syncing", "Updating balances…"],
  ["Live update", "Balance updates after sync"],
  ["Sign in again", "Reconnect Example Bank to keep balances current"],
  ["Disconnect", "Remove Example Bank"],
  ["Stale price", "Price as of the last good quote"],
] as const;

export function StateStills({
  data,
  treatment,
}: {
  data: AccountsFile;
  treatment: "with" | "without";
}) {
  if (treatment === "without") {
    return (
      <div className="setaside">
        <div className="sa-flatgrid">
          {STATE_COPY.map(([name, line]) => (
            <div className="sa-flatcell" key={name}>
              <div className="k">{name}</div>
              <div className="sa-status">{line}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="setaside">
      <div className="sa-states two">
        <ConnectStill data={data} />
        <SyncingStill />
        <LiveUpdateStill data={data} />
        <ReauthStill />
        <DisconnectStill data={data} />
        <StaleStill data={data} />
      </div>
    </div>
  );
}
