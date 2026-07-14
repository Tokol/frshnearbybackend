'use client';

import { FormEvent, useEffect, useState } from 'react';
import { gql } from '@/lib/api';

type Session = { session: { user: { roles: string[] } } };
type GrantedAdmin = { id: string; email?: string; displayName?: string; roles: string[] };

export default function AdminManagementPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    gql<Session>(`query { session { user { roles } } }`)
      .then((data) => setIsSuperAdmin(data.session.user.roles.includes('SUPER_ADMIN')))
      .catch((reason) => { setError(reason.message); setIsSuperAdmin(false); });
  }, []);

  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(''); setError('');
    const email = String(new FormData(event.currentTarget).get('email')).trim().toLowerCase();
    try {
      const data = await gql<{ grantAdminRole: GrantedAdmin }>(
        `mutation($input: GrantAdminInput!) { grantAdminRole(input: $input) { id email displayName roles } }`,
        { input: { email } },
      );
      setMessage(`${data.grantAdminRole.email ?? email} is now an administrator.`);
      event.currentTarget.reset();
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  if (isSuperAdmin === null) return <div className="center"><div className="loader" /></div>;
  if (!isSuperAdmin) return <><header className="page-head"><div><p className="eyebrow">ACCESS CONTROL</p><h1>Super admin only</h1><p>Only a super administrator can grant administrator access.</p></div></header>{error && <div className="alert">{error}</div>}</>;

  return <>
    <header className="page-head"><div><p className="eyebrow">ACCESS CONTROL</p><h1>Admin management</h1><p>Grant operational access to an existing FRSH account.</p></div></header>
    <section className="panel" style={{ maxWidth: 620 }}>
      <h3>Create an administrator</h3>
      <p className="muted">The person must sign in to FRSH Nearby once before you grant access. This action is recorded in the audit log.</p>
      <form className="login-card" style={{ width: '100%' }} onSubmit={grant}>
        <label>Account email<input name="email" type="email" required placeholder="admin@frshnearby.com" /></label>
        {message && <div className="attention" style={{ padding: 16 }}>{message}</div>}
        {error && <div className="alert">{error}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Granting access…' : 'Grant admin access'}</button>
      </form>
    </section>
  </>;
}
