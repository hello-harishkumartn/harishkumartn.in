// Demo-only banner shown at the top of every page of the static demo.
export function DemoBanner() {
  return (
    <div
      role="note"
      className="sticky top-0 z-50 flex min-h-[2.75rem] flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-amber-100 px-4 py-2 text-center text-xs text-amber-900 shadow-sm"
    >
      <span>
        <strong className="font-semibold">Sample data.</strong> This demo runs in your browser with recorded responses. No backend or AI
        model is connected.
      </span>
      <span className="flex gap-3 font-medium">
        <a className="underline hover:text-amber-700" href="https://github.com/hello-harishkumartn/enterprise-knowledge-ai" target="_blank" rel="noopener noreferrer">
          Code on GitHub
        </a>
        <a className="underline hover:text-amber-700" href="/#projects">
          Back to harishkumartn.in
        </a>
      </span>
    </div>
  );
}
