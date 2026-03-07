"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRegistrations } from "@/lib/api/hooks";
import { Loader2 } from "lucide-react";

export default function TablesPage() {
  const { data: registrations = [], isLoading, error, refetch } = useRegistrations();

  const handleRefresh = () => {
    refetch();
  };

  const sortedRegistrations = [...registrations].sort((a, b) =>
    a.tableName.toLowerCase().localeCompare(b.tableName.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">Registered Tables</CardTitle>
            <CardDescription>
              Select a registered table to view and manage data.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4">
            <p className="text-sm text-muted-foreground">
              No registered tables found. Go to Admin Panel to initialize or discover registrations.
            </p>
            <div className="mt-4">
              <Link href="/admin">
                <Button size="sm">Open Admin Panel</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>ID Column</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Layouts</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRegistrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell className="font-medium">{registration.tableName}</TableCell>
                    <TableCell>{registration.idColumnName || "-"}</TableCell>
                    <TableCell>{registration.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/layouts?registrationId=${encodeURIComponent(registration.id)}`}>
                        <Button size="sm" variant="outline">Manage Layouts</Button>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/tables/${encodeURIComponent(registration.tableName)}`}>
                        <Button size="sm">Manage</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
