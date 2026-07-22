"use client";

import { FormEvent, useEffect, useState } from "react";
import { gql } from "@/lib/api";

type RekoRing = {
  id: string;
  country: string;
  municipality: string;
  name: string;
  addressLine: string;
  postalCode?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const fields = `id country municipality name addressLine postalCode active createdAt updatedAt`;

export default function RekoRingsPage() {
  const [rings, setRings] = useState<RekoRing[]>([]);
  const [editing, setEditing] = useState<RekoRing>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await gql<{ adminRekoRings: RekoRing[] }>(
        `query { adminRekoRings { ${fields} } }`,
      );
      setRings(data.adminRekoRings);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const input = {
      country: String(values.get("country") || "Finland").trim(),
      municipality: String(values.get("municipality") || "").trim(),
      name: String(values.get("name") || "").trim(),
      addressLine: String(values.get("addressLine") || "").trim(),
      postalCode: String(values.get("postalCode") || "").trim() || null,
    };
    try {
      if (editing) {
        await gql(
          `mutation($ringId:String!,$input:RekoRingInput!){updateRekoRing(ringId:$ringId,input:$input){id}}`,
          { ringId: editing.id, input },
        );
        setMessage(`${input.name} was updated.`);
      } else {
        await gql(
          `mutation($input:RekoRingInput!){createRekoRing(input:$input){id}}`,
          { input },
        );
        setMessage(`${input.name} was added.`);
      }
      form.reset();
      setEditing(undefined);
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(ring: RekoRing) {
    setBusy(true);
    setError("");
    try {
      await gql(
        `mutation($ringId:String!,$active:Boolean!){setRekoRingActive(ringId:$ringId,active:$active){id}}`,
        { ringId: ring.id, active: !ring.active },
      );
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">MARKET LOCATIONS</p>
          <h1>REKO rings</h1>
          <p>Manage the pickup communities that Hot Sales can use later.</p>
        </div>
      </header>
      {error && <div className="alert">{error}</div>}
      {message && <div className="attention compact">{message}</div>}
      <div className="ring-layout">
        <section className="panel">
          <p className="eyebrow">{editing ? "EDIT RING" : "NEW RING"}</p>
          <h2>{editing ? editing.name : "Add a REKO ring"}</h2>
          <form key={editing?.id ?? "new"} onSubmit={save} className="ring-form">
            <label>Country<input name="country" defaultValue={editing?.country ?? "Finland"} required minLength={2} /></label>
            <label>Municipality<input name="municipality" defaultValue={editing?.municipality} placeholder="Vaasa" required minLength={2} /></label>
            <label className="wide">REKO meeting name<input name="name" defaultValue={editing?.name} placeholder="Minimani Vaasa" required minLength={2} /></label>
            <label className="wide">Street address<input name="addressLine" defaultValue={editing?.addressLine} placeholder="Katu 9" required minLength={3} /></label>
            <label>Postal code<input name="postalCode" defaultValue={editing?.postalCode} placeholder="65100" /></label>
            <div className="form-actions">
              {editing && <button type="button" className="secondary" onClick={() => setEditing(undefined)}>Cancel</button>}
              <button className="primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add REKO ring"}</button>
            </div>
          </form>
        </section>
        <section className="panel ring-list-panel">
          <div className="list-heading"><div><p className="eyebrow">DIRECTORY</p><h2>{rings.length} REKO ring{rings.length === 1 ? "" : "s"}</h2></div></div>
          {rings.length === 0 ? <div className="empty small"><span>⌖</span><p>No REKO rings added yet.</p></div> : <div className="ring-list">{rings.map((ring) => <article key={ring.id} className={`ring-card ${ring.active ? "" : "disabled"}`}>
            <div className="ring-pin">⌖</div>
            <div className="ring-copy"><span>{ring.country} · {ring.municipality}</span><strong>{ring.name}</strong><small>{[ring.addressLine, ring.postalCode].filter(Boolean).join(", ")}</small></div>
            <span className={`badge ${ring.active ? "verified" : ""}`}>{ring.active ? "ACTIVE" : "DISABLED"}</span>
            <div className="ring-actions"><button disabled={busy} onClick={() => setEditing(ring)}>Edit</button><button disabled={busy} onClick={() => toggle(ring)}>{ring.active ? "Disable" : "Activate"}</button></div>
          </article>)}</div>}
        </section>
      </div>
      <style jsx>{`
        .compact{padding:14px 18px}.ring-layout{display:grid;grid-template-columns:minmax(320px,.75fr) minmax(440px,1.25fr);gap:18px;align-items:start}.panel h2{margin:4px 0 18px}.ring-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ring-form label{display:grid;gap:7px;font-size:13px;font-weight:750}.ring-form input{width:100%;border:1px solid var(--line);border-radius:10px;padding:12px;background:#fafcf7;font:inherit}.wide,.form-actions{grid-column:1/-1}.form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}.secondary,.ring-actions button{border:1px solid var(--line);border-radius:9px;padding:10px 13px;background:white;font-weight:700}.ring-list{display:grid;gap:10px}.ring-card{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;border:1px solid var(--line);border-radius:14px;padding:14px;background:#fafcf7}.ring-card.disabled{opacity:.62}.ring-pin{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:#dcebd5;font-size:20px}.ring-copy{display:grid;gap:3px}.ring-copy span,.ring-copy small{color:var(--muted);font-size:12px}.ring-copy strong{font-size:16px}.ring-actions{grid-column:2/-1;display:flex;gap:7px}.small{padding:38px}@media(max-width:1000px){.ring-layout{grid-template-columns:1fr}}@media(max-width:600px){.ring-form{grid-template-columns:1fr}.ring-card{grid-template-columns:auto 1fr}.ring-card>.badge{grid-column:2}.ring-actions{grid-column:1/-1}}
      `}</style>
    </>
  );
}
