"use client";

import { useEffect } from "react";
import { recordVisit } from "@/lib/passport";

/** Invisible: stamps the passport when a route page is visited. */
export default function PassportStamp({ slug, fromName, toName }: {
  slug: string; fromName: string; toName: string;
}) {
  useEffect(() => { recordVisit(slug, fromName, toName); }, [slug, fromName, toName]);
  return null;
}
