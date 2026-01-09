// Table column types for Antd components
import { ColumnType } from 'antd/es/table';
import { ReactNode } from 'react';

// Generic table row interface
export interface TableRowData {
  key: string | number;
  [key: string]: unknown;
}

// Pod table row interface
export interface PodTableRow extends TableRowData {
  name: string;
  status: string;
  ready: boolean;
  restarts: number;
  age?: string;
  namespace?: string;
}

// Node table row interface
export interface NodeTableRow extends TableRowData {
  id: string;
  nodeType: string;
  ip: string;
  port: string;
  server_name?: string;
  status: string;
  hops: string;
  updated_at?: string;
  ha?: string;
}

// Server table row interface
export interface ServerTableRow extends TableRowData {
  id: string;
  name: string;
  ip: string;
  port: number;
  status: string;
  type?: string;
}

// Service table row interface
export interface ServiceTableRow extends TableRowData {
  id: number;
  name: string;
  type: string;
  namespace?: string;
  status: 'running' | 'stopped' | 'pending' | 'error';
  image?: string;
  port?: number;
  infra_id?: number;
  created_at?: string;
}

// Generic table column type with proper typing
export type TableColumn<T = TableRowData> = ColumnType<T> & {
  render?: (value: unknown, record: T, index: number) => ReactNode;
};

// Typed column arrays
export type PodTableColumns = TableColumn<PodTableRow>[];
export type NodeTableColumns = TableColumn<NodeTableRow>[];
export type ServerTableColumns = TableColumn<ServerTableRow>[];
export type ServiceTableColumns = TableColumn<ServiceTableRow>[];
