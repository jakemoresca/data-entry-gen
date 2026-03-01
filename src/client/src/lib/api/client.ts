import type {
  RegistrationRecord,
  TableInfo,
  DataRow,
  ApiError,
} from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://localhost:5001";

/**
 * Base API client with error handling
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      }
      return {} as T;
    }

    // Handle error
    let errorMessage = `Request failed with status ${response.status}`;
    
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData: ApiError = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else {
        const text = await response.text();
        if (text) {
          errorMessage = text;
        }
      }
    } catch {
      // Use default error message
    }

    throw new Error(errorMessage);
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(path: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${path}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return this.handleResponse<T>(response);
  }
}

const apiClient = new ApiClient(API_BASE_URL);

/**
 * Registration API methods
 */
export const registrationApi = {
  getAll: () => apiClient.get<RegistrationRecord[]>("api/registration"),
  
  initialize: () => apiClient.post<void>("api/registration/initialize"),
  
  discoverAndRegister: () =>
    apiClient.post<RegistrationRecord[]>("api/registration/discover"),
  
  delete: (id: string) => apiClient.delete<void>(`api/registration/${id}`),
};

/**
 * Schema API methods
 */
export const schemaApi = {
  getTableSchema: (tableName: string) =>
    apiClient.get<TableInfo>(`api/schema/tables/${tableName}`),
};

/**
 * Data API methods
 */
export const dataApi = {
  getTableRows: (tableName: string) =>
    apiClient.get<DataRow[]>(`api/data/${tableName}`),
  
  createRow: (tableName: string, data: DataRow) =>
    apiClient.post<void>(`api/data/${tableName}`, data),
  
  updateRow: (tableName: string, data: DataRow) =>
    apiClient.put<void>(`api/data/${tableName}`, data),
  
  deleteRow: (tableName: string, id: string) =>
    apiClient.delete<void>(`api/data/${tableName}/${encodeURIComponent(id)}`),
};
