import Link from "next/link";

// Recorded runs have prebuilt pages. Runs started in the browser use the live view.
export function runHref(id: string, session = false) {
  return session ? `/runs/live/?id=${encodeURIComponent(id)}` : `/runs/${id}/`;
}

export function RunLink({id, session, className, children}: {id: string; session?: boolean; className?: string; children: React.ReactNode}) {
  return <Link className={className} href={runHref(id, session)}>{children}</Link>;
}
