import { notFound } from "next/navigation";
import TableDataClient from "./TableDataClient";
import { getAllRegistrations, getTableSchema } from "../../../lib/api/server";
import type { RegistrationRecord, TableInfo } from "../../../lib/types";

export async function generateStaticParams() {
  const regs = await getAllRegistrations();
  return regs.map((r: RegistrationRecord) => ({ tableName: r.tableName }));
}

export default async function TablePage({ params }: { params: { tableName: string } }) {
  const tableName = params.tableName;

  const schema = await getTableSchema(tableName);

  if (!schema) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      {/* Render the client component that handles UI and interactions */}
      <TableDataClient />
    </div>
  );
}
