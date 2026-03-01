import { z } from "zod";

// Registration Record Schema
export const registrationRecordSchema = z.object({
  id: z.string().uuid(),
  tableName: z.string().min(1, "Table name is required"),
  description: z.string().optional(),
  idColumnName: z.string().optional(),
  settings: z.any().optional(),
  defaultData: z.any().optional(),
});

// Column Info Schema
export const columnInfoSchema = z.object({
  name: z.string().min(1, "Column name is required"),
  dataType: z.string().min(1, "Data type is required"),
  isNullable: z.boolean(),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
  foreignKeyTable: z.string().optional(),
  foreignKeyColumn: z.string().optional(),
});

// Table Info Schema
export const tableInfoSchema = z.object({
  name: z.string().min(1, "Table name is required"),
  columns: z.array(columnInfoSchema),
});

// Dynamic form field schema builder
export function buildFieldSchema(column: {
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
}): z.ZodTypeAny {
  const dataType = column.dataType.toLowerCase();
  
  let schema: z.ZodTypeAny;

  // Integer types
  if (
    dataType.includes("int") ||
    dataType.includes("serial") ||
    dataType.includes("bigserial")
  ) {
    schema = z.coerce.number().int("Must be an integer");
  }
  // Decimal/Numeric types
  else if (
    dataType.includes("numeric") ||
    dataType.includes("decimal") ||
    dataType.includes("money")
  ) {
    schema = z.coerce.number();
  }
  // Float types
  else if (
    dataType.includes("real") ||
    dataType.includes("double") ||
    dataType.includes("float")
  ) {
    schema = z.coerce.number();
  }
  // Boolean
  else if (dataType.includes("bool")) {
    schema = z.union([
      z.boolean(),
      z.string().transform((val) => {
        const lower = val.toLowerCase();
        if (lower === "true" || lower === "1" || lower === "yes" || lower === "y") {
          return true;
        }
        if (lower === "false" || lower === "0" || lower === "no" || lower === "n") {
          return false;
        }
        throw new Error("Invalid boolean value");
      }),
    ]);
  }
  // UUID
  else if (dataType === "uuid") {
    schema = z.string().uuid("Must be a valid UUID");
  }
  // Date/Time types
  else if (
    dataType.includes("timestamp") ||
    dataType.includes("date") ||
    dataType.includes("time")
  ) {
    schema = z.union([
      z.string().datetime({ offset: true }).or(z.string().date()),
      z.date(),
    ]);
  }
  // JSON types
  else if (dataType.includes("json")) {
    schema = z.union([
      z.string().transform((val) => JSON.parse(val)),
      z.any(),
    ]);
  }
  // Default to string
  else {
    schema = z.string();
  }

  // Make nullable if allowed
  if (column.isNullable && !column.isPrimaryKey) {
    schema = schema.nullable().optional();
  }

  return schema;
}

// Dynamic form schema builder
export function buildFormSchema(columns: Array<{
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
}>) {
  const shape: Record<string, z.ZodTypeAny> = {};

  columns.forEach((column) => {
    shape[column.name] = buildFieldSchema(column);
  });

  return z.object(shape);
}
