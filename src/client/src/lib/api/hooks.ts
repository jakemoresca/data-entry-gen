import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { registrationApi, schemaApi, dataApi } from "./client";
import type { DataRow } from "../types";

/**
 * Query keys for cache management
 */
export const queryKeys = {
  registrations: ["registrations"] as const,
  tableSchema: (tableName: string) => ["tableSchema", tableName] as const,
  tableData: (tableName: string) => ["tableData", tableName] as const,
};

/**
 * Registration hooks
 */
export function useRegistrations() {
  return useQuery({
    queryKey: queryKeys.registrations,
    queryFn: registrationApi.getAll,
  });
}

export function useInitialize() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: registrationApi.initialize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations });
    },
  });
}

export function useDiscoverTables() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: registrationApi.discoverAndRegister,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations });
    },
  });
}

export function useDeleteRegistration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => registrationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations });
    },
  });
}

/**
 * Schema hooks
 */
export function useTableSchema(tableName: string) {
  return useQuery({
    queryKey: queryKeys.tableSchema(tableName),
    queryFn: () => schemaApi.getTableSchema(tableName),
    enabled: !!tableName,
  });
}

/**
 * Data CRUD hooks
 */
export function useTableData(tableName: string) {
  return useQuery({
    queryKey: queryKeys.tableData(tableName),
    queryFn: () => dataApi.getTableRows(tableName),
    enabled: !!tableName,
  });
}

export function useCreateRow(tableName: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: DataRow) => dataApi.createRow(tableName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tableData(tableName) });
    },
  });
}

export function useUpdateRow(tableName: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: DataRow) => dataApi.updateRow(tableName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tableData(tableName) });
    },
  });
}

export function useDeleteRow(tableName: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => dataApi.deleteRow(tableName, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tableData(tableName) });
    },
  });
}
