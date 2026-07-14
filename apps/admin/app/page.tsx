"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { gql } from "@/lib/api";
import "./dashboard.css";

type Stats = {
  totalUsers: number;
  consumers: number;
  consumerOnly: number;
  sharedAccounts: number;
  sideHustlers: number;
  businesses: number;
  incompleteProfiles: number;
  draftVerifications: number;
  pendingVerifications: number;
  needsChanges: number;
  verifiedSellers: number;
  rejectedVerifications: number;
  suspendedUsers: number;
};
const fields = `totalUsers consumers consumerOnly sharedAccounts sideHustlers businesses incompleteProfiles draftVerifications pendingVerifications needsChanges verifiedSellers rejectedVerifications suspendedUsers`;
const percent = (value: number, total: number) =>
  total ? Math.round((value / total) * 100) : 0;

function MixBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  return (
    <div className="mix-row">
      <div>
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="track">
        <i style={{ width: `${percent(value, total)}%`, background: color }} />
      </div>
      <small>{percent(value, total)}% of marketplace accounts</small>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    gql<{ adminDashboardStats: Stats }>(
      `query { adminDashboardStats { ${fields} } }`,
    )
      .then((x) => setStats(x.adminDashboardStats))
      .catch((e) => setError(e.message));
  }, []);
  const s = stats;
  const sellers = (s?.sideHustlers ?? 0) + (s?.businesses ?? 0);
  const pipelineTotal =
    (s?.draftVerifications ?? 0) +
    (s?.pendingVerifications ?? 0) +
    (s?.needsChanges ?? 0) +
    (s?.verifiedSellers ?? 0) +
    (s?.rejectedVerifications ?? 0);
  const circumference = 2 * Math.PI * 44;
  const sellerShare = percent(sellers, s?.totalUsers ?? 0);
  return (
    <>
      <header className="page-head dashboard-head">
        <div>
          <p className="eyebrow">MARKETPLACE PULSE</p>
          <h1>Your community, at a glance</h1>
          <p>People, seller growth and trust checks in one clear view.</p>
        </div>
        <div className="head-actions">
          <Link className="secondary-link" href="/users">
            View all accounts
          </Link>
          <Link className="primary link" href="/verifications">
            Review applications
          </Link>
        </div>
      </header>
      {error && <div className="alert">{error}</div>}
      <section className="hero-stats">
        {[
          [
            "●",
            "Marketplace accounts",
            s?.totalUsers,
            "Excludes administrators",
            "people",
          ],
          [
            "C",
            "Consumer only",
            s?.consumerOnly,
            "People shopping locally",
            "consumer",
          ],
          [
            "↔",
            "Shared buyer + seller",
            s?.sharedAccounts,
            "Consumer and business/hustler",
            "shared",
          ],
          [
            "!",
            "Waiting for review",
            s?.pendingVerifications,
            "Admin action required",
            "review",
          ],
        ].map(([icon, label, value, copy, tone]) => (
          <article
            className={`hero-stat ${tone === "review" ? "urgent" : ""}`}
            key={String(label)}
          >
            <span className={`stat-icon ${tone}`}>{icon}</span>
            <div>
              <small>{label}</small>
              <strong>{value ?? "—"}</strong>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="dashboard-grid">
        <article className="panel account-story">
          <div className="panel-title">
            <div>
              <p className="eyebrow">ACCOUNT MIX</p>
              <h2>How people use FRSH</h2>
            </div>
            <span className="soft-badge">
              {s?.consumers ?? 0} can buy locally
            </span>
          </div>
          <div className="mix-layout">
            <div className="donut-wrap">
              <svg
                viewBox="0 0 110 110"
                className="donut"
                aria-label={`${sellerShare}% also sell`}
              >
                <circle cx="55" cy="55" r="44" className="donut-bg" />
                <circle
                  cx="55"
                  cy="55"
                  r="44"
                  className="donut-value"
                  strokeDasharray={`${(circumference * sellerShare) / 100} ${circumference}`}
                />
              </svg>
              <div>
                <strong>{sellerShare}%</strong>
                <span>also sell</span>
              </div>
            </div>
            <div className="mix-bars">
              <MixBar
                label="Consumer only"
                value={s?.consumerOnly ?? 0}
                total={s?.totalUsers ?? 0}
                color="#bfe86f"
              />
              <MixBar
                label="Side hustlers"
                value={s?.sideHustlers ?? 0}
                total={s?.totalUsers ?? 0}
                color="#efc867"
              />
              <MixBar
                label="Registered businesses"
                value={s?.businesses ?? 0}
                total={s?.totalUsers ?? 0}
                color="#347a38"
              />
            </div>
          </div>
        </article>
        <article className="panel action-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">ACTION CENTRE</p>
              <h2>What needs attention</h2>
            </div>
          </div>
          {[
            [
              "/verifications",
              "⌛",
              `${s?.pendingVerifications ?? 0} awaiting review`,
              "Open the verification queue",
              "primary-action",
            ],
            [
              "/users",
              "◔",
              `${s?.incompleteProfiles ?? 0} incomplete profiles`,
              "People who stopped during onboarding",
              "",
            ],
            [
              "/verifications",
              "✎",
              `${s?.needsChanges ?? 0} need changes`,
              "Applicants waiting to resubmit",
              "",
            ],
            [
              "/users",
              "!",
              `${s?.suspendedUsers ?? 0} suspended`,
              "Accounts restricted by operations",
              "",
            ],
          ].map(([href, icon, title, copy, tone]) => (
            <Link href={href} className={`action-row ${tone}`} key={title}>
              <span className="action-symbol">{icon}</span>
              <div>
                <b>{title}</b>
                <small>{copy}</small>
              </div>
              <em>→</em>
            </Link>
          ))}
        </article>
      </section>
      <section className="panel pipeline-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">TRUST PIPELINE</p>
            <h2>Seller verification journey</h2>
            <p>From saved draft to trusted local seller.</p>
          </div>
          <b>{pipelineTotal} seller applications</b>
        </div>
        <div className="pipeline">
          {[
            ["Draft", s?.draftVerifications, "Started, not submitted", "draft"],
            [
              "Awaiting review",
              s?.pendingVerifications,
              "Needs admin decision",
              "pending",
            ],
            [
              "Changes requested",
              s?.needsChanges,
              "Waiting on applicant",
              "changes",
            ],
            ["Verified", s?.verifiedSellers, "Ready to sell", "verified"],
            ["Rejected", s?.rejectedVerifications, "Not approved", "rejected"],
          ].map(([label, value, copy, tone], index) => (
            <div className={`pipe-step ${tone}`} key={String(label)}>
              <span>{index + 1}</span>
              <strong>{value ?? "—"}</strong>
              <b>{label}</b>
              <small>{copy}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
