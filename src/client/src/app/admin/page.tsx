"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRegistrations, useInitialize, useDiscoverTables, useDeleteRegistration } from "@/lib/api/hooks";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: registrations = [], isLoading, refetch } = useRegistrations();
  const initializeMutation = useInitialize();
  const discoverMutation = useDiscoverTables();
  const deleteMutation = useDeleteRegistration();

  const isWorking = initializeMutation.isPending || discoverMutation.isPending || deleteMutation.isPending;

  const handleInitialize = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await initializeMutation.mutateAsync();
      setSuccessMessage("Initialization completed.");
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to initialize");
    }
  };

  const handleDiscover = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const discovered = await discoverMutation.mutateAsync();
      setSuccessMessage(
        discovered.length === 0
          ? "Discovery completed. No new registrations were added."
          : `Discovery completed. Added ${discovered.length} registration(s).`
      );
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to discover tables");
    }
  };

  const handleDelete = async (id: string, tableName: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await deleteMutation.mutateAsync(id);
      setSuccessMessage(`Removed registration for '${tableName}'.`);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to delete registration");
    }
  };

  const handleRefresh = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">Admin Panel</CardTitle>
              <CardDescription>
                Initialize, discover, and manage table registrations.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isWorking}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : registrations.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4">
              <p className="mb-4 text-sm text-muted-foreground">
                No registrations found. Initialize defaults or auto-discover tables.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleInitialize} disabled={isWorking}>
                  {initializeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Initialize
                </Button>
                <Button variant="secondary" onClick={handleDiscover} disabled={isWorking}>
                  {discoverMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Discover and Register
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDiscover} disabled={isWorking}>
                {discoverMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Discover and Register
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registered tables yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>ID Column</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map((registration) => (
                    <TableRow key={registration.id}>
                      <TableCell className="font-medium">{registration.tableName}</TableCell>
                      <TableCell>{registration.idColumnName || "-"}</TableCell>
                      <TableCell>{registration.description || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(registration.id, registration.tableName)}
                          disabled={isWorking}
                        >
                          Delete
                        </Button>
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
