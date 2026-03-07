import type { LayoutRecord, RegistrationRecord, TableInfo } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://localhost:5001";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/${path}`);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function getAllRegistrations(): Promise<RegistrationRecord[]> {
  return fetchJson<RegistrationRecord[]>("api/registration");
}

export async function getTableSchema(tableName: string): Promise<TableInfo | null> {
  try {
    return await fetchJson<TableInfo>(`api/schema/tables/${encodeURIComponent(tableName)}`);
  } catch {
    return null;
  }
}

export async function getAllLayouts(): Promise<LayoutRecord[]> {
  return fetchJson<LayoutRecord[]>("api/layouts");
}
