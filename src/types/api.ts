// Enhanced API and error types for K8scontrol frontend

// Generic API Error interface
export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
  response?: {
    data?: {
      error?: string;
      message?: string;
      details?: Record<string, unknown>;
    };
    status?: number;
  };
}

// Generic API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
  status?: number;
}

// Form validation error interface
export interface FormValidationError {
  errorFields?: Array<{
    name: string[];
    errors: string[];
  }>;
  outOfDate?: boolean;
  values?: Record<string, unknown>;
}

// Infrastructure related API types
export interface InfrastructureApiData {
  servers?: Array<{
    id: string;
    name: string;
    ip: string;
    port: number;
    status: string;
    type?: string;
    hops?: string;
  }>;
  nodes?: Array<{
    id: string;
    nodeType: string;
    ip: string;
    port: string;
    server_name?: string;
    status: string;
    hops: string;
  }>;
}

// Kubernetes API response types
export interface KubernetesApiData {
  details?: {
    pods?: Array<{
      name: string;
      status: string;
      ready: boolean;
      restarts: number;
      age?: string;
      namespace?: string;
    }>;
    services?: Array<{
      name: string;
      type: string;
      clusterIP?: string;
      externalIP?: string;
      ports?: string;
    }>;
    nodes?: Array<{
      name: string;
      status: string;
      roles?: string;
      age?: string;
      version?: string;
    }>;
  };
  status?: string;
  message?: string;
}

// Service operation data
export interface ServiceOperationData {
  status: 'running' | 'stopped' | 'pending' | 'error';
  message?: string;
  logs?: string[];
  containers?: Array<{
    name: string;
    status: string;
    ready: boolean;
    restarts: number;
    image?: string;
  }>;
}

// Generic update data interface
export interface UpdateDataPayload {
  id?: number | string;
  name?: string;
  status?: string;
  type?: string;
  [key: string]: unknown;
}
