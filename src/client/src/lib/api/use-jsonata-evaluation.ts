import { useMemo } from "react";
import type { LayoutElementConfig, DataRow } from "../types";
import { isJsonataExpression, extractJsonataExpression, jsonataCache } from "../jsonata-utils";

/**
 * Hook for evaluating JSONata expressions in layout elements
 * 
 * This hook processes all JSONata expressions found in layout elements and returns  
 * the evaluated results. It's useful for computing field values dynamically based on
 * other form data or context.
 * 
 * @param elements - Array of layout element configurations
 * @param formData - Current form data/row data
 * @param rowsByRegistrationId - Map of registration IDs to their row data (for lookups)
 * @returns Evaluated data merged with form data
 */
export function useJsonataEvaluation(
  elements: LayoutElementConfig[],
  formData: DataRow,
  rowsByRegistrationId: Record<string, DataRow[]> = {}
) {
  const evaluatedData = useMemo(() => {
    // Start with the original form data
    const result: DataRow = { ...formData };
    
    // Create evaluation context with form data and referenced tables
    const context = {
      ...formData,
      $tables: rowsByRegistrationId,
    };
    
    // Process each element
    for (const element of elements) {
      try {
        // Evaluate label if it's a JSONata expression
        if (isJsonataExpression(element.label)) {
          const expression = extractJsonataExpression(element.label);
          const evaluated = jsonataCache.evaluate(expression, context);
          
          // Store evaluated label in a special property
          result[`__label_${element.column}`] = evaluated;
        }
        
        // Evaluate value if it's a JSONata expression
        // This affects what data is shown/stored for this field
        if (isJsonataExpression(element.value)) {
          const expression = extractJsonataExpression(element.value);
          const evaluated = jsonataCache.evaluate(expression, context);
          
          // Update or set the computed value
          if (element.column) {
            result[element.column] = evaluated;
          }
        }
        
        // Evaluate datasource if it's a JSONata expression
        // This is more complex as datasource can be in different formats
        if (element.datasource && isJsonataExpression(element.datasource)) {
          const expression = extractJsonataExpression(element.datasource);
          const evaluated = jsonataCache.evaluate(expression, context);
          
          // Store evaluated datasource in a special property
          result[`__datasource_${element.column}`] = evaluated;
        }
        
        // Handle datasource parts (registrationId|displayColumn|valueColumn)
        // Sometimes these individual parts can be JSONata expressions
        if (element.datasourceType === "table" && element.datasource) {
          const parts = element.datasource.split("|");
          
          if (parts.length >= 3) {
            const [regId, displayCol, valueCol] = parts;
            
            // Evaluate each part if it's a JSONata expression
            const evalRegId = isJsonataExpression(regId)
              ? jsonataCache.evaluate(extractJsonataExpression(regId), context)
              : regId;
              
            const evalDisplayCol = isJsonataExpression(displayCol)
              ? jsonataCache.evaluate(extractJsonataExpression(displayCol), context)
              : displayCol;
              
            const evalValueCol = isJsonataExpression(valueCol)
              ? jsonataCache.evaluate(extractJsonataExpression(valueCol), context)
              : valueCol;
            
            // Store evaluated datasource parts
            result[`__datasource_${element.column}`] = `${evalRegId}|${evalDisplayCol}|${evalValueCol}`;
          }
        }
      } catch (error) {
        // Log errors but don't break the entire evaluation
        console.error(`Error evaluating JSONata for element ${element.column}:`, error);
      }
    }
    
    return result;
  }, [elements, formData, rowsByRegistrationId]);
  
  return evaluatedData;
}

/**
 * Evaluates a single JSONata expression with the given context
 * 
 * @param expression - The JSONata expression to evaluate (with or without braces)
 * @param context - The data context for evaluation
 * @returns Evaluated result or undefined on error
 */
export function evaluateExpression(expression: string, context: any): any {
  if (!expression) {
    return undefined;
  }
  
  try {
    const expr = isJsonataExpression(expression)
      ? extractJsonataExpression(expression)
      : expression;
      
    return jsonataCache.evaluate(expr, context);
  } catch (error) {
    console.error("Error evaluating JSONata expression:", error);
    return undefined;
  }
}

/**
 * Evaluates datasource-related JSONata expressions
 * Returns the evaluated datasource string or parts
 * 
 * @param datasource - Datasource string (may contain JSONata expressions)
 * @param context - Evaluation context
 * @returns Evaluated datasource parts object
 */
export function evaluateDatasource(
  datasource: string | undefined,
  datasourceType: "hardcoded" | "table" | undefined,
  context: any
): {
  registrationId: string;
  displayColumn: string;
  valueColumn: string;
  datasourceString: string;
} | null {
  if (!datasource) {
    return null;
  }
  
  // If it's a hardcoded datasource and contains JSONata, evaluate it
  if (datasourceType === "hardcoded" && isJsonataExpression(datasource)) {
    const evaluated = evaluateExpression(datasource, context);
    return {
      registrationId: "",
      displayColumn: "",
      valueColumn: "",
      datasourceString: String(evaluated || ""),
    };
  }
  
  // If it's a table datasource, parse and evaluate each part
  if (datasourceType === "table") {
    const parts = datasource.split("|");
    
    if (parts.length >= 3) {
      const [regId, displayCol, valueCol] = parts;
      
      const evalRegId = isJsonataExpression(regId)
        ? String(evaluateExpression(regId, context) || "")
        : regId;
        
      const evalDisplayCol = isJsonataExpression(displayCol)
        ? String(evaluateExpression(displayCol, context) || "")
        : displayCol;
        
      const evalValueCol = isJsonataExpression(valueCol)
        ? String(evaluateExpression(valueCol, context) || "")
        : valueCol;
      
      return {
        registrationId: evalRegId,
        displayColumn: evalDisplayCol,
        valueColumn: evalValueCol,
        datasourceString: `${evalRegId}|${evalDisplayCol}|${evalValueCol}`,
      };
    }
  }
  
  // Return the datasource as-is if no evaluation needed
  return {
    registrationId: "",
    displayColumn: "",
    valueColumn: "",
    datasourceString: datasource,
  };
}
