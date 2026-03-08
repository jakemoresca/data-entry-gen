import jsonata from "jsonata";
import type { ColumnInfo, DataRow } from "./types";

/**
 * Generates sample data for JSONata expression testing based on column definitions
 * @param columns - Array of column information
 * @returns Sample data object with values based on column types
 */
export function generateSampleData(columns: ColumnInfo[]): DataRow {
  const sampleData: DataRow = {};
  
  for (const column of columns) {
    const dataType = column.dataType.toLowerCase();
    
    // Handle different data types
    if (dataType.includes("uuid") || dataType.includes("guid")) {
      sampleData[column.name] = "11111111-1111-1111-1111-111111111111";
    } else if (dataType.includes("int") || dataType.includes("serial") || dataType.includes("bigint")) {
      sampleData[column.name] = 0;
    } else if (dataType.includes("decimal") || dataType.includes("numeric") || dataType.includes("float") || dataType.includes("double") || dataType.includes("money")) {
      sampleData[column.name] = 0.0;
    } else if (dataType.includes("bool")) {
      sampleData[column.name] = false;
    } else if (dataType.includes("date") || dataType.includes("time")) {
      sampleData[column.name] = "2024-01-01T00:00:00Z";
    } else if (dataType.includes("json")) {
      sampleData[column.name] = { key: "value" };
    } else if (dataType.includes("char") || dataType.includes("text") || dataType.includes("varchar")) {
      sampleData[column.name] = "string";
    } else {
      // Default to string for unknown types
      sampleData[column.name] = "string";
    }
  }
  
  return sampleData;
}

/**
 * Checks if a string value is a JSONata expression
 * @param value - String to check
 * @returns True if the value is wrapped in curly braces indicating a JSONata expression
 */
export function isJsonataExpression(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") {
    return false;
  }
  
  const trimmed = value.trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}") && trimmed.length > 2;
}

/**
 * Extracts the JSONata expression from the wrapped format
 * @param value - Wrapped expression string (e.g., "{ expression }")
 * @returns The unwrapped expression
 */
export function extractJsonataExpression(value: string): string {
  if (!isJsonataExpression(value)) {
    return value;
  }
  
  const trimmed = value.trim();
  return trimmed.substring(1, trimmed.length - 1).trim();
}

/**
 * Wraps a JSONata expression in the required format
 * @param expr - The JSONata expression to wrap
 * @returns The wrapped expression (e.g., "{ expression }")
 */
export function wrapJsonataExpression(expr: string): string {
  const trimmed = expr.trim();
  
  // Don't double-wrap
  if (isJsonataExpression(trimmed)) {
    return trimmed;
  }
  
  return `{ ${trimmed} }`;
}

/**
 * Evaluates a JSONata expression with the given data context
 * @param expression - The JSONata expression to evaluate (without wrapping braces)
 * @param data - The data context for evaluation
 * @returns The evaluation result or an error object
 */
export async function evaluateJsonata(
  expression: string,
  data: any
): Promise<{ success: true; result: any } | { success: false; error: string }> {
  try {
    if (!expression || expression.trim() === "") {
      return { success: false, error: "Expression is empty" };
    }
    
    const compiled = jsonata(expression);
    const result = await compiled.evaluate(data);
    
    return { success: true, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Synchronous version of evaluateJsonata for simple use cases
 * @param expression - The JSONata expression to evaluate (without wrapping braces)
 * @param data - The data context for evaluation
 * @returns The evaluation result or undefined on error
 */
export function evaluateJsonataSync(expression: string, data: any): any {
  try {
    if (!expression || expression.trim() === "") {
      return undefined;
    }
    
    const compiled = jsonata(expression);
    const res = compiled.evaluate(data);
    // If evaluation returns a Promise (thenable), avoid returning the Promise
    if (res && typeof (res as any).then === "function") {
      // As we can't await here synchronously, log and return undefined to avoid [object Promise]
      console.warn("JSONata expression returned a Promise; consider using async evaluateJsonata.");
      (res as Promise<any>).catch((err) => console.error("JSONata async evaluation error:", err));
      return undefined;
    }
    return res;
  } catch (error) {
    console.error("JSONata evaluation error:", error);
    return undefined;
  }
}

/**
 * Compiles and caches JSONata expressions for better performance
 */
export class JsonataCache {
  private cache: Map<string, ReturnType<typeof jsonata>> = new Map();
  
  /**
   * Gets a compiled JSONata expression from cache or compiles it
   * @param expression - The JSONata expression to compile
   * @returns Compiled JSONata expression
   */
  getCompiled(expression: string): ReturnType<typeof jsonata> {
    if (this.cache.has(expression)) {
      return this.cache.get(expression)!;
    }
    
    const compiled = jsonata(expression);
    this.cache.set(expression, compiled);
    return compiled;
  }
  
  /**
   * Evaluates a JSONata expression using the cache
   * @param expression - The JSONata expression to evaluate (without wrapping braces)
   * @param data - The data context for evaluation
   * @returns The evaluation result or undefined on error
   */
  evaluate(expression: string, data: any): any {
    try {
      if (!expression || expression.trim() === "") {
        return undefined;
      }
      
      const compiled = this.getCompiled(expression);
      const res = compiled.evaluate(data);
      if (res && typeof (res as any).then === "function") {
        console.warn("JSONata expression returned a Promise; returning undefined to avoid Promise leakage.");
        (res as Promise<any>).catch((err) => console.error("JSONata async evaluation error:", err));
        return undefined;
      }
      return res;
    } catch (error) {
      console.error("JSONata evaluation error:", error);
      return undefined;
    }
  }
  
  /**
   * Clears the cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Gets the current cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Global cache instance for convenience
export const jsonataCache = new JsonataCache();
