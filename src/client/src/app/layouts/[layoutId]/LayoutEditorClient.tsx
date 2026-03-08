"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Braces, Loader2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLayout, useRegistrations, useTableSchema, useUpdateLayout } from "@/lib/api/hooks";
import type { DisplayType, LayoutDefinition, LayoutElementConfig, LayoutRecord } from "@/lib/types";
import { JsonataBuilder } from "@/components/JsonataBuilder";
import { isJsonataExpression } from "@/lib/jsonata-utils";

const DISPLAY_TYPES: DisplayType[] = ["label", "text", "number", "textarea", "dropdown", "button"];

type LayoutElementLike = Partial<LayoutElementConfig>;
type LayoutDefinitionLike = Partial<LayoutDefinition> & { layout?: LayoutElementLike[] };

function normalizeLayoutDefinition(input: LayoutDefinitionLike | null | undefined, fallbackType: "list" | "detail"): LayoutDefinition {
  const layoutType = input?.layoutType === "table" || input?.layoutType === "form"
    ? input.layoutType
    : fallbackType === "list"
      ? "table"
      : "form";

  const rawLayout = Array.isArray(input?.layout) ? input.layout : [];
  const normalizedLayout: LayoutElementConfig[] = rawLayout.map((item, index) => ({
    column: String(item?.column ?? `column_${index + 1}`),
    label: String(item?.label ?? `Column ${index + 1}`),
    value: String(item?.value ?? item?.column ?? ""),
    disabled: Boolean(item?.disabled ?? false),
    columnWidth: Number(item?.columnWidth ?? 30),
    displayType: DISPLAY_TYPES.includes((item?.displayType as DisplayType) ?? "label") ? (item?.displayType as DisplayType) : "label",
    datasourceType: item?.datasourceType,
    useDatasource: Boolean(item?.useDatasource ?? false),
    datasource: item?.datasource,
    action: item?.action,
  }));

  return {
    title: String(input?.title ?? "Page Title"),
    layoutType,
    layout: normalizedLayout,
  };
}

function createElement(displayType: DisplayType, columnName?: string): LayoutElementConfig {
  return {
    column: columnName || "",
    label: columnName || "New Element",
    value: columnName || "",
    disabled: false,
    columnWidth: 30,
    displayType,
    datasourceType: displayType === "dropdown" ? "hardcoded" : undefined,
    useDatasource: false,
    datasource: displayType === "dropdown" ? "choice 1|choice 2" : undefined,
    action: displayType === "button" ? "save" : undefined,
  };
}

function parseTableDatasource(ds?: string | null) {
  if (!ds) return { registrationId: "", displayColumn: "", valueColumn: "" };
  const parts = ds.split("|");
  return {
    registrationId: parts[0] || "",
    displayColumn: parts[1] || "",
    valueColumn: parts[2] || "",
  };
}

function parseHardcodedPairs(ds?: string | null) {
  if (!ds) return [] as { name: string; value: string }[];
  const parts = ds.split("|").map((p) => p.trim()).filter(Boolean);
  const pairs: { name: string; value: string }[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    pairs.push({ name: parts[i] ?? "", value: parts[i + 1] ?? "" });
  }
  return pairs;
}

function buildTableDatasource(registrationId: string, displayColumn: string, valueColumn: string) {
  return `${registrationId}|${displayColumn}|${valueColumn}`;
}

