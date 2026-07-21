"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { gql } from "@/lib/api";
import { LocationMap } from "@/components/location-map";

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
type VerificationDocument = {
  id: string;
  kind: string;
  originalName: string;
  mimeType: string;
  storageKey: string;
  createdAt: string;
};
type VerificationSubmission = {
  id: string;
  kind: string;
  status: string;
  requestTitle?: string;
  submittedAt: string;
  reviewedAt?: string;
  userMessage?: string;
  userResponse?: string;
  requestedDocumentKinds: string[];
  requiresTextResponse: boolean;
  documents: VerificationDocument[];
};
type ActiveDevice = {
  id: string;
  platform: string;
  locale: string;
  enabled: boolean;
  createdAt: string;
  lastSeenAt: string;
};
type Detail = {
  user: User;
  missingFields: string[];
  completionPercent: number;
  canApplyForVerification: boolean;
  verificationSubmissions: VerificationSubmission[];
  activeDevices: ActiveDevice[];
};
type DocumentPreview = {
  originalName: string;
  mimeType: string;
  url: string;
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
  const [documentPreview, setDocumentPreview] = useState<DocumentPreview>();
  const [subject, setSubject] = useState("Complete your FRSH Nearby profile");
  const [body, setBody] = useState(
    "Hello,\n\nYour FRSH Nearby profile still needs a few details. Sign in to continue exactly where you stopped. Your saved information is waiting for you.\n\nFRSH Nearby team",
  );
  async function load() {
    try {
      const data = await gql<{ adminUser: Detail }>(
        `query($userId:String!){adminUser(userId:$userId){completionPercent missingFields canApplyForVerification activeDevices{id platform locale enabled createdAt lastSeenAt} verificationSubmissions{id kind status requestTitle submittedAt reviewedAt userMessage userResponse requestedDocumentKinds requiresTextResponse documents{id kind originalName mimeType storageKey createdAt}} user{id email emailVerified displayName phone photoUrl dateOfBirth roles status onboardingStep verificationStatus addressLine addressUnit city postalCode country latitude longitude createdAt updatedAt lastLoginAt producerProfile{publicName description productionType address city postalCode country} businessProfile{publicDisplayName legalBusinessName farmName businessId vatNumber businessType businessAddress city postalCode country logoUrl}}}}`,
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
  function base64ToBlob(base64Data: string, mimeType: string) {
    const binary = window.atob(base64Data);
    const chunks: ArrayBuffer[] = [];
    for (let offset = 0; offset < binary.length; offset += 8192) {
      const slice = binary.slice(offset, offset + 8192);
      const buffer = new ArrayBuffer(slice.length);
      const bytes = new Uint8Array(buffer);
      for (let index = 0; index < slice.length; index += 1) {
        bytes[index] = slice.charCodeAt(index);
      }
      chunks.push(buffer);
    }
    return new Blob(chunks, { type: mimeType });
  }

  function closeDocumentPreview() {
    if (documentPreview) URL.revokeObjectURL(documentPreview.url);
    setDocumentPreview(undefined);
  }

  async function viewDocument(documentId: string) {
    setSending(true);
    setError("");
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
      const blob = base64ToBlob(document.base64Data, document.mimeType);
      const url = URL.createObjectURL(blob);
      if (documentPreview) URL.revokeObjectURL(documentPreview.url);
      setDocumentPreview({
        originalName: document.originalName,
        mimeType: document.mimeType,
        url,
      });
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
  const hasCoordinates = u.latitude != null && u.longitude != null;
  const mapLink = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${u.latitude}&mlon=${u.longitude}#map=17/${u.latitude}/${u.longitude}`
    : undefined;
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
        <section className="panel location-card">
          <div className="location-heading">
            <div>
              <p className="eyebrow">DISCOVERY POINT</p>
              <h2>Registered location</h2>
            </div>
            {mapLink && (
              <a href={mapLink} target="_blank" rel="noreferrer">
                Open larger map ↗
              </a>
            )}
          </div>
          <p className="registered-address">
            {[u.addressLine, u.addressUnit, u.postalCode, u.city, u.country]
              .filter(Boolean)
              .join(", ") || "Not registered"}
          </p>
          {hasCoordinates ? (
            <LocationMap
              seller={{ latitude: u.latitude!, longitude: u.longitude! }}
            />
          ) : (
            <div className="map-empty">
              <span>⌖</span>
              <b>No map point saved</b>
              <small>
                Coordinates will appear after location confirmation.
              </small>
            </div>
          )}
          {hasCoordinates && (
            <small className="coordinates">
              {u.latitude!.toFixed(6)}, {u.longitude!.toFixed(6)}
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
        <section className="panel verification-docs">
          <h2>Verification documents</h2>
          {detail.verificationSubmissions.length === 0 ? (
            <p>No verification submission yet.</p>
          ) : (
            <div className="submission-list">
              {detail.verificationSubmissions.map((submission) => (
                <article key={submission.id} className="submission-card">
                  <div className="submission-head">
                    <div>
                      <strong>
                        {submission.requestTitle || nice(submission.kind)}
                      </strong>
                      <span>
                        {nice(submission.status)} · {date(submission.submittedAt)}
                      </span>
                    </div>
                    {submission.reviewedAt && (
                      <small>Reviewed {date(submission.reviewedAt)}</small>
                    )}
                  </div>
                  {submission.userResponse && (
                    <p className="review-note">
                      <b>User response</b>
                      <span>{submission.userResponse}</span>
                    </p>
                  )}
                  {submission.userMessage && (
                    <p className="review-note">
                      <b>Admin message</b>
                      <span>{submission.userMessage}</span>
                    </p>
                  )}
                  {submission.documents.length === 0 ? (
                    <p className="muted">No files in this submission.</p>
                  ) : (
                    <div className="document-list">
                      {submission.documents.map((document) => (
                        <button
                          key={document.id}
                          type="button"
                          disabled={sending}
                          onClick={() => viewDocument(document.id)}
                        >
                          <span>{nice(document.kind)}</span>
                          <small>{document.originalName}</small>
                          <b>Preview</b>
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
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
        <section className="panel device-panel">
          <div className="device-heading">
            <div>
              <p className="eyebrow">SIGNED-IN INSTALLATIONS</p>
              <h2>Active devices</h2>
            </div>
            <span className="device-count">{detail.activeDevices.length}</span>
          </div>
          {detail.activeDevices.length === 0 ? (
            <p className="muted">No device is currently registered for notifications.</p>
          ) : (
            <div className="device-list">
              {detail.activeDevices.map((device) => (
                <article key={device.id} className="device-row">
                  <span className="device-icon">
                    {device.platform === "WEB" ? "◫" : device.platform === "ANDROID" ? "A" : "●"}
                  </span>
                  <div>
                    <strong>{nice(device.platform)}</strong>
                    <small>Language: {device.locale.toUpperCase()} · Registered {date(device.createdAt)}</small>
                  </div>
                  <div className="device-active">
                    <b>Last active</b>
                    <span>{date(device.lastSeenAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="device-note">Last active updates whenever this installation makes an authenticated API request. Signing out removes it from this list.</p>
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
      {documentPreview && (
        <div className="preview-overlay" role="dialog" aria-modal="true">
          <div className="preview-dialog">
            <div className="preview-head">
              <div>
                <p className="eyebrow">DOCUMENT PREVIEW</p>
                <h2>{documentPreview.originalName}</h2>
              </div>
              <button type="button" onClick={closeDocumentPreview}>
                Close
              </button>
            </div>
            <div className="preview-body">
              {documentPreview.mimeType === "application/pdf" ? (
                <iframe
                  title={documentPreview.originalName}
                  src={documentPreview.url}
                />
              ) : (
                <img
                  alt={documentPreview.originalName}
                  src={documentPreview.url}
                />
              )}
            </div>
          </div>
        </div>
      )}
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
        .location-card {
          overflow: hidden;
        }
        .location-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .location-heading h2 {
          margin-bottom: 0;
        }
        .location-heading .eyebrow {
          margin: 0 0 5px;
        }
        .location-heading a {
          color: var(--green);
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
        }
        .registered-address {
          margin: 13px 0 15px;
          line-height: 1.45;
        }
        .coordinates {
          display: block;
          margin-top: 10px;
          color: var(--muted);
          font-variant-numeric: tabular-nums;
        }
        .map-empty {
          min-height: 200px;
          display: grid;
          place-content: center;
          justify-items: center;
          gap: 6px;
          border: 1px dashed #bdcbb9;
          border-radius: 15px;
          background: #f7faf4;
          text-align: center;
        }
        .map-empty span {
          font-size: 30px;
          color: var(--green);
        }
        .map-empty small {
          color: var(--muted);
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
        .verification-docs {
          display: grid;
          gap: 14px;
        }
        .verification-docs h2 {
          margin-bottom: 0;
        }
        .submission-list {
          display: grid;
          gap: 12px;
        }
        .submission-card {
          display: grid;
          gap: 12px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fbfaf3;
          padding: 14px;
        }
        .submission-head {
          display: flex;
          justify-content: space-between;
          gap: 14px;
        }
        .submission-head strong,
        .submission-head span,
        .review-note b,
        .review-note span {
          display: block;
        }
        .submission-head span,
        .submission-head small,
        .review-note span {
          color: var(--muted);
          font-size: 12px;
          line-height: 1.45;
        }
        .review-note {
          margin: 0;
          border-top: 1px solid var(--line);
          padding-top: 10px;
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
        }
        .document-list button small {
          grid-column: 1;
          color: var(--muted);
        }
        .document-list button b {
          grid-column: 2;
          grid-row: 1 / span 2;
          color: var(--green);
          font-size: 12px;
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
        .device-panel {
          grid-column: 1 / -1;
        }
        .device-heading,
        .device-row {
          display: flex;
          align-items: center;
        }
        .device-heading {
          justify-content: space-between;
        }
        .device-heading h2 {
          margin: 3px 0 14px;
        }
        .device-count {
          min-width: 38px;
          padding: 8px 12px;
          border-radius: 99px;
          background: #e7f3d9;
          text-align: center;
          font-weight: 800;
        }
        .device-list {
          display: grid;
          gap: 9px;
        }
        .device-row {
          gap: 13px;
          padding: 14px;
          border: 1px solid var(--line);
          border-radius: 13px;
          background: #fafcf7;
        }
        .device-icon {
          width: 38px;
          height: 38px;
          display: grid;
          flex: none;
          place-items: center;
          border-radius: 11px;
          background: #dcebd5;
          color: var(--ink);
          font-weight: 900;
        }
        .device-row > div:nth-child(2) {
          display: grid;
          flex: 1;
          gap: 4px;
        }
        .device-row small,
        .device-active span,
        .device-note {
          color: var(--muted);
        }
        .device-active {
          display: grid;
          gap: 4px;
          text-align: right;
          font-size: 12px;
        }
        .device-note {
          margin: 13px 0 0;
          font-size: 12px;
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
        .preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 1100;
          display: grid;
          place-items: center;
          padding: 22px;
          background: #0c2d22b8;
          backdrop-filter: blur(5px);
        }
        .preview-dialog {
          width: min(1040px, 100%);
          height: min(820px, 92vh);
          display: grid;
          grid-template-rows: auto 1fr;
          overflow: hidden;
          border-radius: 18px;
          background: white;
          box-shadow: 0 24px 80px #071d1666;
        }
        .preview-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 16px 18px;
          border-bottom: 1px solid var(--line);
        }
        .preview-head h2 {
          margin: 3px 0 0;
          font-size: 18px;
        }
        .preview-head button {
          border: 1px solid var(--line);
          border-radius: 10px;
          background: white;
          padding: 10px 13px;
          font-weight: 800;
        }
        .preview-body {
          min-height: 0;
          display: grid;
          place-items: center;
          background: #f6f8f2;
        }
        .preview-body iframe {
          width: 100%;
          height: 100%;
          border: 0;
          background: white;
        }
        .preview-body img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        @media (max-width: 850px) {
          .detail-grid {
            grid-template-columns: 1fr;
          }
          .facts {
            grid-template-columns: 1fr;
          }
          .device-row {
            align-items: flex-start;
          }
          .device-active {
            text-align: left;
          }
        }
      `}</style>
    </>
  );
}
