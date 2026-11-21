import Link from 'next/link';
export default function NotFound() {
  return <main className="mx-auto max-w-xl px-5 py-24"><h1 className="text-3xl font-bold">Out of court</h1><p className="mt-3 text-muted">That page does not exist.</p><Link className="btn mt-6" href="/">Back home</Link></main>;
}