export default function LayoutEditorClient() {
  const params = useParams();
  const layoutId = params.layoutId as string;

  const [draft, setDraft] = useState<LayoutRecord | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [addElementOpen, setAddElementOpen] = useState(false);
  const [newElementType, setNewElementType] = useState<DisplayType>("label");
  const [newElementColumn, setNewElementColumn] = useState("__none__");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // JSONata builder dialog state
  const [jsonataBuilderOpen, setJsonataBuilderOpen] = useState(false);
  const [jsonataProperty, setJsonataProperty] = useState<"label" | "value" | "datasource" | "dsRegId" | "dsDisplayCol" | "dsValueCol">("label");
  const [jsonataInitialExpression, setJsonataInitialExpression] = useState("");

  const { data: layoutRecord, isLoading } = useLayout(layoutId);
  const { data: registrations = [] } = useRegistrations();
  const updateMutation = useUpdateLayout();

  const baseRecord = useMemo(() => {
    if (!layoutRecord) {
      return null;
    }

    return {
      ...layoutRecord,
      layout: normalizeLayoutDefinition(layoutRecord.layout, layoutRecord.type),
    } satisfies LayoutRecord;
  }, [layoutRecord]);

  const workingRecord = draft && baseRecord && draft.id === baseRecord.id ? draft : baseRecord;

  const registration = useMemo(() => {
    if (!workingRecord) {
      return null;
    }

    return registrations.find((r) => r.id === workingRecord.registrationId) || null;
  }, [workingRecord, registrations]);

  const { data: schema } = useTableSchema(registration?.tableName || "");

  const selectedElement = selectedIndex !== null ? workingRecord?.layout.layout[selectedIndex] : null;

  // local selected datasource parsing for table datasource editing (kept in state to avoid render mismatches)
  const [dsRegId, setDsRegId] = useState<string>("");
  const [dsDisplayColumn, setDsDisplayColumn] = useState<string>("");
  const [dsValueColumn, setDsValueColumn] = useState<string>("");

  useEffect(() => {
    if (!selectedElement) {
      setDsRegId("");
      setDsDisplayColumn("");
      setDsValueColumn("");
      return;
    }

    const parsed = parseTableDatasource(selectedElement.datasource);
    setDsRegId(parsed.registrationId);
    setDsDisplayColumn(parsed.displayColumn);
    setDsValueColumn(parsed.valueColumn);
  }, [selectedElement]);

  const selectedRegistration = useMemo(() => {
    return registrations.find((r) => r.id === dsRegId) || null;
  }, [registrations, dsRegId]);

  const { data: selectedSchema } = useTableSchema(selectedRegistration?.tableName || "");

  const updateDraft = (updater: (current: LayoutRecord) => LayoutRecord) => {
    if (!workingRecord) {
      return;
    }

    setDraft(updater(workingRecord));
  };

  const updateSelectedElement = (patch: Partial<LayoutElementConfig>) => {
    if (selectedIndex === null) {
      return;
    }

    updateDraft((current) => {
      const nextLayout = [...current.layout.layout];
      nextLayout[selectedIndex] = { ...nextLayout[selectedIndex], ...patch };
      return {
        ...current,
        layout: {
          ...current.layout,
          layout: nextLayout,
        },
      };
    });
  };

  const handleAddElement = () => {
    const columnName = newElementColumn === "__none__" ? undefined : newElementColumn;
    const item = createElement(newElementType, columnName);

    if (!workingRecord) {
      return;
    }

    const nextIndex = workingRecord.layout.layout.length;
    updateDraft((current) => ({
      ...current,
      layout: {
        ...current.layout,
        layout: [...current.layout.layout, item],
      },
    }));
    setSelectedIndex(nextIndex);
    setAddElementOpen(false);
    setNewElementType("label");
    setNewElementColumn("__none__");
  };

  const handleRemoveElement = () => {
    if (selectedIndex === null) {
      return;
    }

    updateDraft((current) => ({
      ...current,
      layout: {
        ...current.layout,
        layout: current.layout.layout.filter((_, index) => index !== selectedIndex),
      },
    }));
    setSelectedIndex(null);
  };

  const handleSave = async () => {
    if (!workingRecord) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateMutation.mutateAsync({
        id: workingRecord.id,
        data: {
          ...workingRecord,
        },
      });

      setSuccessMessage("Layout saved successfully.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save layout";
      setErrorMessage(message);
    }
  };

  const handleOpenJsonataBuilder = (property: typeof jsonataProperty, currentValue: string) => {
    setJsonataProperty(property);
    setJsonataInitialExpression(currentValue);
    setJsonataBuilderOpen(true);
  };

  // Drag and drop reordering for layout elements
  const handleDragStart = (e: any, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: any, targetIndex: number) => {
    e.preventDefault();
    const srcRaw = e.dataTransfer.getData("text/plain");
    const srcIndex = Number(srcRaw);
    if (Number.isNaN(srcIndex)) return;
    if (!workingRecord) return;
    if (srcIndex === targetIndex) return;

    updateDraft((current) => {
      const next = [...current.layout.layout];
      const [moved] = next.splice(srcIndex, 1);
      next.splice(targetIndex, 0, moved);
      return {
        ...current,
        layout: {
          ...current.layout,
          layout: next,
        },
      };
    });

    setSelectedIndex(targetIndex);
  };

  const handleSaveJsonataExpression = (expression: string) => {
    if (!selectedElement) {
      return;
    }

    switch (jsonataProperty) {
      case "label":
        updateSelectedElement({ label: expression });
        break;
      case "value":
        updateSelectedElement({ value: expression });
        break;
      case "datasource":
        updateSelectedElement({ datasource: expression });
        break;
      case "dsRegId":
        setDsRegId(expression);
        updateSelectedElement({ datasource: buildTableDatasource(expression, dsDisplayColumn || "", dsValueColumn || "") });
        break;
      case "dsDisplayCol":
        setDsDisplayColumn(expression);
        updateSelectedElement({ datasource: buildTableDatasource(dsRegId || "", expression, dsValueColumn || "") });
        break;
      case "dsValueCol":
        setDsValueColumn(expression);
        updateSelectedElement({ datasource: buildTableDatasource(dsRegId || "", dsDisplayColumn || "", expression) });
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!workingRecord) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Layout not found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start gap-3">
            <Link href="/layouts">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="flex-1">
              <CardTitle className="text-2xl">Layout Editor</CardTitle>
              <CardDescription>
                Configure form/table elements and save the layout JSON.
              </CardDescription>
            </div>
            <Dialog open={addElementOpen} onOpenChange={setAddElementOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Element
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add element</DialogTitle>
                  <DialogDescription>Choose the display type to add.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Display Type</Label>
                    <Select value={newElementType} onValueChange={(v) => setNewElementType(v as DisplayType)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISPLAY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Column (optional)</Label>
                    <Select value={newElementColumn || "__none__"} onValueChange={setNewElementColumn}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {(schema?.columns || []).map((column) => (
                          <SelectItem key={column.name} value={column.name}>{column.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddElementOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddElement}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Layout
            </Button>
          </div>
        </CardHeader>
      </Card>

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

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>WYSIWYG Canvas</CardTitle>
            <CardDescription>
              Click an element to edit its properties.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="layout-name">Name</Label>
                <Input
                  id="layout-name"
                  value={workingRecord.name}
                  onChange={(e) => updateDraft((current) => ({ ...current, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={workingRecord.type}
                  onValueChange={(value) => updateDraft((current) => ({ ...current, type: value as "list" | "detail" }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">list</SelectItem>
                    <SelectItem value="detail">detail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                value={workingRecord.layout.title}
                onChange={(e) =>
                  updateDraft((current) => ({
                    ...current,
                    layout: {
                      ...current.layout,
                      title: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Layout Type</Label>
              <Select
                value={workingRecord.layout.layoutType}
                onValueChange={(value) =>
                  updateDraft((current) => ({
                    ...current,
                    layout: {
                      ...current.layout,
                      layoutType: value as "table" | "form",
                    },
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">table</SelectItem>
                  <SelectItem value="form">form</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {workingRecord.layout.layout.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No elements yet. Use Add Element to start.
              </div>
            ) : (
              <div className="space-y-2">
                {workingRecord.layout.layout.map((item, index) => (
                  <button
                    key={`${item.displayType}-${index}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => setSelectedIndex(index)}
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      selectedIndex === index ? "border-primary bg-accent" : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{item.label || "Untitled element"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.displayType} | column: {item.column || "-"}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">Drag</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
            <CardDescription>
              {selectedElement ? "Edit selected element." : "Select an element to edit."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedElement ? (
              <p className="text-sm text-muted-foreground">No element selected.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Column</Label>
                  <Input
                    value={selectedElement.column}
                    onChange={(e) => updateSelectedElement({ column: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <div className="flex gap-2">
                    <Input
                      value={selectedElement.label}
                      onChange={(e) => updateSelectedElement({ label: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenJsonataBuilder("label", selectedElement.label)}
                      title="Open JSONata Expression Builder"
                    >
                      <Braces className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  {selectedElement.displayType === "dropdown" ? (
                    selectedElement.datasourceType === "hardcoded" ? (
                      <Select
                        value={selectedElement.value || "__none__"}
                        onValueChange={(value) => updateSelectedElement({ value: value === "__none__" ? "" : value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {parseHardcodedPairs(selectedElement.datasource).map((opt) => (
                            <SelectItem key={opt.value || opt.name} value={opt.value}>{opt.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select
                        value={selectedElement.value || "__none__"}
                        onValueChange={(value) => updateSelectedElement({ value: value === "__none__" ? "" : value })}
                        disabled
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select value at runtime" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                        </SelectContent>
                      </Select>
                    )
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={selectedElement.value}
                        onChange={(e) => updateSelectedElement({ value: e.target.value })}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenJsonataBuilder("value", selectedElement.value)}
                        title="Open JSONata Expression Builder"
                      >
                        <Braces className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Display Type</Label>
                  <Select
                    value={selectedElement.displayType}
                    onValueChange={(value) => updateSelectedElement({ displayType: value as DisplayType })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPLAY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Column Width</Label>
                  <Input
                    type="number"
                    value={selectedElement.columnWidth}
                    onChange={(e) => updateSelectedElement({ columnWidth: Number(e.target.value || 0) })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="disabled"
                    type="checkbox"
                    checked={selectedElement.disabled}
                    onChange={(e) => updateSelectedElement({ disabled: e.target.checked })}
                  />
                  <Label htmlFor="disabled">Disabled</Label>
                </div>

                {selectedElement.displayType === "label" && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        id="use-datasource"
                        type="checkbox"
                        checked={Boolean(selectedElement.useDatasource)}
                        onChange={(e) => updateSelectedElement({ useDatasource: e.target.checked })}
                      />
                      <Label htmlFor="use-datasource">Use datasource for label</Label>
                    </div>

                    {selectedElement.useDatasource && (
                      <>
                        <div className="space-y-2">
                          <Label>Datasource Type</Label>
                          <Select
                            value={selectedElement.datasourceType || "hardcoded"}
                            onValueChange={(value) => updateSelectedElement({ datasourceType: value as "hardcoded" | "table" })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hardcoded">hardcoded</SelectItem>
                              <SelectItem value="table">table</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedElement.datasourceType === "table" ? (
                          <>
                            <div className="space-y-2">
                              <Label>Table (registration)</Label>
                              <div className="flex gap-2">
                                {isJsonataExpression(dsRegId) ? (
                                  <Input
                                    value={dsRegId}
                                    onChange={(e) => {
                                      const regId = e.target.value;
                                      setDsRegId(regId);
                                      updateSelectedElement({ datasource: buildTableDatasource(regId, dsDisplayColumn || "", dsValueColumn || ""), datasourceType: "table" });
                                    }}
                                    className="flex-1 font-mono text-sm"
                                    placeholder="{ JSONata expression }"
                                  />
                                ) : (
                                  <Select
                                    value={dsRegId || "__none__"}
                                    onValueChange={(value) => {
                                      const regId = value === "__none__" ? "" : value || "";
                                      setDsRegId(regId);
                                      setDsDisplayColumn("");
                                      setDsValueColumn("");
                                      updateSelectedElement({ datasource: buildTableDatasource(regId, "", ""), datasourceType: "table" });
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Choose table (registration)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">None</SelectItem>
                                      {registrations.map((r) => (
                                        <SelectItem key={r.id} value={r.id}>{r.tableName || r.id}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleOpenJsonataBuilder("dsRegId", dsRegId)}
                                  title="Open JSONata Expression Builder"
                                >
                                  <Braces className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Display Column</Label>
                              <div className="flex gap-2">
                                {isJsonataExpression(dsDisplayColumn) ? (
                                  <Input
                                    value={dsDisplayColumn}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setDsDisplayColumn(val);
                                      updateSelectedElement({ datasource: buildTableDatasource(dsRegId || "", val, dsValueColumn || "") });
                                    }}
                                    className="flex-1 font-mono text-sm"
                                    placeholder="{ JSONata expression }"
                                  />
                                ) : (
                                  <Select
                                    value={dsDisplayColumn || "__none__"}
                                    onValueChange={(value) => {
                                      const val = value === "__none__" ? "" : value || "";
                                      setDsDisplayColumn(val);
                                      updateSelectedElement({ datasource: buildTableDatasource(dsRegId || "", val, dsValueColumn || "") });
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Choose display column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">None</SelectItem>
                                      {(selectedSchema?.columns || []).map((col) => (
                                        <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleOpenJsonataBuilder("dsDisplayCol", dsDisplayColumn)}
                                  title="Open JSONata Expression Builder"
                                >
                                  <Braces className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Value Column</Label>
                              <div className="flex gap-2">
                                {isJsonataExpression(dsValueColumn) ? (
                                  <Input
                                    value={dsValueColumn}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setDsValueColumn(val);
                                      updateSelectedElement({ datasource: buildTableDatasource(dsRegId || "", dsDisplayColumn || "", val) });
                                    }}
                                    className="flex-1 font-mono text-sm"
                                    placeholder="{ JSONata expression }"
                                  />
                                ) : (
                                  <Select
                                    value={dsValueColumn || "__none__"}
                                    onValueChange={(value) => {
                                      const val = value === "__none__" ? "" : value || "";
                                      setDsValueColumn(val);
                                      updateSelectedElement({ datasource: buildTableDatasource(dsRegId || "", dsDisplayColumn || "", val) });
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Choose value column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">None</SelectItem>
                                      {(selectedSchema?.columns || []).map((col) => (
                                        <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleOpenJsonataBuilder("dsValueCol", dsValueColumn)}
                                  title="Open JSONata Expression Builder"
                                >
                                  <Braces className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <Label>Datasource (name|value pairs)</Label>
                            <div className="flex gap-2">
                              <Input
                                value={selectedElement.datasource || ""}
                                onChange={(e) => updateSelectedElement({ datasource: e.target.value })}
                                placeholder="Example: Red|1|Blue|2"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleOpenJsonataBuilder("datasource", selectedElement.datasource || "")}
                                title="Open JSONata Expression Builder"
                              >
                                <Braces className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {selectedElement.displayType === "dropdown" && (
                  <>
                    <div className="space-y-2">
                      <Label>Datasource Type</Label>
                      <Select
                        value={selectedElement.datasourceType || "hardcoded"}
                        onValueChange={(value) => updateSelectedElement({ datasourceType: value as "hardcoded" | "table" })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hardcoded">hardcoded</SelectItem>
                          <SelectItem value="table">table</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedElement.datasourceType === "table" ? (
                      <>
                        <div className="space-y-2">
                          <Label>Table (registration)</Label>
                          <div className="flex gap-2">
                            {isJsonataExpression(dsRegId) ? (
                              <Input
                                value={dsRegId}
                                onChange={(e) => {
                                  const regId = e.target.value;
                                  setDsRegId(regId);
                                  updateSelectedElement({ datasource: buildTableDatasource(regId, dsDisplayColumn || "", dsValueColumn || ""), datasourceType: "table" });
                                }}
                                className="flex-1 font-mono text-sm"
                                placeholder="{ JSONata expression }"
                              />
                            ) : (
                              <Select
                                value={dsRegId || "__none__"}
                                onValueChange={(value) => {
                                  const regId = value === "__none__" ? "" : value || "";
                                  setDsRegId(regId);
                                  setDsDisplayColumn("");
                                  setDsValueColumn("");
                                  updateSelectedElement({ datasource: buildTableDatasource(regId, "", ""), datasourceType: "table" });
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Choose table (registration)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">None</SelectItem>
                                  {registrations.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>{r.tableName || r.id}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleOpenJsonataBuilder("dsRegId", dsRegId)}
                              title="Open JSONata Expression Builder"
                            >
                              <Braces className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Display Column</Label>
                          <div className="flex gap-2">
                            {isJsonataExpression(dsDisplayColumn) ? (
                              <Input
                                value={dsDisplayColumn}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDsDisplayColumn(val);
                                  updateSelectedElement({ datasource: buildTableDatasource(dsRegId || "", val, dsValueColumn || "") });
                                }}
                                className="flex-1 font-mono text-sm"
                                placeholder="{ JSONata expression }"
                              />
                            ) : (
                              <Select
                                value={dsDisplayColumn || "__none__"}
                                onValueChange={(value) => {
                                  const val = value === "__none__" ? "" : value || "";
                                  setDsDisplayColumn(val);
                                  updateSelectedElement({ datasource: buildTableDatasource(dsRegId || "", val, dsValueColumn || "") });
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Choose display column" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">None</SelectItem>
                                  {(selectedSchema?.columns || []).map((col) => (
                                    <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleOpenJsonataBuilder("dsDisplayCol", dsDisplayColumn)}
                              title="Open JSONata Expression Builder"
                            >
                              <Braces className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Value Column</Label>
                          <div className="flex gap-2">
                            {isJsonataExpression(dsValueColumn) ? (
                              <Input
                                value={dsValueColumn}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDsValueColumn(val);
                                  updateSelectedElement({ datasource: buildTableDatasource(dsRegId || "", dsDisplayColumn || "", val) });
                                }}
                                className="flex-1 font-mono text-sm"
                                placeholder="{ JSONata expression }"
                              />
                            ) : (
                              <Select
                                value={dsValueColumn || "__none__"}
                                onValueChange={(value) => {
                                  const val = value === "__none__" ? "" : value || "";
                                  setDsValueColumn(val);
                                  updateSelectedElement({ datasource: buildTableDatasource(dsRegId || "", dsDisplayColumn || "", val) });
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Choose value column" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">None</SelectItem>
                                  {(selectedSchema?.columns || []).map((col) => (
                                    <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleOpenJsonataBuilder("dsValueCol", dsValueColumn)}
                              title="Open JSONata Expression Builder"
                            >
                              <Braces className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Label>Datasource</Label>
                        <div className="flex gap-2">
                          <Input
                            value={selectedElement.datasource || ""}
                            onChange={(e) => updateSelectedElement({ datasource: e.target.value })}
                            placeholder="hardcoded: choice 1|choice 2 or table: <registrationId>|<displayColumn>|<valueColumn>"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleOpenJsonataBuilder("datasource", selectedElement.datasource || "")}
                            title="Open JSONata Expression Builder"
                          >
                            <Braces className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selectedElement.displayType === "button" && (
                  <>
                    <div className="space-y-2">
                      <Label>Action</Label>
                      <Select
                        value={selectedElement.action || "save"}
                        onValueChange={(value) => updateSelectedElement({ action: value as "link" | "save" | "delete" })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="link">link</SelectItem>
                          <SelectItem value="save">save</SelectItem>
                          <SelectItem value="delete">delete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Action Target</Label>
                      <Input
                        value={selectedElement.datasource || ""}
                        onChange={(e) => updateSelectedElement({ datasource: e.target.value })}
                        placeholder="Optional URL or metadata"
                      />
                    </div>
                  </>
                )}

                <Button variant="destructive" onClick={handleRemoveElement}>Remove Element</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* JSONata Expression Builder Dialog */}
      {schema && (
        <JsonataBuilder
          open={jsonataBuilderOpen}
          onOpenChange={setJsonataBuilderOpen}
          columns={schema.columns}
          initialExpression={jsonataInitialExpression}
          onSave={handleSaveJsonataExpression}
          currentData={workingRecord?.layout.layout.reduce((acc, el) => {
            acc[el.column] = el.value;
            return acc;
          }, {} as Record<string, any>)}
        />
      )}
    </div>
  );
}
