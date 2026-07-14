'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function Sidebar() {
  const pathname = usePathname(); const router = useRouter();
  if (pathname === '/login') return null;
  return <aside className="sidebar">
    <div className="brand"><span className="pin">●</span><div><b>FRSH</b><small>operations</small></div></div>
    <nav><Link className={pathname === '/' ? 'active' : ''} href="/">Overview</Link><Link className={pathname.startsWith('/users') ? 'active' : ''} href="/users">People & businesses</Link><Link className={pathname.startsWith('/verifications') ? 'active' : ''} href="/verifications">Verification queue</Link><Link className={pathname.startsWith('/admins') ? 'active' : ''} href="/admins">Admin management</Link></nav>
    <button className="signout" onClick={async () => { await signOut(auth); router.replace('/login'); }}>Sign out</button>
  </aside>;
}
