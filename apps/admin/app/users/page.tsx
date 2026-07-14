'use client';
import { FormEvent, useEffect, useState } from 'react';
import { gql } from '@/lib/api';
type User = { id:string; email?:string; displayName?:string; phone?:string; roles:string[]; status:string; verificationStatus:string; createdAt:string };
export default function UsersPage() {
  const [users,setUsers]=useState<User[]>([]); const [total,setTotal]=useState(0); const [search,setSearch]=useState(''); const [error,setError]=useState('');
  async function load(term=''){ try { const d=await gql<{adminUsers:{items:User[];total:number}}>(`query($filter:AdminUsersFilter){adminUsers(filter:$filter){total items{id email displayName phone roles status verificationStatus createdAt}}}`,{filter:{search:term||undefined,page:1,pageSize:50}}); setUsers(d.adminUsers.items); setTotal(d.adminUsers.total); } catch(e){setError((e as Error).message)} }
  useEffect(()=>{load()},[]);
  return <><header className="page-head"><div><p className="eyebrow">PEOPLE & BUSINESSES</p><h1>Accounts</h1><p>{total} registered accounts</p></div></header><form className="search" onSubmit={(e:FormEvent)=>{e.preventDefault();load(search)}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, phone or Firebase UID"/><button>Search</button></form>{error&&<div className="alert">{error}</div>}<div className="table-wrap"><table><thead><tr><th>Account</th><th>Type</th><th>Verification</th><th>Status</th><th>Joined</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><b>{u.displayName||'Profile incomplete'}</b><small>{u.email||u.phone||'No contact'}</small></td><td>{u.roles.filter(r=>r!=='CONSUMER').join(', ')||'Consumer'}</td><td><span className={`badge ${u.verificationStatus.toLowerCase()}`}>{u.verificationStatus.replaceAll('_',' ')}</span></td><td>{u.status}</td><td>{new Date(u.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div></>;
}
