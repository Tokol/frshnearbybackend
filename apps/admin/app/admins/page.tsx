"use client";

import { FormEvent, useEffect, useState } from "react";
import { gql } from "@/lib/api";

type Session = { session: { user: { roles: string[] } } };
type Staff = {
  id: string;
  email?: string;
  displayName?: string;
  roles: string[];
  status: string;
  createdAt: string;
};

export default function AdminManagementPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const [session, roster] = await Promise.all([
        gql<Session>(`query { session { user { roles } } }`),
        gql<{ adminStaff: Staff[] }>(
          `query { adminStaff { id email displayName roles status createdAt } }`,
        ),
      ]);
      setIsSuperAdmin(session.session.user.roles.includes("SUPER_ADMIN"));
      setStaff(roster.adminStaff);
    } catch (reason) {
      setError((reason as Error).message);
      setIsSuperAdmin(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email")).trim().toLowerCase();
    try {
      const data = await gql<{ grantAdminRole: Staff }>(
        `mutation($input:GrantAdminInput!){grantAdminRole(input:$input){id email displayName roles status createdAt}}`,
        { input: { email } },
      );
      setMessage(
        `${data.grantAdminRole.email ?? email} is now an administrator.`,
      );
      form.reset();
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (isSuperAdmin === null)
    return (
      <div className="center">
        <div className="loader" />
      </div>
    );
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">STAFF ACCESS</p>
          <h1>Admin management</h1>
          <p>
            Administrators are kept separate from marketplace people and
            businesses.
          </p>
        </div>
      </header>
      {error && <div className="alert">{error}</div>}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-title">
          <div>
            <p className="eyebrow">CURRENT TEAM</p>
            <h2>
              {staff.length} operations account{staff.length === 1 ? "" : "s"}
            </h2>
          </div>
        </div>
        <div className="staff-grid">
          {staff.map((person) => (
            <article className="staff-card" key={person.id}>
              <div className="avatar">
                {person.displayName?.[0] ||
                  person.email?.[0]?.toUpperCase() ||
                  "A"}
              </div>
              <div>
                <b>{person.displayName || person.email || "Administrator"}</b>
                <small>{person.email}</small>
                <div>
                  <span
                    className={`badge ${person.roles.includes("SUPER_ADMIN") ? "verified" : ""}`}
                  >
                    {person.roles.includes("SUPER_ADMIN")
                      ? "SUPER ADMIN"
                      : "ADMIN"}
                  </span>
                  <span className="badge">{person.status}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      {isSuperAdmin ? (
        <section className="panel" style={{ maxWidth: 620 }}>
          <p className="eyebrow">SUPER ADMIN CONTROL</p>
          <h3>Create an administrator</h3>
          <p className="muted">
            The person must sign in once before access can be granted. The
            action is recorded in the audit log.
          </p>
          <form
            className="login-card"
            style={{ width: "100%" }}
            onSubmit={grant}
          >
            <label>
              Account email
              <input
                name="email"
                type="email"
                required
                placeholder="admin@frshnearby.com"
              />
            </label>
            {message && (
              <div className="attention" style={{ padding: 16 }}>
                {message}
              </div>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Granting access…" : "Grant admin access"}
            </button>
          </form>
        </section>
      ) : (
        <section className="panel tint">
          <p className="eyebrow">ACCESS LEVEL</p>
          <h3>Administrator</h3>
          <p>
            Only a super administrator can grant access to another team member.
          </p>
        </section>
      )}
      <style jsx>{`
        .staff-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 12px;
          margin-top: 18px;
        }
        .staff-card {
          display: flex;
          gap: 12px;
          align-items: center;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 15px;
          background: #f9fbf7;
        }
        .staff-card > div:last-child {
          min-width: 0;
        }
        .staff-card b,
        .staff-card small {
          display: block;
        }
        .staff-card small {
          color: var(--muted);
          margin: 4px 0 9px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .staff-card .badge {
          margin-right: 5px;
        }
      `}</style>
    </>
  );
}
