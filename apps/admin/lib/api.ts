import { auth } from './firebase';

export async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new Error('Admin API URL is not configured.');
  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error('Could not reach the API. Check that the backend is deployed and CORS allows this admin URL.');
  }
  const text = await response.text();
  let payload: { data?: T; errors?: { message?: string }[]; message?: string };
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`API returned an invalid response (${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(payload.message || payload.errors?.[0]?.message || `API request failed (${response.status}).`);
  }
  if (payload.errors?.length) throw new Error(payload.errors[0].message);
  if (!payload.data) throw new Error('API returned no data.');
  return payload.data;
}
