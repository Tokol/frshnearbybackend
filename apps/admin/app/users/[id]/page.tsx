"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { gql } from "@/lib/api";

type Profile = Record<string, string | null>;
type User = {
  id: string;
  email?: string;
  emailVerified: boolean;
  displayName?: string;
  phone?: string;
  photoUrl?: string;
  dateOfBirth?: string;
  roles: string[];
  status: string;
  onboardingStep: string;
  verificationStatus: string;
  addressLine?: string;
  addressUnit?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  producerProfile?: Profile;
  businessProfile?: Profile;
};
type Detail = {
  user: User;
  missingFields: string[];
  completionPercent: number;
  canApplyForVerification: boolean;
};

const nice = (value?: string) => value?.replaceAll("_", " ") ?? "Not provided";
const date = (value?: string) =>
  value ? new Date(value).toLocaleString() : "Not provided";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("Complete your FRSH Nearby profile");
  const [body, setBody] = useState(
    "Hello,\n\nYour FRSH Nearby profile still needs a few details. Sign in to continue exactly where you stopped. Your saved information is waiting for you.\n\nFRSH Nearby team",
  );
  async function load() {
    try {
      const data = await gql<{ adminUser: Detail }>(
        `query($userId:String!){adminUser(userId:$userId){completionPercent missingFields canApplyForVerification user{id email emailVerified displayName phone photoUrl dateOfBirth roles status onboardingStep verificationStatus addressLine addressUnit city postalCode country latitude longitude createdAt updatedAt lastLoginAt producerProfile{publicName description productionType address city postalCode country} businessProfile{publicDisplayName legalBusinessName farmName businessId vatNumber businessType businessAddress city postalCode country logoUrl}}}}`,
        { userId: id },
      );
      setDetail(data.adminUser);
      const firstName =
        data.adminUser.user.displayName?.split(" ")[0] || "there";
      const missing = data.adminUser.missingFields.length
        ? `\n\nStill needed:\n${data.adminUser.missingFields.map((field) => `• ${field}`).join("\n")}`
        : "";
      setBody(
        `Hello ${firstName},\n\nYour FRSH Nearby profile still needs a few details. Sign in to continue exactly where you stopped. Your saved information is waiting for you.${missing}\n\nFRSH Nearby team`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, [id]);
  async function send(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    setMessage("");
    try {
      await gql(
        `mutation($input:SendOnboardingEmailInput!){sendOnboardingEmail(input:$input)}`,
        { input: { userId: id, subject, message: body } },
      );
      setMessage("Email sent and recorded in the admin audit log.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  if (!detail)
    return (
      <>
        {error ? <div className="alert">{error}</div> : <p>Loading account…</p>}
      </>
    );
  const u = detail.user;
  const personal = [
    ["Email", u.email],
    ["Email verified", u.emailVerified ? "Yes" : "No"],
    ["Phone", u.phone],
    [
      "Date of birth",
      u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString() : undefined,
    ],
    ["Account type", u.roles.join(" + ")],
    ["Status", nice(u.status)],
    ["Onboarding", nice(u.onboardingStep)],
    ["Verification", nice(u.verificationStatus)],
  ];
  const seller = u.businessProfile ?? u.producerProfile;
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">ACCOUNT DETAIL</p>
          <h1>{u.displayName || "Incomplete profile"}</h1>
          <p>
            <Link href="/users">← Back to all accounts</Link>
          </p>
        </div>
        <div className="completion">
          <strong>{detail.completionPercent}%</strong>
          <span>profile complete</span>
        </div>
      </header>
      {error && <div className="alert">{error}</div>}
      {message && <div className="attention detail-message">{message}</div>}
      <div className="detail-grid">
        <section className="panel">
          <h2>Personal details</h2>
          <div className="facts">
            {personal.map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <b>{value || "Not provided"}</b>
              </div>
            ))}
          </div>
        </section>
        <section
          className={`panel missing ${detail.missingFields.length ? "needs" : "done"}`}
        >
          <h2>
            {detail.missingFields.length ? "Still missing" : "Profile complete"}
          </h2>
          {detail.missingFields.length ? (
            <ul>
              {detail.missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          ) : (
            <p>All onboarding details have been supplied.</p>
          )}
          <p className="muted">
            Seller verification is a separate action from onboarding.
          </p>
        </section>
        <section className="panel">
          <h2>Registered location</h2>
          <p>
            {[u.addressLine, u.addressUnit, u.postalCode, u.city, u.country]
              .filter(Boolean)
              .join(", ") || "Not registered"}
          </p>
          {u.latitude != null && (
            <small>
              {u.latitude}, {u.longitude}
            </small>
          )}
        </section>
        <section className="panel">
          <h2>Seller or business details</h2>
          {seller ? (
            <div className="facts">
              {Object.entries(seller).map(([key, value]) => (
                <div key={key}>
                  <small>{nice(key)}</small>
                  <b>{value || "Not provided"}</b>
                </div>
              ))}
            </div>
          ) : (
            <p>No seller profile saved.</p>
          )}
        </section>
        <section className="panel timeline">
          <h2>Account activity</h2>
          <p>
            <b>Joined</b>
            <span>{date(u.createdAt)}</span>
          </p>
          <p>
            <b>Last login</b>
            <span>{date(u.lastLoginAt)}</span>
          </p>
          <p>
            <b>Last saved</b>
            <span>{date(u.updatedAt)}</span>
          </p>
        </section>
        <form className="panel email-card" onSubmit={send}>
          <p className="eyebrow">NO-REPLY MESSAGE</p>
          <h2>Email this user</h2>
          <label>
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              minLength={3}
            />
          </label>
          <label>
            Message
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              minLength={10}
              rows={7}
            />
          </label>
          <button className="primary" disabled={sending || !u.email}>
            {sending ? "Sending…" : "Send from no-reply"}
          </button>
          {!u.email && <small>This account has no email address.</small>}
        </form>
      </div>
      <style jsx>{`
        .page-head a {
          color: var(--green);
        }
        .completion {
          background: #e7f3d9;
          border: 1px solid #cadfb4;
          border-radius: 18px;
          padding: 14px 20px;
          text-align: center;
        }
        .completion strong,
        .completion span {
          display: block;
        }
        .completion strong {
          font:
            34px Georgia,
            serif;
        }
        .completion span {
          font-size: 11px;
          color: var(--muted);
        }
        .detail-message {
          padding: 14px;
          margin-bottom: 16px;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
        .panel {
          background: white;
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 22px;
        }
        .panel h2 {
          font:
            25px Georgia,
            serif;
          margin: 0 0 18px;
        }
        .facts {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .facts div {
          border-bottom: 1px solid var(--line);
          padding-bottom: 10px;
        }
        .facts small,
        .facts b {
          display: block;
        }
        .facts small,
        .muted,
        .timeline span {
          color: var(--muted);
        }
        .missing.needs {
          background: #fff5da;
        }
        .missing.done {
          background: #e9f5e3;
        }
        .missing li {
          margin: 8px 0;
        }
        .timeline p {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid var(--line);
          padding: 10px 0;
        }
        .email-card {
          display: grid;
          gap: 12px;
        }
        .email-card h2 {
          margin-bottom: 2px;
        }
        .email-card label {
          display: grid;
          gap: 6px;
          font-weight: 700;
        }
        .email-card input,
        .email-card textarea {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 11px;
          font: inherit;
        }
        .primary {
          border: 0;
          border-radius: 10px;
          background: var(--ink);
          color: white;
          padding: 13px;
          font-weight: 800;
        }
        @media (max-width: 850px) {
          .detail-grid {
            grid-template-columns: 1fr;
          }
          .facts {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
