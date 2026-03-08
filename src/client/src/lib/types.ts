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

/**
 * Configuration for a layout element/field
 * 
 * JSONata Expression Support:
 * Several properties support JSONata expressions for dynamic/computed values.
 * Wrap expressions in curly braces: "{ expression }"
 * 
 * Supported properties:
 * - label: Use JSONata to compute display label (e.g., "{ column1 & ' - ' & column2 }")
 * - value: Use JSONata to compute field value or determine data source
 * - datasource: Use JSONata for dynamic datasource lookup
 *   - For datasource components, can compute registrationId|displayColumn|valueColumn
 *   - Example: "{ registrationId }|{ 'name_' & language }|id"
 * 
 * Context available to expressions:
 * - All columns from current row/form data
 * - Referenced table data (when applicable)
 * 
 * Note: Value/datasource expressions affect where data is retrieved from,
 * while label expressions only affect display text.
 */
export interface LayoutElementConfig {
  /** Database column name this element maps to */
  column: string;
  
  /** Display label for the field. Supports JSONata expressions: "{ expression }" */
  label: string;
  
  /** Default/bound value. Supports JSONata expressions: "{ expression }" */
  value: string;
  
  /** Whether the field is read-only */
  disabled: boolean;
  
  /** Width percentage for grid layout */
  columnWidth: number;
  
  /** How the field should be rendered */
  displayType: DisplayType;
  
  /** Type of data source for dropdowns and labels */
  datasourceType?: DatasourceType;
  
  /** Whether to use a datasource for label display type */
  useDatasource?: boolean;
  
  /** 
   * Data source configuration. Format depends on datasourceType:
   * - hardcoded: "Option1|value1|Option2|value2"
   * - table: "registrationId|displayColumn|valueColumn"
   * 
   * Supports JSONata expressions: "{ expression }" for dynamic datasources
   */
  datasource?: string;
  
  /** Action type for button display type */
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
