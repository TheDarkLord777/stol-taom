import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCESS_TOKEN_NAME, verifyToken } from '@/lib/jwtAuth';

export default async function ProfilePage() {
  // Page-level guard (fallback in dev): require a valid access token
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_NAME)?.value;
  if (!token) redirect('/login');
  try {
    await verifyToken(token);
  } catch {
    redirect('/login');
  }

  return (
    <div>
      <h1>Profile</h1>
      <p></p>
      <p></p>
    </div>
  );
}
