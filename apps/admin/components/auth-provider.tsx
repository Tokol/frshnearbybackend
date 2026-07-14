'use client';
import { onAuthStateChanged, User } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';

const AuthContext = createContext<User | null>(null);
export const useAdminUser = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter(); const pathname = usePathname();
  useEffect(() => onAuthStateChanged(auth, (next) => {
    setUser(next); setReady(true);
    if (!next && pathname !== '/login') router.replace('/login');
    if (next && pathname === '/login') router.replace('/');
  }), [pathname, router]);
  if (!ready) return <div className="center"><div className="loader" /></div>;
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}
