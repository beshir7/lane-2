"use client";

// Athlete disciplines — the two-column discipline picker from the old Dema DB
// (photo_32 / caption 5). Left = the athlete's selected disciplines (shown in
// the personal best), right = every available discipline. The « / » keys move
// disciplines between the two lists.

import React, { useState } from "react";
import { Modal } from "@/components/primitives";
import { useLane } from "@/components/lane-provider";
import { ALL_DISCIPLINES } from "@/lib/reference";

function DisciplineList({
  title,
  items,
  checked,
  toggle,
}: {
  title: string;
  items: string[];
  checked: Set<string>;
  toggle: (d: string) => void;
}) {
  return (
    <div className="col" style={{ gap: 6, flex: 1, minWidth: 0 }}>
      <div className="field-label">{title}</div>
      <div
        style={{
          border: "1px solid var(--border-1)",
          borderRadius: 8,
          background: "var(--bg-2)",
          height: 260,
          overflowY: "auto",
          padding: 4,
        }}
      >
        {items.length === 0 ? (
          <div className="text-xs muted" style={{ padding: 8 }}>—</div>
        ) : (
          items.map((d) => (
            <label
              key={d}
              className="row"
              style={{ gap: 8, padding: "5px 8px", borderRadius: 6, cursor: "pointer", background: checked.has(d) ? "var(--accent-soft)" : "transparent" }}
            >
              <input type="checkbox" checked={checked.has(d)} onChange={() => toggle(d)} />
              <span className="text-sm">{d}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

export function DisciplinePicker({
  selected: initial,
  onClose,
  onSave,
}: {
  selected: string[];
  onClose: () => void;
  onSave: (disciplines: string[]) => void;
}) {
  const { t } = useLane();
  const [selected, setSelected] = useState<string[]>(initial);
  const [checkedLeft, setCheckedLeft] = useState<Set<string>>(new Set());
  const [checkedRight, setCheckedRight] = useState<Set<string>>(new Set());

  const available = ALL_DISCIPLINES.filter((d) => !selected.includes(d));

  const toggle = (set: React.Dispatch<React.SetStateAction<Set<string>>>) => (d: string) =>
    set((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });

  // « — pull checked "all" disciplines into the athlete's list.
  const addToAthlete = () => {
    if (checkedRight.size === 0) return;
    setSelected((prev) => [...prev, ...ALL_DISCIPLINES.filter((d) => checkedRight.has(d))]);
    setCheckedRight(new Set());
  };

  // » — remove checked disciplines from the athlete's list.
  const removeFromAthlete = () => {
    if (checkedLeft.size === 0) return;
    setSelected((prev) => prev.filter((d) => !checkedLeft.has(d)));
    setCheckedLeft(new Set());
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("disc.title")}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.exit")}</button>
          <button className="btn btn-primary" onClick={() => onSave(selected)}>{t("common.modify")}</button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <div className="text-sm muted">{t("disc.hint")}</div>
        <div className="row" style={{ gap: 12, alignItems: "center" }}>
          <DisciplineList
            title={t("disc.athlete")}
            items={selected}
            checked={checkedLeft}
            toggle={toggle(setCheckedLeft)}
          />
          <div className="col" style={{ gap: 8 }}>
            <button className="btn btn-secondary" title={t("common.add")} onClick={addToAthlete}>&laquo;</button>
            <button className="btn btn-secondary" title={t("common.remove")} onClick={removeFromAthlete}>&raquo;</button>
          </div>
          <DisciplineList
            title={t("disc.all")}
            items={available}
            checked={checkedRight}
            toggle={toggle(setCheckedRight)}
          />
        </div>
      </div>
    </Modal>
  );
}
