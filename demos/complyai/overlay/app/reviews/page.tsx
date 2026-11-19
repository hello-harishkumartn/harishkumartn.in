import { Header } from "@/components/ui";
import { ReviewList } from "@/components/demo-live";
import type { Review } from "@/lib/demo-store";
import { getJSON } from "@/lib/api";
export default async function Page(){const items=await getJSON<Review[]>("/api/reviews",[]);return <><Header eyebrow="Human oversight" title="Review queue" description="Approve, reject, modify, or request more evidence. Every decision records the reviewer, timestamp, and reason."/><ReviewList initial={items}/></>}
