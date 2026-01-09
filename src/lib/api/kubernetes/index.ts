// Barrel export for Kubernetes API modules
// This file centralizes all Kubernetes API exports for clean imports

// Types - export first for TypeScript resolution
// Re-export for backward compatibility (temporary during migration)
import * as cluster from './cluster';
import * as node from './node';
import * as pod from './pod';
import * as infra from './infra';
import * as permissions from './permissions';

export * from './types';

// Cluster operations - installation, configuration, management
export * from './cluster';

// Node operations - status, lifecycle management
export * from './node';

// Pod operations - deployment, monitoring, lifecycle
export * from './pod';

// Infrastructure operations - CRUD, server management
export * from './infra';

// Permissions operations - user access control
export * from './permissions';

export const kubernetes = {
  cluster,
  node,
  pod,
  infra,
  permissions,
};
