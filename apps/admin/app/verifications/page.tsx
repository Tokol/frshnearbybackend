"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { gql } from "@/lib/api";

type Decision = "VERIFIED" | "NEEDS_CHANGES" | "REJECTED";
type Item = {
  id: string;
  kind: string;
  submittedAt: string;
  publicName?: string;
  businessId?: string;
  businessType?: string;
  city?: string;
  country?: string;
  applicant: {
    id: string;
    displayName?: string;
    email?: string;
    phone?: string;
    roles: string[];
  };
};

export default function Verifications() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [review, setReview] = useState<{ item: Item; decision: Decision }>();
  const [reason, setReason] = useState("");

  async function load() {
    try {
      const data = await gql<{ adminVerificationQueue: Item[] }>(
        `query{adminVerificationQueue{id kind submittedAt publicName businessId businessType city country applicant{id displayName email phone roles}}}`,
      );
      setItems(data.adminVerificationQueue);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  function openReview(item: Item, decision: Decision) {
    if (decision === "VERIFIED") {
      setReason("Your seller account has been verified.");
    } else {
      setReason("");
    }
    setReview({ item, decision });
    setError("");
    setMessage("");
  }

  async function submitDecision() {
    if (!review) return;
    if (review.decision !== "VERIFIED" && reason.trim().length < 10) {
      setError("Write a clear reason of at least 10 characters for the user.");
      return;
    }
    setBusy(review.item.id);
    setError("");
    try {
      await gql(
        `mutation($input:ReviewVerificationInput!){reviewVerification(input:$input){id verificationStatus}}`,
        {
          input: {
            submissionId: review.item.id,
            decision: review.decision,
            userMessage: reason.trim(),
          },
        },
      );
      const label =
        review.decision === "VERIFIED"
          ? "approved"
          : review.decision === "REJECTED"
            ? "rejected"
            : "returned for changes";
      setMessage(
        `Application ${label}. The account was updated and a no-reply email was sent.`,
      );
      setReview(undefined);
      setReason("");
      await load();
    } catch (e) {
      setError((e as Error).message);
      await load();
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">TRUST & SAFETY</p>
          <h1>Verification queue</h1>
          <p>{items.length} applications waiting for review</p>
        </div>
      </header>
      {message && <div className="attention review-message">{message}</div>}
      {error && <div className="alert">{error}</div>}
      <div className="queue">
        {items.length === 0 && (
          <div className="empty">
            <span>✓</span>
            <h2>Queue is clear</h2>
            <p>New and resubmitted seller applications will appear here.</p>
          </div>
        )}
        {items.map((item) => (
          <article className="application" key={item.id}>
            <div className="avatar">
              {item.applicant.displayName?.[0] || "?"}
            </div>
            <div className="application-main">
              <div>
                <span className="badge submitted">
                  {item.kind.replaceAll("_", " ")}
                </span>
                <h3>
                  {item.publicName ||
                    item.applicant.displayName ||
                    "Unnamed applicant"}
                </h3>
                <p>
                  {item.applicant.email} · {item.applicant.phone || "No phone"}
                </p>
                <p>
                  {item.businessType || "Type not supplied"} ·{" "}
                  {[item.city, item.country].filter(Boolean).join(", ") ||
                    "Location not supplied"}
                  {item.businessId ? ` · ID ${item.businessId}` : ""}
                </p>
                <small>
                  Submitted {new Date(item.submittedAt).toLocaleString()}
                </small>
              </div>
              <div className="actions">
                <Link href={`/users/${item.applicant.id}`}>View profile</Link>
                <button
                  disabled={!!busy}
                  className="approve"
                  onClick={() => openReview(item, "VERIFIED")}
                >
                  Approve
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => openReview(item, "NEEDS_CHANGES")}
                >
                  Request changes
                </button>
                <button
                  disabled={!!busy}
                  className="reject"
                  onClick={() => openReview(item, "REJECTED")}
                >
                  Reject
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {review && (
        <div className="review-overlay" role="dialog" aria-modal="true">
          <div className="review-dialog">
            <p className="eyebrow">REVIEW DECISION</p>
            <h2>
              {review.decision === "VERIFIED"
                ? "Approve this account?"
                : review.decision === "REJECTED"
                  ? "Why is this rejected?"
                  : "What must the user change?"}
            </h2>
            <p>{review.item.publicName || review.item.applicant.displayName}</p>
            <label>
              {review.decision === "VERIFIED"
                ? "Message included in the email"
                : "Reason sent to the user *"}
              <textarea
                rows={6}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Be specific and explain what the user should do next."
              />
            </label>
            <div className="dialog-actions">
              <button onClick={() => setReview(undefined)}>Cancel</button>
              <button
                className={
                  review.decision === "REJECTED" ? "danger" : "primary"
                }
                disabled={busy === review.item.id}
                onClick={submitDecision}
              >
                {busy
                  ? "Saving & emailing…"
                  : review.decision === "VERIFIED"
                    ? "Approve & notify"
                    : review.decision === "REJECTED"
                      ? "Reject & notify"
                      : "Request changes & notify"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .review-message {
          padding: 15px;
          margin-bottom: 16px;
        }
        .actions a {
          border: 1px solid var(--line);
          border-radius: 9px;
          color: var(--ink);
          font-size: 12px;
          font-weight: 750;
          padding: 10px 13px;
          text-decoration: none;
        }
        .review-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: #0c2d22a8;
          backdrop-filter: blur(5px);
        }
        .review-dialog {
          width: min(520px, 100%);
          border-radius: 22px;
          background: white;
          padding: 28px;
          box-shadow: 0 24px 80px #071d1666;
        }
        .review-dialog h2 {
          font:
            30px Georgia,
            serif;
          margin: 6px 0;
        }
        .review-dialog > p:not(.eyebrow) {
          color: var(--muted);
        }
        .review-dialog label {
          display: grid;
          gap: 8px;
          margin-top: 20px;
          font-size: 13px;
          font-weight: 800;
        }
        .review-dialog textarea {
          resize: vertical;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 13px;
          font: inherit;
        }
        .dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }
        .dialog-actions button {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 12px 15px;
          font-weight: 800;
        }
        .dialog-actions .danger {
          border-color: #a43d36;
          background: #a43d36;
          color: white;
        }
      `}</style>
    </>
  );
}
