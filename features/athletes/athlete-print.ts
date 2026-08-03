// One printable dossier per athlete, used by the Print button on both the
// athlete peek drawer and the full profile. Follows the same convention as the
// global Print menu: a styled HTML document downloaded as .doc, which Word (and
// any browser) opens and prints.

import { downloadWordDoc } from "@/utils";
import { athleteListName } from "@/utils/athlete";
import { fmtDob, todayIso } from "@/utils/dates";
import { detailsHtml as details, esc, tableHtml as table } from "@/utils/print";
import type { Athlete, Competition, Passport, RaceEntry, Visa } from "@/lib/types";

export function printAthleteDossier({
  athlete,
  entries,
  competitions,
  passports,
  visas,
  t,
  locale,
}: {
  athlete: Athlete;
  entries: RaceEntry[];
  competitions: Competition[];
  passports: Passport[];
  visas: Visa[];
  t: (k: string, vars?: Record<string, string | number>) => string;
  locale: string;
}) {
  const compOf = (id: string) => competitions.find((c) => c.id === id);
  const dateOf = (e: RaceEntry) => compOf(e.competitionId)?.date || "";
  const today = new Date();
  const cutoff = todayIso();

  const mine = entries.filter((e) => e.athleteId === athlete.id);
  const upcoming = mine.filter((e) => dateOf(e) >= cutoff).sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
  const past = mine.filter((e) => dateOf(e) && dateOf(e) < cutoff).sort((a, b) => dateOf(b).localeCompare(dateOf(a)));
  const myPassports = passports.filter((p) => p.athleteId === athlete.id);
  const myVisas = visas.filter((v) => v.athleteId === athlete.id && !v.archived);

  const name = athleteListName(athlete);
  const w = athlete.whereabouts;

  const parts: string[] = [];

  parts.push(`<h1>${esc(name)}</h1>`);
  parts.push(
    `<p class="sub">${esc(
      [athlete.nationality, athlete.specialty, athlete.age ? `${athlete.age} ${t("prof.yrs")}` : "", t(`status.${athlete.status}`)]
        .filter(Boolean)
        .join(" · ")
    )}</p>`
  );

  parts.push(`<h2>${esc(t("prof.personalDetails"))}</h2>`);
  parts.push(
    details([
      [t("prof.born"), [fmtDob(athlete.dob), athlete.placeOfBirth].filter(Boolean).join(" · ")],
      [t("prof.nationality"), athlete.nationality],
      [t("prof.residence"), athlete.residence],
      [t("prof.email"), athlete.contact?.email || athlete.email],
      [t("prof.phone"), athlete.contact?.phone],
      [t("prof.marital"), athlete.maritalStatus],
      [t("prof.employ"), athlete.employment],
      [t("prof.taxCode"), athlete.taxCode],
      [t("prof.fidal"), athlete.fidalNumber],
      [t("prof.club"), athlete.club],
      [t("prof.coach"), athlete.coach],
      [t("prof.joined"), athlete.joined],
    ])
  );

  parts.push(`<h2>${esc(t("prof.physicalKit"))}</h2>`);
  parts.push(
    details([
      [t("prof.height"), athlete.height ? `${athlete.height} ${athlete.heightUnit || "cm"}` : ""],
      [t("prof.weight"), athlete.weight ? `${athlete.weight} ${athlete.weightUnit || "kg"}` : ""],
      [t("prof.sponsor"), athlete.sponsor],
      [t("prof.shoes"), athlete.shoeSize],
      [t("prof.clothing"), athlete.clothingSize],
    ])
  );

  // Personal bests, each with where it was set.
  const pbRows = Object.entries(athlete.pb || {})
    .filter(([, mark]) => mark)
    .map(([disc, mark]) => {
      const meta = athlete.pbMeta?.[disc];
      const c = meta?.competitionId ? compOf(meta.competitionId) : undefined;
      return [disc, mark, c?.name || "", meta?.date || "", meta?.place ? `#${meta.place}` : "", meta?.venue || c?.location || ""];
    });
  parts.push(`<h2>${esc(t("prof.personalBests"))}</h2>`);
  parts.push(table([t("cd.discipline"), t("prof.personalBests"), t("athlete.competition"), t("athlete.date"), t("athlete.place"), t("cd.venue")], pbRows));

  if (w && (w.address || w.availableFrom)) {
    parts.push(`<h2>${esc(t("prof.whereabouts"))}</h2>`);
    parts.push(
      details([
        [t("prof.waAddress"), w.address],
        [t("prof.waAvailable"), w.availableFrom || w.availableTo ? `${w.availableFrom || "—"} → ${w.availableTo || "—"}` : ""],
        [t("prof.waPeriodFrom"), w.fromDate],
        [t("prof.waPeriodTo"), w.toDate],
        [t("prof.waNote"), w.note],
        [t("prof.waUpdated"), w.updated],
      ])
    );
  }

  parts.push(`<h2>${esc(t("prof.competitions"))} (${upcoming.length})</h2>`);
  parts.push(
    table(
      [t("athlete.date"), t("athlete.competition"), t("cd.discipline"), t("common.status")],
      upcoming.map((e) => {
        const c = compOf(e.competitionId);
        return [dateOf(e), c?.name || "", e.discipline || "", t(`entry.${e.status}`)];
      })
    )
  );

  parts.push(`<h2>${esc(t("prof.history"))} (${past.length})</h2>`);
  parts.push(
    table(
      [t("athlete.date"), t("athlete.competition"), t("cd.discipline"), t("athlete.place"), t("athlete.time")],
      past.map((e) => {
        const c = compOf(e.competitionId);
        return [dateOf(e), c?.name || "", e.discipline || "", e.position ? `#${e.position}` : e.note || "", e.time || ""];
      })
    )
  );

  parts.push(`<h2>${esc(t("trav.passports"))}</h2>`);
  parts.push(
    table(
      [t("trav.number"), t("trav.nation"), t("trav.issued"), t("trav.expiry")],
      myPassports.map((p) => [p.number || "", p.nation || "", p.issued || "", p.expiry || ""])
    )
  );

  parts.push(`<h2>${esc(t("trav.visas"))}</h2>`);
  parts.push(
    table(
      [t("trav.type"), t("trav.number"), t("trav.validFrom"), t("trav.validTo"), t("trav.embassy")],
      myVisas.map((v) => [v.type || v.kind, v.number || "", v.validFrom || "", v.validTo || "", v.embassy || ""])
    )
  );

  if (athlete.bio) {
    parts.push(`<h2>${esc(t("prof.bio"))}</h2>`);
    parts.push(`<p class="bio">${esc(athlete.bio)}</p>`);
  }

  parts.push(`<p class="sub" style="margin-top:18pt">${esc(t("prof.printedOn"))} ${esc(today.toLocaleDateString(locale))}</p>`);

  const slug = `${athlete.last}-${athlete.first}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "athlete";
  downloadWordDoc(`athlete-${slug}`, parts.join(""), name);
}
