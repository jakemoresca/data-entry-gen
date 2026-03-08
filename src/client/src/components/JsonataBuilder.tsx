"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import type { ColumnInfo, DataRow } from "@/lib/types";
import { evaluateJsonata, extractJsonataExpression, generateSampleData, wrapJsonataExpression } from "@/lib/jsonata-utils";

interface JsonataBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnInfo[];
  initialExpression: string;
  onSave: (expression: string) => void;
  currentData?: DataRow;
  title?: string;
  description?: string;
}

interface FunctionCategory {
  name: string;
  functions: { name: string; description: string; example: string }[];
}

const JSONATA_FUNCTIONS: FunctionCategory[] = [
  {
    name: "String",
    functions: [
      { name: "$string()", description: "Convert to string", example: "$string(123)" },
      { name: "$length()", description: "String length", example: "$length('hello')" },
      { name: "$substring()", description: "Extract substring", example: "$substring('hello', 0, 2)" },
      { name: "$substringBefore()", description: "Get text before delimiter", example: "$substringBefore('hello-world', '-')" },
      { name: "$substringAfter()", description: "Get text after delimiter", example: "$substringAfter('hello-world', '-')" },
      { name: "$uppercase()", description: "Convert to uppercase", example: "$uppercase('hello')" },
      { name: "$lowercase()", description: "Convert to lowercase", example: "$lowercase('HELLO')" },
      { name: "$trim()", description: "Remove whitespace", example: "$trim('  hello  ')" },
      { name: "$contains()", description: "Check if contains text", example: "$contains('hello', 'ell')" },
      { name: "$split()", description: "Split string", example: "$split('a,b,c', ',')" },
      { name: "$join()", description: "Join array", example: "$join(['a','b','c'], ',')" },
      { name: "$replace()", description: "Replace text", example: "$replace('hello', 'l', 'x')" },
      { name: "&", description: "Concatenate strings", example: "'hello' & ' ' & 'world'" },
    ],
  },
  {
    name: "Numeric",
    functions: [
      { name: "$number()", description: "Convert to number", example: "$number('123')" },
      { name: "$abs()", description: "Absolute value", example: "$abs(-5)" },
      { name: "$floor()", description: "Round down", example: "$floor(3.7)" },
      { name: "$ceil()", description: "Round up", example: "$ceil(3.2)" },
      { name: "$round()", description: "Round to precision", example: "$round(3.14159, 2)" },
      { name: "$power()", description: "Power", example: "$power(2, 3)" },
      { name: "$sqrt()", description: "Square root", example: "$sqrt(16)" },
      { name: "$random()", description: "Random number 0-1", example: "$random()" },
      { name: "$sum()", description: "Sum array", example: "$sum([1,2,3])" },
      { name: "$max()", description: "Maximum value", example: "$max([1,5,3])" },
      { name: "$min()", description: "Minimum value", example: "$min([1,5,3])" },
      { name: "$average()", description: "Average of array", example: "$average([1,2,3])" },
      { name: "+, -, *, /, %", description: "Arithmetic operators", example: "(10 + 5) * 2" },
    ],
  },
  {
    name: "Boolean",
    functions: [
      { name: "$boolean()", description: "Convert to boolean", example: "$boolean(1)" },
      { name: "$not()", description: "Logical NOT", example: "$not(false)" },
      { name: "$exists()", description: "Check if exists", example: "$exists(field)" },
      { name: "=, !=", description: "Equality", example: "field = 'value'" },
      { name: "<, <=, >, >=", description: "Comparison", example: "count > 10" },
      { name: "and, or", description: "Logical operators", example: "a > 5 and b < 10" },
      { name: "? :", description: "Ternary operator", example: "count > 5 ? 'high' : 'low'" },
    ],
  },
  {
    name: "Array",
    functions: [
      { name: "$count()", description: "Array length", example: "$count([1,2,3])" },
      { name: "$append()", description: "Add to array", example: "$append([1,2], 3)" },
      { name: "$sort()", description: "Sort array", example: "$sort([3,1,2])" },
      { name: "$reverse()", description: "Reverse array", example: "$reverse([1,2,3])" },
      { name: "$shuffle()", description: "Shuffle array", example: "$shuffle([1,2,3])" },
      { name: "$distinct()", description: "Unique values", example: "$distinct([1,2,2,3])" },
      { name: "[]", description: "Array filter/map", example: "items[price > 10]" },
      { name: "$map()", description: "Transform array", example: "$map(items, function($v){$v*2})" },
      { name: "$filter()", description: "Filter array", example: "$filter(items, function($v){$v>5})" },
      { name: "$reduce()", description: "Reduce array", example: "$reduce(items, function($acc,$v){$acc+$v}, 0)" },
    ],
  },
  {
    name: "Object",
    functions: [
      { name: "$keys()", description: "Object keys", example: "$keys({'a':1,'b':2})" },
      { name: "$lookup()", description: "Get property value", example: "$lookup(obj, 'key')" },
      { name: "$spread()", description: "Merge objects", example: "$spread([{a:1},{b:2}])" },
      { name: "$merge()", description: "Merge arrays of objects", example: "$merge([{a:1},{a:2}])" },
      { name: "$each()", description: "Iterate object", example: "$each(obj, function($v,$k){$k&':'&$v})" },
      { name: ".", description: "Property access", example: "object.property" },
      { name: "{ }", description: "Object constructor", example: "{'name': value, 'count': 5}" },
    ],
  },
  {
    name: "Date/Time",
    functions: [
      { name: "$now()", description: "Current timestamp", example: "$now()" },
      { name: "$millis()", description: "Timestamp to milliseconds", example: "$millis()" },
      { name: "$fromMillis()", description: "Milliseconds to timestamp", example: "$fromMillis(1234567890000)" },
      { name: "$toMillis()", description: "ISO string to milliseconds", example: "$toMillis('2024-01-01T00:00:00Z')" },
    ],
  },
  {
    name: "Aggregation",
    functions: [
      { name: "$sum()", description: "Sum values", example: "$sum(items.price)" },
      { name: "$average()", description: "Average values", example: "$average(items.quantity)" },
      { name: "$min()", description: "Minimum value", example: "$min(items.price)" },
      { name: "$max()", description: "Maximum value", example: "$max(items.price)" },
      { name: "$count()", description: "Count items", example: "$count(items)" },
    ],
  },
];

