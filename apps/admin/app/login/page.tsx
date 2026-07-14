'use client';
import { FormEvent, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget);
    try { await signInWithEmailAndPassword(auth, String(form.get('email')), String(form.get('password'))); }
    catch { setError('Sign-in failed. Use an approved administrator account.'); setBusy(false); }
  }
  return <div className="login-page"><section className="login-art"><div className="sun" /><div className="field-lines"/><div><p className="eyebrow">FRSH NEARBY</p><h1>Trust grows<br/>locally.</h1><p>Review producers and businesses with care.</p></div></section><section className="login-panel"><form className="login-card" onSubmit={submit}><div className="brand mobile"><span className="pin">●</span><div><b>FRSH</b><small>operations</small></div></div><p className="eyebrow">SECURE ADMIN</p><h2>Welcome back</h2><p className="muted">Sign in using your administrator account.</p><label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Password<input name="password" type="password" required autoComplete="current-password" /></label>{error && <p className="error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button></form></section></div>;
}
