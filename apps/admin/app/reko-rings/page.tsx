"use client";

import { FormEvent, useEffect, useState } from "react";
import { gql } from "@/lib/api";

type Schedule = { id: string; frequency: string; weekday: number; startTime: string; endTime: string; timezone: string; active: boolean };
type RekoRing = { id: string; countryCode: string; country: string; regionCode?: string; regionName?: string; municipalityCode?: string; municipality: string; name: string; addressLine: string; postalCode?: string; active: boolean; createdAt: string; updatedAt: string; schedule?: Schedule };
type Option = { code: string; name: string };
type StatMap = { sourceItem: { code: string; classificationItemNames: { name: string }[] }; targetItem: { code: string; classificationItemNames: { name: string }[] } };

const fields = `id countryCode country regionCode regionName municipalityCode municipality name addressLine postalCode active createdAt updatedAt schedule{id frequency weekday startTime endTime timezone active}`;
const areaApi = "https://api.stat.fi/classificationservice/open/api/classifications/v2/correspondenceTables/kunta_1_20260101%23maakunta_1_20260101/maps?content=data&format=json&lang=en&meta=min";
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function RekoRingsPage() {
  const [rings, setRings] = useState<RekoRing[]>([]);
  const [editing, setEditing] = useState<RekoRing>();
  const [regions, setRegions] = useState<Option[]>([]);
  const [municipalities, setMunicipalities] = useState<Record<string, Option[]>>({});
  const [regionCode, setRegionCode] = useState("");
  const [municipalityCode, setMunicipalityCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await gql<{ adminRekoRings: RekoRing[] }>(`query { adminRekoRings { ${fields} } }`);
      setRings(data.adminRekoRings);
    } catch (reason) { setError((reason as Error).message); }
  }

  useEffect(() => {
    load();
    fetch(areaApi).then((response) => response.json()).then((rows: StatMap[]) => {
      const regionMap = new Map<string, string>();
      const municipalityMap: Record<string, Option[]> = {};
      for (const row of rows) {
        const region = { code: row.targetItem.code, name: row.targetItem.classificationItemNames[0].name };
        const municipality = { code: row.sourceItem.code, name: row.sourceItem.classificationItemNames[0].name };
        regionMap.set(region.code, region.name);
        (municipalityMap[region.code] ??= []).push(municipality);
      }
      setRegions([...regionMap].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name)));
      Object.values(municipalityMap).forEach((items) => items.sort((a, b) => a.name.localeCompare(b.name)));
      setMunicipalities(municipalityMap);
    }).catch(() => setError("The official Finnish municipality directory could not be loaded."));
  }, []);

  function edit(ring?: RekoRing) {
    setEditing(ring);
    setRegionCode(ring?.regionCode ?? "");
    setMunicipalityCode(ring?.municipalityCode ?? "");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const region = regions.find((item) => item.code === regionCode);
    const municipality = (municipalities[regionCode] ?? []).find((item) => item.code === municipalityCode);
    if (!region || !municipality) { setError("Select a Finnish region and municipality."); setBusy(false); return; }
    const input = {
      countryCode: "FI", country: "Finland", regionCode, regionName: region.name,
      municipalityCode, municipality: municipality.name,
      name: String(values.get("name") || "").trim(), addressLine: String(values.get("addressLine") || "").trim(),
      postalCode: String(values.get("postalCode") || "").trim() || null,
      frequency: String(values.get("frequency") || "WEEKLY"), weekday: Number(values.get("weekday")),
      startTime: String(values.get("startTime") || ""), endTime: String(values.get("endTime") || ""),
    };
    try {
      if (editing) await gql(`mutation($ringId:String!,$input:RekoRingInput!){updateRekoRing(ringId:$ringId,input:$input){id}}`, { ringId: editing.id, input });
      else await gql(`mutation($input:RekoRingInput!){createRekoRing(input:$input){id}}`, { input });
      setMessage(`${input.name} was ${editing ? "updated" : "added"}.`); form.reset(); edit(); await load();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }

  async function toggle(ring: RekoRing) {
    setBusy(true); setError("");
    try { await gql(`mutation($ringId:String!,$active:Boolean!){setRekoRingActive(ringId:$ringId,active:$active){id}}`, { ringId: ring.id, active: !ring.active }); await load(); }
    catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }

  async function remove(ring: RekoRing) {
    if (!window.confirm(`Permanently delete ${ring.name}?`)) return;
    setBusy(true); setError("");
    try { await gql(`mutation($ringId:String!){deleteRekoRing(ringId:$ringId)}`, { ringId: ring.id }); if (editing?.id === ring.id) edit(); await load(); }
    catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }

  return <>
    <header className="page-head"><div><p className="eyebrow">MARKET LOCATIONS</p><h1>REKO rings</h1><p>Finland pickup communities and their recurring meeting times.</p></div></header>
    {error && <div className="alert">{error}</div>}{message && <div className="attention compact">{message}</div>}
    <div className="ring-layout">
      <section className="panel"><p className="eyebrow">{editing ? "EDIT RING" : "NEW RING"}</p><h2>{editing?.name ?? "Add a REKO ring"}</h2>
        <form key={editing?.id ?? "new"} onSubmit={save} className="ring-form">
          <label>Country<select value="FI" disabled><option value="FI">Finland</option></select></label>
          <label>Region<select value={regionCode} required onChange={(event) => { setRegionCode(event.target.value); setMunicipalityCode(""); }}><option value="">Select region</option>{regions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
          <label>Municipality<select value={municipalityCode} required onChange={(event) => setMunicipalityCode(event.target.value)}><option value="">Select municipality</option>{(municipalities[regionCode] ?? []).map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
          <label className="wide">REKO meeting name<input name="name" defaultValue={editing?.name} placeholder="Minimani Vaasa" required minLength={2} /></label>
          <label className="wide">Street address<input name="addressLine" defaultValue={editing?.addressLine} placeholder="Katu 9" required minLength={3} /></label>
          <label>Postal code<input name="postalCode" defaultValue={editing?.postalCode} placeholder="65100" /></label>
          <label>Repeats<select name="frequency" defaultValue={editing?.schedule?.frequency ?? "WEEKLY"}><option value="WEEKLY">Every week</option><option value="BIWEEKLY">Every two weeks</option></select></label>
          <label>Meeting day<select name="weekday" defaultValue={editing?.schedule?.weekday ?? 3}>{weekdays.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label>
          <label>Starts<input name="startTime" type="time" defaultValue={editing?.schedule?.startTime ?? "13:00"} required /></label>
          <label>Ends<input name="endTime" type="time" defaultValue={editing?.schedule?.endTime ?? "14:00"} required /></label>
          <div className="form-actions">{editing && <button type="button" className="secondary" onClick={() => edit()}>Cancel</button>}<button className="primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add REKO ring"}</button></div>
        </form>
      </section>
      <section className="panel"><p className="eyebrow">DIRECTORY</p><h2>{rings.length} REKO ring{rings.length === 1 ? "" : "s"}</h2>
        {!rings.length ? <div className="empty small"><span>⌖</span><p>No REKO rings added yet.</p></div> : <div className="ring-list">{rings.map((ring) => <article key={ring.id} className={`ring-card ${ring.active ? "" : "disabled"}`}>
          <div className="ring-pin">⌖</div><div className="ring-copy"><span>{ring.country} · {ring.regionName ? `${ring.regionName} · ` : ""}{ring.municipality}</span><strong>{ring.name}</strong><small>{[ring.addressLine, ring.postalCode].filter(Boolean).join(", ")}</small>{ring.schedule && <small>{ring.schedule.frequency === "BIWEEKLY" ? "Every two weeks" : "Every week"} · {weekdays[ring.schedule.weekday - 1]} {ring.schedule.startTime}–{ring.schedule.endTime}</small>}</div>
          <span className={`badge ${ring.active ? "verified" : ""}`}>{ring.active ? "ACTIVE" : "DISABLED"}</span><div className="ring-actions"><button disabled={busy} onClick={() => edit(ring)}>Edit</button><button disabled={busy} onClick={() => toggle(ring)}>{ring.active ? "Disable" : "Activate"}</button><button className="danger" disabled={busy} onClick={() => remove(ring)}>Delete</button></div>
        </article>)}</div>}
      </section>
    </div>
    <style jsx>{`.compact{padding:14px 18px}.ring-layout{display:grid;grid-template-columns:minmax(320px,.75fr) minmax(440px,1.25fr);gap:18px;align-items:start}.panel h2{margin:4px 0 18px}.ring-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ring-form label{display:grid;gap:7px;font-size:13px;font-weight:750}.ring-form input,.ring-form select{width:100%;border:1px solid var(--line);border-radius:10px;padding:12px;background:#fafcf7;font:inherit}.wide,.form-actions{grid-column:1/-1}.form-actions{display:flex;justify-content:flex-end;gap:8px}.secondary,.ring-actions button{border:1px solid var(--line);border-radius:9px;padding:10px 13px;background:white;font-weight:700}.ring-actions .danger{color:var(--danger)}.ring-list{display:grid;gap:10px}.ring-card{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;border:1px solid var(--line);border-radius:14px;padding:14px;background:#fafcf7}.ring-card.disabled{opacity:.62}.ring-pin{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:#dcebd5;font-size:20px}.ring-copy{display:grid;gap:3px}.ring-copy span,.ring-copy small{color:var(--muted);font-size:12px}.ring-copy strong{font-size:16px}.ring-actions{grid-column:2/-1;display:flex;gap:7px}.small{padding:38px}@media(max-width:1000px){.ring-layout{grid-template-columns:1fr}}@media(max-width:600px){.ring-form{grid-template-columns:1fr}.ring-card{grid-template-columns:auto 1fr}.ring-card>.badge{grid-column:2}.ring-actions{grid-column:1/-1}}`}</style>
  </>;
}
