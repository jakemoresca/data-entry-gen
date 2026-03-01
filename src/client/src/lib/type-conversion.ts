import type { DataValue } from "./types";

/**
 * Convert a value from string input to the appropriate type based on dataType
 * Mirrors the ConvertValue method from TableData.razor in Blazor
 */
export function convertValue(value: string, dataType: string): DataValue {
  if (!value || value.trim() === "") {
    return null;
  }

  const normalizedType = dataType.toLowerCase();
  const trimmedValue = value.trim();

  // Integer types
  if (
    normalizedType.includes("int") ||
    normalizedType.includes("serial") ||
    normalizedType.includes("bigserial")
  ) {
    if (normalizedType.includes("bigint") || normalizedType.includes("bigserial")) {
      // For very large integers, keep as string to prevent precision loss
      return trimmedValue;
    }
    const parsed = parseInt(trimmedValue, 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid integer value: ${trimmedValue}`);
    }
    return parsed;
  }

  // Decimal/Numeric types
  if (
    normalizedType.includes("numeric") ||
    normalizedType.includes("decimal") ||
    normalizedType.includes("money")
  ) {
    const parsed = parseFloat(trimmedValue);
    if (isNaN(parsed)) {
      throw new Error(`Invalid decimal value: ${trimmedValue}`);
    }
    return parsed;
  }

  // Float types
  if (
    normalizedType.includes("real") ||
    normalizedType.includes("double") ||
    normalizedType.includes("float")
  ) {
    const parsed = parseFloat(trimmedValue);
    if (isNaN(parsed)) {
      throw new Error(`Invalid float value: ${trimmedValue}`);
    }
    return parsed;
  }

  // Boolean
  if (normalizedType.includes("bool")) {
    const lower = trimmedValue.toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes" || lower === "y") {
      return true;
    }
    if (lower === "false" || lower === "0" || lower === "no" || lower === "n") {
      return false;
    }
    throw new Error(`Invalid boolean value: ${trimmedValue}`);
  }

  // UUID
  if (normalizedType === "uuid") {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedValue)) {
      throw new Error(`Invalid UUID format: ${trimmedValue}`);
    }
    return trimmedValue;
  }

  // Date/Time types
  if (
    normalizedType.includes("timestamp") ||
    normalizedType.includes("date") ||
    normalizedType.includes("time")
  ) {
    const date = new Date(trimmedValue);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date/time value: ${trimmedValue}`);
    }
    return date.toISOString();
  }

  // JSON types
  if (normalizedType.includes("json")) {
    try {
      return JSON.parse(trimmedValue);
    } catch {
      throw new Error(`Invalid JSON value: ${trimmedValue}`);
    }
  }

  // Default to string
  return trimmedValue;
}

/**
 * Convert a value to string for display in form inputs
 */
export function valueToString(value: DataValue): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "boolean") {
    return value.toString();
  }

  if (typeof value === "number") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

/**
 * Format a date value for display
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";

  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "";

  return date.toLocaleString();
}

/**
 * Extract error message from API error response
 */
export function handleApiError(error: any): string {
  if (typeof error === "string") {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.error) {
    return error.error;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  return "An unexpected error occurred";
}
