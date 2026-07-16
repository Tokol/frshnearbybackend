"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { gql } from "@/lib/api";

type Decision = "VERIFIED" | "NEEDS_CHANGES" | "REJECTED";
type VerificationDocument = {
  id: string;
  kind: string;
  originalName: string;
  mimeType: string;
  storageKey: string;
  createdAt: string;
};
type Item = {
  id: string;
  kind: string;
  status: string;
  submittedAt: string;
  publicName?: string;
  businessId?: string;
  businessType?: string;
  city?: string;
  country?: string;
  userResponse?: string;
  documents: VerificationDocument[];
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
  const [requestedDocumentKinds, setRequestedDocumentKinds] = useState<
    string[]
  >([]);
  const [requiresTextResponse, setRequiresTextResponse] = useState(false);

  const documentKinds = [
    { value: "IDENTITY", label: "Proof of identity" },
    { value: "BUSINESS_REGISTRATION", label: "Business registration proof" },
    { value: "VAT_REGISTRATION", label: "Tax or VAT document" },
    { value: "ADDRESS_PROOF", label: "Address or activity proof" },
    { value: "OTHER", label: "Other document" },
  ];

  async function load() {
    try {
      const data = await gql<{ adminVerificationQueue: Item[] }>(
        `query{adminVerificationQueue{id kind status submittedAt publicName businessId businessType city country userResponse documents{id kind originalName mimeType storageKey createdAt} applicant{id displayName email phone roles}}}`,
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
    setRequestedDocumentKinds([]);
    setRequiresTextResponse(false);
    setError("");
    setMessage("");
  }

  function toggleRequestedDocument(kind: string) {
    setRequestedDocumentKinds((current) =>
      current.includes(kind)
        ? current.filter((value) => value !== kind)
        : [...current, kind],
    );
  }

  async function viewDocument(documentId: string) {
    setBusy(documentId);
    setError("");
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      setBusy("");
      setError("Allow popups to view this verification document.");
      return;
    }
    win.document.title = "Loading verification document";
    win.document.body.style.margin = "0";
    win.document.body.style.fontFamily =
      "Inter, ui-sans-serif, system-ui, sans-serif";
    win.document.body.innerHTML =
      '<p style="padding:24px;color:#143526">Loading secure document...</p>';
    try {
      const data = await gql<{
        adminVerificationDocument: {
          originalName: string;
          mimeType: string;
          base64Data: string;
        };
      }>(
        `query($documentId:String!){adminVerificationDocument(documentId:$documentId){originalName mimeType base64Data}}`,
        { documentId },
      );
      const document = data.adminVerificationDocument;
      win.document.title = document.originalName;
      win.document.body.style.margin = "0";
      win.document.body.replaceChildren();
      if (document.mimeType === "application/pdf") {
        const frame = win.document.createElement("iframe");
        frame.title = document.originalName;
        frame.src = `data:${document.mimeType};base64,${document.base64Data}`;
        frame.style.border = "0";
        frame.style.width = "100vw";
        frame.style.height = "100vh";
        win.document.body.appendChild(frame);
      } else {
        const image = win.document.createElement("img");
        image.alt = document.originalName;
        image.src = `data:${document.mimeType};base64,${document.base64Data}`;
        image.style.display = "block";
        image.style.maxWidth = "100vw";
        image.style.maxHeight = "100vh";
        image.style.margin = "auto";
        win.document.body.appendChild(image);
      }
    } catch (e) {
      win.close();
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function submitDecision() {
    if (!review) return;
    if (review.decision !== "VERIFIED" && reason.trim().length < 10) {
      setError("Write a clear reason of at least 10 characters for the user.");
      return;
    }
    if (
      review.decision === "NEEDS_CHANGES" &&
      requestedDocumentKinds.length === 0 &&
      !requiresTextResponse
    ) {
      setError("Choose at least one requested file or require a text response.");
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
            requestedDocumentKinds:
              review.decision === "NEEDS_CHANGES"
                ? requestedDocumentKinds
                : [],
            requiresTextResponse:
              review.decision === "NEEDS_CHANGES"
                ? requiresTextResponse
                : false,
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
      setRequestedDocumentKinds([]);
      setRequiresTextResponse(false);
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
              <div className="application-details">
                <div>
                  <strong>Applicant details</strong>
                  <span>
                    Roles: {item.applicant.roles.join(", ")} · Status:{" "}
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>
                {item.userResponse && (
                  <div>
                    <strong>User response</strong>
                    <span>{item.userResponse}</span>
                  </div>
                )}
                <div>
                  <strong>Documents</strong>
                  {item.documents.length === 0 ? (
                    <span>No files submitted.</span>
                  ) : (
                    <div className="document-list">
                      {item.documents.map((document) => (
                        <button
                          key={document.id}
                          type="button"
                          disabled={!!busy}
                          onClick={() => viewDocument(document.id)}
                        >
                          <span>{document.kind.replaceAll("_", " ")}</span>
                          <small>{document.originalName}</small>
                          <b>Preview</b>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
            {review.decision === "NEEDS_CHANGES" && (
              <div className="request-options">
                <strong>What should the user submit?</strong>
                <div className="checks">
                  {documentKinds.map((kind) => (
                    <label key={kind.value}>
                      <input
                        type="checkbox"
                        checked={requestedDocumentKinds.includes(kind.value)}
                        onChange={() => toggleRequestedDocument(kind.value)}
                      />
                      <span>{kind.label}</span>
                    </label>
                  ))}
                </div>
                <label className="text-response">
                  <input
                    type="checkbox"
                    checked={requiresTextResponse}
                    onChange={(e) =>
                      setRequiresTextResponse(e.target.checked)
                    }
                  />
                  <span>Require a written response</span>
                </label>
              </div>
            )}
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
        .application-details {
          display: grid;
          gap: 12px;
          margin-top: 14px;
          padding: 14px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fbfaf3;
        }
        .application-details > div {
          display: grid;
          gap: 4px;
        }
        .application-details strong {
          color: var(--ink);
          font-size: 12px;
        }
        .application-details span,
        .application-details small {
          color: var(--muted);
          font-size: 12px;
          line-height: 1.45;
        }
        .document-list {
          display: grid;
          gap: 8px;
        }
        .document-list button {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 2px 12px;
          align-items: center;
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: white;
          padding: 10px 12px;
          text-align: left;
          cursor: pointer;
        }
        .document-list button span {
          color: var(--ink);
          font-weight: 800;
          text-transform: capitalize;
        }
        .document-list button small {
          grid-column: 1;
        }
        .document-list button b {
          grid-column: 2;
          grid-row: 1 / span 2;
          color: var(--green);
          font-size: 12px;
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
        .request-options {
          display: grid;
          gap: 12px;
          margin-top: 18px;
          padding: 14px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fbfaf3;
        }
        .checks {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .checks label,
        .text-response {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 12px;
          font-weight: 750;
        }
        .checks input,
        .text-response input {
          accent-color: var(--green);
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
