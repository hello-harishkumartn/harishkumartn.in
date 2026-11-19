import { Header } from "@/components/ui";
import { FrameworkCards } from "@/components/demo-live";
import type { FrameworkItem } from "@/lib/demo-store";
import { getJSON } from "@/lib/api";
import { UploadButton } from "@/components/upload-button";
export default async function Page(){const items=await getJSON<FrameworkItem[]>("/api/frameworks",[]);return <><Header eyebrow="Knowledge base" title="Frameworks" description="Versioned regulatory and control sources. Synthetic and real sources are labelled explicitly." action={<UploadButton resource="framework"/>}/><FrameworkCards initial={items}/></>}
