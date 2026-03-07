"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCreateLayout, useDeleteLayout, useLayouts, useRegistrations } from "@/lib/api/hooks";
import type { LayoutDefinition, LayoutRecord, LayoutType } from "@/lib/types";

function createStarterLayout(type: LayoutType, tableName: string): LayoutDefinition {
  return {
    title: `${tableName} ${type === "list" ? "List" : "Details"}`,
    layoutType: type === "list" ? "table" : "form",
    layout: [],
  };
}

export default function LayoutsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registrationFilter = searchParams.get("registrationId") ?? "";

  const [openCreate, setOpenCreate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newRegistrationId, setNewRegistrationId] = useState("");
  const [newType, setNewType] = useState<LayoutType>("list");
  const [newName, setNewName] = useState("");

  const { data: layouts = [], isLoading: layoutsLoading, refetch } = useLayouts();
  const { data: registrations = [], isLoading: regsLoading } = useRegistrations();
  const createMutation = useCreateLayout();
  const deleteMutation = useDeleteLayout();

  const registrationMap = useMemo(() => {
    return new Map(registrations.map((r) => [r.id, r]));
  }, [registrations]);

  const visibleLayouts = useMemo(() => {
    const list = registrationFilter
      ? layouts.filter((l) => l.registrationId === registrationFilter)
      : layouts;

    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [layouts, registrationFilter]);

  const isWorking = createMutation.isPending || deleteMutation.isPending;

  const handleCreate = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const registrationId = newRegistrationId || registrationFilter;
    if (!registrationId) {
      setErrorMessage("Select a registered table first.");
      return;
    }

    const registration = registrationMap.get(registrationId);
    if (!registration) {
      setErrorMessage("Invalid registration selected.");
      return;
    }

    const effectiveName = newName.trim() || `${registration.tableName} - ${newType}`;
    const newLayout: LayoutRecord = {
      id: crypto.randomUUID(),
      name: effectiveName,
      type: newType,
      registrationId,
      layout: createStarterLayout(newType, registration.tableName),
    };

    try {
      const created = await createMutation.mutateAsync(newLayout);
      setSuccessMessage("Layout created.");
      setOpenCreate(false);
      setNewName("");
      setNewRegistrationId("");
      router.push(`/layouts/${created.id}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create layout";
      setErrorMessage(message);
    }
  };

  const handleDelete = async (layout: LayoutRecord) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!confirm(`Delete '${layout.name}'?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(layout.id);
      setSuccessMessage(`Deleted '${layout.name}'.`);
      await refetch();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete layout";
      setErrorMessage(message);
    }
  };

  const loading = layoutsLoading || regsLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">Manage Layouts</CardTitle>
              <CardDescription>
                Build list and detail layouts for registered tables.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()} disabled={isWorking || loading}>
                Refresh
              </Button>
              <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Layout
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Layout</DialogTitle>
                    <DialogDescription>
                      Choose the registration and type, then open the editor.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Registered Table</Label>
                      <Select
                        value={newRegistrationId || registrationFilter}
                        onValueChange={setNewRegistrationId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select table" />
                        </SelectTrigger>
                        <SelectContent>
                          {registrations.map((reg) => (
                            <SelectItem key={reg.id} value={reg.id}>
                              {reg.tableName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Layout Type</Label>
                      <Select value={newType} onValueChange={(value) => setNewType(value as LayoutType)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="list">list</SelectItem>
                          <SelectItem value="detail">detail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="layout-name">Layout Name</Label>
                      <Input
                        id="layout-name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Optional custom name"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenCreate(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {registrationFilter && (
            <Alert>
              <AlertDescription>
                Filtered by registration: {registrationMap.get(registrationFilter)?.tableName || registrationFilter}
              </AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : visibleLayouts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4">
              <p className="text-sm text-muted-foreground">No layouts found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleLayouts.map((layout) => (
                    <TableRow key={layout.id}>
                      <TableCell className="font-medium">{layout.name}</TableCell>
                      <TableCell>{layout.type}</TableCell>
                      <TableCell>{registrationMap.get(layout.registrationId)?.tableName || "-"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Link href={`/layouts/${layout.id}`}>
                            <Button size="sm">Open Editor</Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(layout)}
                            disabled={isWorking}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
