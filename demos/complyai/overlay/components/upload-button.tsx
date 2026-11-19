"use client";
// Demo build: the file is read in the browser and added to the in-memory
// session instead of POST /api/frameworks or /api/evidence. Nothing is sent anywhere.
import { useRef, useState } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/20/solid";
import { uploadEvidence, uploadFramework } from "@/lib/demo-store";

export function UploadButton({ resource }: { resource: "framework" | "evidence" }) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState("Upload text file");
  async function upload(file?: File) {
    if (!file) return;
    setState("Uploading…");
    const content = await file.text();
    const err = resource === "framework"
      ? uploadFramework(file.name.replace(/\.[^.]+$/, ""), content)
      : uploadEvidence(file.name, content);
    if (input.current) input.current.value = "";
    setState(err ? `Upload failed: ${err}` : "Added for this session. Upload another");
  }
  return <div className="flex flex-col items-start gap-1 md:items-end"><input ref={input} className="hidden" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={e => upload(e.target.files?.[0])}/><button onClick={() => input.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"><ArrowUpTrayIcon className="h-4 w-4"/>{state}</button><p className="text-[11px] text-ink/45">Stays in this browser tab. Nothing is uploaded.</p></div>;
}
