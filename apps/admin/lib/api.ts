import { auth } from './firebase';

export async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in');
  const response = await fetch(process.env.NEXT_PUBLIC_API_URL!, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors[0].message);
  return payload.data;
}
