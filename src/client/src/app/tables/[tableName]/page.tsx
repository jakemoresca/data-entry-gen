"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useTableSchema,
  useTableData,
  useCreateRow,
  useUpdateRow,
  useDeleteRow,
} from "@/lib/api/hooks";
import { valueToString, convertValue } from "@/lib/type-conversion";
import type { DataRow, ColumnInfo } from "@/lib/types";
import { Loader2, ArrowLeft } from "lucide-react";

export default function TableDataPage() {
  const params = useParams();
  const tableName = decodeURIComponent(params.tableName as string);

  const [isCreating, setIsCreating] = useState(false);
  const [editingRow, setEditingRow] = useState<DataRow | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { data: schema, isLoading: schemaLoading } = useTableSchema(tableName);
  const { data: rows = [], isLoading: dataLoading } = useTableData(tableName);
  const createMutation = useCreateRow(tableName);
  const updateMutation = useUpdateRow(tableName);
  const deleteMutation = useDeleteRow(tableName);

  const isLoading = schemaLoading || dataLoading;
  const primaryKeyColumn = schema?.columns.find((col) => col.isPrimaryKey);

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingRow(null);
    setFormData({});
    setErrorMessage(null);
    setSuccessMessage(null);
    setValidationErrors({});
  };

  const handleStartEdit = (row: DataRow) => {
    setEditingRow(row);
    setIsCreating(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setValidationErrors({});

    // Convert row data to form strings
    const newFormData: Record<string, string> = {};
    schema?.columns.forEach((col) => {
      newFormData[col.name] = valueToString(row[col.name]);
    });
    setFormData(newFormData);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingRow(null);
    setFormData({});
    setErrorMessage(null);
    setSuccessMessage(null);
    setValidationErrors({});
  };

  const handleInputChange = (columnName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [columnName]: value }));
    // Clear validation error for this field
    if (validationErrors[columnName]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[columnName];
        return newErrors;
      });
    }
  };

  const validateAndConvertData = (): DataRow | null => {
    if (!schema) return null;

    const convertedData: DataRow = {};
    const errors: Record<string, string> = {};

    for (const column of schema.columns) {
      const value = formData[column.name] || "";

      // Skip primary key validation for updates
      if (editingRow && column.isPrimaryKey) {
        convertedData[column.name] = editingRow[column.name];
        continue;
      }

      // Check if required (non-nullable, non-primary key columns with no value)
      if (!column.isNullable && !column.isPrimaryKey && !value.trim()) {
        errors[column.name] = "This field is required";
        continue;
      }

      // Convert empty values for nullable columns
      if (!value.trim() && column.isNullable) {
        convertedData[column.name] = null;
        continue;
      }

      // Skip primary key during creation if empty (let DB generate it)
      if (isCreating && column.isPrimaryKey && !value.trim()) {
        continue;
      }

      // Convert value
      try {
        const converted = convertValue(value, column.dataType);
        convertedData[column.name] = converted;
      } catch (error: any) {
        errors[column.name] = error.message || "Invalid value";
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return null;
    }

    return convertedData;
  };

  const handleCreate = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const data = validateAndConvertData();
    if (!data) {
      setErrorMessage("Please fix validation errors");
      return;
    }

    try {
      await createMutation.mutateAsync(data);
      setSuccessMessage("Row created successfully");
      handleCancel();
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to create row");
    }
  };

  const handleUpdate = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const data = validateAndConvertData();
    if (!data) {
      setErrorMessage("Please fix validation errors");
      return;
    }

    try {
      await updateMutation.mutateAsync(data);
      setSuccessMessage("Row updated successfully");
      handleCancel();
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to update row");
    }
  };

  const handleDelete = async (row: DataRow) => {
    if (!primaryKeyColumn) {
      setErrorMessage("No primary key defined");
      return;
    }

    if (!confirm(`Delete this row?`)) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const id = String(row[primaryKeyColumn.name]);
      await deleteMutation.mutateAsync(id);
      setSuccessMessage("Row deleted successfully");
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to delete row");
    }
  };

  const renderFormField = (column: ColumnInfo) => {
    const value = formData[column.name] || "";
    const isDisabled = !!(editingRow && column.isPrimaryKey);
    const error = validationErrors[column.name];

    // For JSON types, use textarea
    const isJsonType = column.dataType.toLowerCase().includes("json");

    return (
      <div key={column.name} className="space-y-2">
        <Label htmlFor={column.name}>
          {column.name}
          {!column.isNullable && !column.isPrimaryKey && (
            <span className="text-destructive ml-1">*</span>
          )}
          <span className="ml-2 text-xs text-muted-foreground">
            ({column.dataType})
          </span>
        </Label>
        {isJsonType ? (
          <Textarea
            id={column.name}
            value={value}
            onChange={(e) => handleInputChange(column.name, e.target.value)}
            disabled={isDisabled}
            placeholder={column.isNullable ? "Optional" : "Required"}
            rows={3}
            className={error ? "border-destructive" : ""}
          />
        ) : (
          <Input
            id={column.name}
            type="text"
            value={value}
            onChange={(e) => handleInputChange(column.name, e.target.value)}
            disabled={isDisabled}
            placeholder={column.isNullable ? "Optional" : "Required"}
            className={error ? "border-destructive" : ""}
          />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {column.isForeignKey && column.foreignKeyTable && (
          <p className="text-xs text-muted-foreground">
            References {column.foreignKeyTable}.{column.foreignKeyColumn}
          </p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!schema) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load table schema</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Link href="/tables">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="flex-1">
              <CardTitle className="text-2xl">{tableName}</CardTitle>
              <CardDescription>Manage table data</CardDescription>
            </div>
            {!isCreating && !editingRow && (
              <Button onClick={handleStartCreate}>Create New Row</Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
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

      {/* Create/Edit Form */}
      {(isCreating || editingRow) && (
        <Card>
          <CardHeader>
            <CardTitle>{isCreating ? "Create New Row" : "Edit Row"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {schema.columns.map(renderFormField)}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={isCreating ? handleCreate : handleUpdate}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isCreating ? "Create" : "Update"}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data ({rows.length} rows)</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {schema.columns.map((col) => (
                      <TableHead key={col.name}>{col.name}</TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index}>
                      {schema.columns.map((col) => (
                        <TableCell key={col.name} className="max-w-xs truncate">
                          {valueToString(row[col.name])}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(row)}
                            disabled={isCreating || editingRow !== null}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(row)}
                            disabled={deleteMutation.isPending || isCreating || editingRow !== null}
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
