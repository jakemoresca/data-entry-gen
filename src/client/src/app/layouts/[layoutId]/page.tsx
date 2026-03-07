import LayoutEditorClient from "./LayoutEditorClient";
import { getAllLayouts } from "@/lib/api/server";
import type { LayoutRecord } from "@/lib/types";

export async function generateStaticParams() {
  const layouts = await getAllLayouts();
  return layouts.map((layout: LayoutRecord) => ({ layoutId: layout.id }));
}

export default function LayoutEditorPage() {
  return (
    <div className="container mx-auto py-8">
      <LayoutEditorClient />
    </div>
  );
}
