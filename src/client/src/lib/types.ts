// Type definitions mirroring the DataEntryGen.Frontend models

export interface RegistrationRecord {
  id: string; // UUID
  tableName: string;
  description?: string;
  idColumnName?: string;
  settings?: any; // JSON
  defaultData?: any; // JSON
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
}

export type DataValue = string | number | boolean | null | undefined | any;

export type DataRow = Record<string, DataValue>;

export interface ApiError {
  error?: string;
  message?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export type LayoutType = "list" | "detail";
export type DatasourceType = "hardcoded" | "table";
export type DisplayType = "label" | "text" | "number" | "textarea" | "dropdown" | "button";
export type ButtonAction = "link" | "save" | "delete";

export interface LayoutElementConfig {
  column: string;
  label: string;
  value: string;
  disabled: boolean;
  columnWidth: number;
  displayType: DisplayType;
  datasourceType?: DatasourceType;
  datasource?: string;
  action?: ButtonAction;
}

export interface LayoutDefinition {
  title: string;
  layoutType: "table" | "form";
  layout: LayoutElementConfig[];
}

export interface LayoutRecord {
  id: string;
  name: string;
  type: LayoutType;
  registrationId: string;
  layout: LayoutDefinition;
}
