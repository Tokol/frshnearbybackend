"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { gql } from "@/lib/api";
type User = {
  id: string;
  email?: string;
  displayName?: string;
  phone?: string;
  addressLine?: string;
  addressUnit?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  roles: string[];
  status: string;
  onboardingStep: string;
  verificationStatus: string;
  createdAt: string;
};

function accountTypeLabel(roles: string[]) {
  const labels: string[] = [];
  if (roles.includes("CONSUMER")) labels.push("Consumer");
  if (roles.includes("SIDE_HUSTLER")) labels.push("Side-hustle producer");
  if (roles.includes("BUSINESS")) labels.push("Registered business");
  return labels.join(" + ") || "No marketplace role";
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [canDelete, setCanDelete] = useState(false);
  const [deleting, setDeleting] = useState("");
  async function load(term = "") {
    try {
      const [d, session] = await Promise.all([
        gql<{ adminUsers: { items: User[]; total: number } }>(
          `query($filter:AdminUsersFilter){adminUsers(filter:$filter){total items{id email displayName phone addressLine addressUnit city postalCode country roles status onboardingStep verificationStatus createdAt}}}`,
          { filter: { search: term || undefined, page: 1, pageSize: 50 } },
        ),
        gql<{ session: { user: { roles: string[] } } }>(
          `query{session{user{roles}}}`,
        ),
      ]);
      setUsers(d.adminUsers.items);
      setTotal(d.adminUsers.total);
      setCanDelete(session.session.user.roles.includes("SUPER_ADMIN"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function remove(user: User) {
    const label = user.email || user.displayName || "this account";
    const confirmation = window.prompt(
      `Permanently delete ${label} from Firebase and FRSH?\n\nType DELETE to confirm.`,
    );
    if (confirmation !== "DELETE") return;
    const reason = window
      .prompt(
        "Why is this account being permanently deleted? This is required for the audit log.",
      )
      ?.trim();
    if (!reason || reason.length < 10) {
      setError("Enter a deletion reason of at least 10 characters.");
      return;
    }
    setDeleting(user.id);
    setError("");
    setMessage("");
    try {
      await gql(
        `mutation($input:DeleteUserInput!){deleteUserPermanently(input:$input)}`,
        { input: { userId: user.id, confirmation: "DELETE", reason } },
      );
      setMessage(`${label} was permanently deleted from Firebase and FRSH.`);
      await load(search);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting("");
    }
  }
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">PEOPLE & BUSINESSES</p>
          <h1>Accounts</h1>
          <p>{total} registered marketplace accounts</p>
        </div>
      </header>
      <form
        className="search"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          load(search);
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone or Firebase UID"
        />
        <button>Search</button>
      </form>
      {message && (
        <div className="attention" style={{ padding: 16 }}>
          {message}
        </div>
      )}
      {error && <div className="alert">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Type</th>
              <th>Location</th>
              <th>Onboarding</th>
              <th>Verification</th>
              <th>Status</th>
              <th>Joined</th>
              {canDelete && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link href={`/users/${u.id}`} className="user-link">
                    <b>{u.displayName || "Profile incomplete"}</b>
                  </Link>
                  <small>{u.email || u.phone || "No contact"}</small>
                  {u.email && u.phone && <small>{u.phone}</small>}
                </td>
                <td>{accountTypeLabel(u.roles)}</td>
                <td>
                  {[
                    u.addressLine,
                    u.addressUnit,
                    u.postalCode,
                    u.city,
                    u.country,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Not registered"}
                </td>
                <td>{u.onboardingStep.replaceAll("_", " ")}</td>
                <td>
                  <span
                    className={`badge ${u.verificationStatus.toLowerCase()}`}
                  >
                    {u.verificationStatus.replaceAll("_", " ")}
                  </span>
                </td>
                <td>{u.status}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                {canDelete && (
                  <td>
                    <button
                      className="danger-action"
                      disabled={deleting === u.id}
                      onClick={() => remove(u)}
                    >
                      {deleting === u.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .danger-action {
          border: 1px solid #e2aaa5;
          background: #fff5f4;
          color: #a43d36;
          border-radius: 9px;
          padding: 8px 11px;
          font-weight: 750;
          cursor: pointer;
        }
        .user-link {
          color: var(--ink);
          text-decoration: underline;
          text-decoration-color: #a9b8a7;
          text-underline-offset: 3px;
        }
        .danger-action:hover {
          background: #a43d36;
          color: white;
        }
        .danger-action:disabled {
          opacity: 0.55;
          cursor: wait;
        }
      `}</style>
    </>
  );
}