export function JsonataBuilder({
  open,
  onOpenChange,
  columns,
  initialExpression,
  onSave,
  currentData,
  title = "JSONata Expression Builder",
  description = "Create dynamic expressions using JSONata syntax",
}: JsonataBuilderProps) {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["String", "Numeric"]));
  const [searchTerm, setSearchTerm] = useState("");
  
  const sampleData = currentData || generateSampleData(columns);

  // Initialize expression when dialog opens
  useEffect(() => {
    if (open) {
      const extracted = extractJsonataExpression(initialExpression);
      setExpression(extracted);
      setError(null);
      setSearchTerm("");
    }
  }, [open, initialExpression]);

  // Evaluate expression whenever it changes
  useEffect(() => {
    if (!expression.trim()) {
      setResult(null);
      setError(null);
      return;
    }

    const evaluate = async () => {
      setIsEvaluating(true);
      const evalResult = await evaluateJsonata(expression, sampleData);
      setIsEvaluating(false);

      if (evalResult.success) {
        setResult(evalResult.result);
        setError(null);
      } else {
        setResult(null);
        setError(evalResult.error);
      }
    };

    const timer = setTimeout(evaluate, 300); // Debounce evaluation
    return () => clearTimeout(timer);
  }, [expression, sampleData]);

  const handleSave = () => {
    if (error) {
      return;
    }

    const wrapped = wrapJsonataExpression(expression);
    onSave(wrapped);
    onOpenChange(false);
  };

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const insertFunction = (example: string) => {
    setExpression((prev) => {
      if (!prev) return example;
      return prev + " " + example;
    });
  };

  const filteredFunctions = JSONATA_FUNCTIONS.map((category) => ({
    ...category,
    functions: category.functions.filter(
      (fn) =>
        !searchTerm ||
        fn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fn.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((category) => category.functions.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none lg:max-w-lg max-w-[900px] w-[98vw] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
          {/* Left Pane: Functions Reference */}
          <div className="w-[200px] flex flex-col border-r pr-4">
            <div className="mb-3">
              <Input
                placeholder="Search functions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredFunctions.map((category) => (
                <div key={category.name}>
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="flex items-center w-full px-2 py-1.5 text-sm font-medium hover:bg-accent rounded-md"
                  >
                    {expandedCategories.has(category.name) ? (
                      <ChevronDown className="h-3 w-3 mr-1" />
                    ) : (
                      <ChevronRight className="h-3 w-3 mr-1" />
                    )}
                    {category.name}
                  </button>
                  {expandedCategories.has(category.name) && (
                    <div className="ml-4 space-y-0.5 mt-1">
                      {category.functions.map((fn) => (
                        <button
                          key={fn.name}
                          onClick={() => insertFunction(fn.example)}
                          className="block w-full text-left px-2 py-1 text-xs hover:bg-accent rounded-sm"
                          title={fn.description}
                        >
                          <div className="font-mono text-primary">{fn.name}</div>
                          <div className="text-muted-foreground text-[10px] leading-tight">
                            {fn.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Middle and Right Panes */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Sample Data Section */}
            <div className="flex-shrink-0">
              <Label className="text-sm font-semibold mb-2 block">Sample Data</Label>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[120px] font-mono">
                {JSON.stringify(sampleData, null, 2)}
              </pre>
            </div>

            {/* Expression Editor and Result (row-aligned) */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Expression above Result (stacked) */}
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                <div className="flex flex-col">
                  <Label className="text-sm font-semibold mb-2">Expression</Label>
                  <textarea
                    id="expression"
                    value={expression}
                    onChange={(e) => setExpression(e.target.value)}
                    wrap="off"
                    className="h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y overflow-auto whitespace-pre focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Enter JSONata expression..."
                  />
                  {error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{error}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex flex-col">
                  <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                    Result
                    {isEvaluating && <Loader2 className="h-3 w-3 animate-spin" />}
                    {!isEvaluating && !error && result !== null && <Check className="h-3 w-3 text-green-600" />}
                  </Label>
                  <pre className="h-[100px] text-xs bg-muted p-3 rounded-md overflow-auto font-mono whitespace-pre">
                    {result !== null && result !== undefined
                      ? typeof result === "object"
                        ? JSON.stringify(result, null, 2)
                        : String(result)
                      : error
                      ? ""
                      : "Result will appear here..."}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!!error || !expression.trim()}>
            Save Expression
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
