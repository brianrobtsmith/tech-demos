"use client";

import type { ReactNode } from "react";
import "./setaside.css";

export function ProductFrame({
  treatment,
  shot,
  children,
}: {
  treatment: "with" | "without";
  shot: "desk" | "phone";
  children: ReactNode;
}) {
  if (treatment === "with") {
    return <div className="sa-ground">{children}</div>;
  }

  return (
    <div className="sa-shotwrap">
      <div className="sa-shotbar">
        <span className="sa-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="sa-url">screenshot</span>
      </div>
      <div className={shot === "phone" ? "sa-shotframe tall" : "sa-shotframe"}>
        <div
          className="sa-shotscale"
          style={{ width: shot === "phone" ? 390 : 1040 }}
        >
          {children}
        </div>
      </div>
      <div className="sa-chips" aria-hidden="true">
        <span>Header</span>
        <span>Sidebar</span>
        <span>Cards</span>
        <span>Chart</span>
      </div>
    </div>
  );
}

export function Still({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="text-xs font-medium text-muted-foreground">
        {label}
      </figcaption>
      {children}
    </figure>
  );
}
