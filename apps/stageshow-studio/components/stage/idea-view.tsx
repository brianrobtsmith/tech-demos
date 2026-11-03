"use client";

import type { IdeaScene } from "@/lib/types";

function Rows({ scene, stillIndex }: { scene: IdeaScene; stillIndex: number }) {
  const still = scene.stills[stillIndex];
  if (!still) return null;
  const phone = still.frame === "phone";
  return (
    <div className={phone ? "sa-idea-phone" : "sa-idea-window"}>
      <div className="sa-title" style={{ fontSize: phone ? 22 : 24 }}>
        {still.title}
      </div>
      <div className="sa-sub">{still.subtitle}</div>
      <div className="sa-total">
        <div className="sa-lbl">{still.heroLabel}</div>
        <div className="sa-big">{still.heroValue}</div>
      </div>
      <div className="sa-acct-wrap">
        {still.rows.map((row) => (
          <div className="sa-acct" key={`${row.name}-${row.value}`}>
            <div className="sa-row2">
              <div>
                <div className="sa-nm">{row.name}</div>
                {row.kind ? <div className="sa-kind">{row.kind}</div> : null}
              </div>
              <div className="sa-amt">{row.value}</div>
            </div>
            <div className="sa-bar">
              <i style={{ width: `${row.barPct}%` }} />
            </div>
            <div className="sa-status">{row.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IdeaStillView({
  scene,
  index,
}: {
  scene: IdeaScene;
  index: number;
}) {
  return (
    <div className="setaside">
      <Rows scene={scene} stillIndex={index} />
    </div>
  );
}

export function IdeaBento({
  scene,
  treatment,
}: {
  scene: IdeaScene;
  treatment: "with" | "without";
}) {
  if (treatment === "without") {
    return (
      <div className="setaside">
        <div className="sa-flatgrid">
          <div className="sa-flatcell">
            <div className="k">Stat</div>
            <div className="n">{scene.bento.statValue}</div>
          </div>
          <div className="sa-flatcell">
            <div className="k">Note</div>
            <div className="sa-status">{scene.bento.statement}</div>
          </div>
          {scene.bento.bars.map((bar) => (
            <div className="sa-flatcell" key={bar.label}>
              <div className="k">{bar.label}</div>
              <div className="n">{bar.value}</div>
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
            <b>{scene.productName}. </b>
            <span>{scene.summary}</span>
          </div>
          <div className="sa-big">{scene.bento.statValue}</div>
          <div className="sa-stat-label">{scene.bento.statLabel}</div>
        </div>
        <div className="sa-tile">
          <p className="sa-statement">{scene.bento.statement}</p>
        </div>
        <div className="sa-tile sa-tile-wide">
          {scene.bento.bars.map((bar) => (
            <div className="sa-hline" key={bar.label}>
              <span className="lab">{bar.label}</span>
              <div className="track">
                <i style={{ width: `${bar.pct}%` }} />
              </div>
              <span className="v">{bar.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
