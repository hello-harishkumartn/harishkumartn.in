import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/auth';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin sign in' };

export default async function LoginPage() {
  if (await getAdmin()) redirect('/admin');
  return (
    <main className="mx-auto max-w-sm px-5 py-24">
      <h1 className="mb-6 text-2xl font-bold">Admin sign in</h1>
      <LoginForm />
    </main>
  );
}
