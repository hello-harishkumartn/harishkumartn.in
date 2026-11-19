import { Header } from "@/components/ui";
import { EvidenceTable } from "@/components/demo-live";
import type { EvidenceItem } from "@/lib/demo-store";
import { getJSON } from "@/lib/api";
import { UploadButton } from "@/components/upload-button";
export default async function Page(){const items=await getJSON<EvidenceItem[]>("/api/evidence",[]);return <><Header eyebrow="Evidence room" title="Evidence" description="Uploaded documents are treated as untrusted data. Instruction-like content is isolated and escalated." action={<UploadButton resource="evidence"/>}/><div className="card overflow-x-auto"><EvidenceTable initial={items}/></div></>}
