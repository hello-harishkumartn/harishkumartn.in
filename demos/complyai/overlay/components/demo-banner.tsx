import { REPO_URL } from "@/lib/api";

export function DemoBanner() {
  return <div role="note" className="demo-banner sticky top-0 z-[70] flex min-h-11 flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-amber px-4 py-2 text-center text-xs font-semibold text-ink shadow">
    <span>Sample data. This demo runs in your browser with recorded responses. No backend or AI model is connected.</span>
    <span className="flex gap-3"><a className="underline underline-offset-2" href={REPO_URL} target="_blank" rel="noopener noreferrer">Code on GitHub</a><a className="underline underline-offset-2" href="/#projects">Back to harishkumartn.in</a></span>
  </div>;
}
