"use client";

// Tweaks panel — floating appearance/navigation controls.
// Adapted from the original prototype's tweaks-panel (host postMessage protocol
// dropped; values persist via the Lane provider + localStorage instead).

import React, { useEffect, useRef } from "react";
import { useLane } from "./lane-provider";

const TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    background:rgba(250,249,247,.82);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}
  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;background:transparent;
    color:inherit;font:inherit;font-weight:500;min-height:22px;border-radius:6px;cursor:pointer;
    padding:4px 6px;line-height:1.2;overflow-wrap:anywhere}
  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:pointer}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:40px;padding:0;border:0;border-radius:6px;
    overflow:hidden;cursor:pointer;box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),0 2px 6px rgba(0,0,0,.15)}
  .twk-fab{position:fixed;right:16px;bottom:16px;z-index:2147483645;width:40px;height:40px;
    border-radius:999px;border:0;cursor:pointer;color:#fff;
    background:var(--accent);box-shadow:0 8px 24px rgba(0,0,0,.28);
    display:grid;place-items:center;font-size:18px}
`;

function Seg({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const n = options.length;
  return (
    <div className="twk-seg" role="radiogroup">
      <div className="twk-seg-thumb" style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`, width: `calc((100% - 4px) / ${n})` }} />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TweaksPanel() {
  const { tweaks, setTweak, tweaksOpen, setTweaksOpen, setAuthenticated } = useLane();
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: TWEAKS_STYLE }} />
      {!tweaksOpen && (
        <button className="twk-fab" title="Tweaks" onClick={() => setTweaksOpen(true)}>
          ✦
        </button>
      )}
      {tweaksOpen && (
        <div className="twk-panel">
          <div className="twk-hd">
            <b>Tweaks</b>
            <button className="twk-x" aria-label="Close tweaks" onClick={() => setTweaksOpen(false)}>
              ✕
            </button>
          </div>
          <div className="twk-body">
            <div className="twk-sect">Appearance</div>
            <div className="twk-row">
              <div className="twk-lbl">
                <span>Theme</span>
              </div>
              <Seg
                value={tweaks.theme}
                options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]}
                onChange={(v) => setTweak("theme", v)}
              />
            </div>
            <div className="twk-row">
              <div className="twk-lbl">
                <span>Accent</span>
              </div>
              <div className="twk-chips" role="radiogroup">
                {["#6b7dff", "#22d3a0", "#f5b14c", "#f55b6e"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="twk-chip"
                    data-on={tweaks.accent === c ? "1" : "0"}
                    style={{ background: c }}
                    onClick={() => setTweak("accent", c)}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div className="twk-sect">Navigation</div>
            <div className="twk-row">
              <div className="twk-lbl">
                <span>Sidebar</span>
              </div>
              <Seg
                value={tweaks.sidebar}
                options={[
                  { value: "expanded", label: "Expanded" },
                  { value: "rail", label: "Rail" },
                  { value: "floating", label: "Floating" },
                ]}
                onChange={(v) => setTweak("sidebar", v)}
              />
            </div>

            <div className="twk-sect">Demo</div>
            <button type="button" className="twk-btn" onClick={() => setAuthenticated(false)}>
              Show auth flow
            </button>
          </div>
        </div>
      )}
    </>
  );
}
