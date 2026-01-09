import { useMemo, useCallback, useState } from 'react';
import {
  WorkflowTask,
  WorkflowAlert,
  SystemHealth,
  UserWorkflowStats,
  PriorityMatrix,
  DailyWorkflowSummary,
  mockWorkflowTasks,
  mockWorkflowAlerts,
  mockSystemHealth,
  mockUserWorkflowStats,
  generatePriorityMatrix,
  getTodayWorkflowSummary,
  getActionRequiredTasks,
  getCriticalAlerts,
  getTasksByPriority,
  getTasksByCategory,
} from '../data/mockWorkflowData';

export interface UseWorkflowDataReturn {
  // Data
  tasks: WorkflowTask[];
  alerts: WorkflowAlert[];
  systemHealth: SystemHealth;
  userStats: UserWorkflowStats;
  priorityMatrix: PriorityMatrix;
  todaySummary: DailyWorkflowSummary;

  // Filtered data
  actionRequiredTasks: WorkflowTask[];
  criticalAlerts: WorkflowAlert[];
  urgentTasks: WorkflowTask[];

  // Actions
  dismissAlert: (alertId: string) => void;
  executeTaskAction: (taskId: string, action: string) => void;
  executeAlertAction: (alert: WorkflowAlert) => void;

  // Utilities
  getPriorityColor: (priority: WorkflowTask['priority']) => string;
  getCategoryIcon: (category: WorkflowTask['category']) => string;
  getHealthTrendIcon: (trend: 'up' | 'down' | 'stable') => string;
  getTasksByPriority: (priority: WorkflowTask['priority']) => WorkflowTask[];
  getTasksByCategory: (category: WorkflowTask['category']) => WorkflowTask[];
}

/**
 * Custom hook for managing workflow-related data and actions
 * Provides centralized state management for workflow dashboard
 */
export const useWorkflowData = (): UseWorkflowDataReturn => {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [_taskActions, _setTaskActions] = useState<Record<string, string>>({});

  // Computed data with memoization for performance
  const tasks = useMemo(() => mockWorkflowTasks, []);
  const alerts = useMemo(
    () =>
      mockWorkflowAlerts.filter(alert => !dismissedAlerts.includes(alert.id)),
    [dismissedAlerts]
  );
  const systemHealth = useMemo(() => mockSystemHealth, []);
  const userStats = useMemo(() => mockUserWorkflowStats, []);
  const priorityMatrix = useMemo(() => generatePriorityMatrix(), []);
  const todaySummary = useMemo(() => getTodayWorkflowSummary(), []);

  // Filtered data
  const actionRequiredTasks = useMemo(() => getActionRequiredTasks(), []);
  const criticalAlerts = useMemo(
    () =>
      getCriticalAlerts().filter(alert => !dismissedAlerts.includes(alert.id)),
    [dismissedAlerts]
  );
  const urgentTasks = useMemo(() => getTasksByPriority('urgent'), []);

  // Action handlers
  const dismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  }, []);

  const executeTaskAction = useCallback((taskId: string, action: string) => {
    setTaskActions(prev => ({ ...prev, [taskId]: action }));
    // In real environment, this would trigger API calls
    // Example: await taskAPI.executeAction(taskId, action);
  }, []);

  const executeAlertAction = useCallback((alert: WorkflowAlert) => {
    if (alert.actionButton) {
      // In real environment, this would trigger the appropriate action
      // Example: await alertAPI.executeAction(alert.id, alert.actionButton.action);
    }
  }, []);

  // Utility functions
  const getPriorityColor = useCallback(
    (priority: WorkflowTask['priority']): string => {
      switch (priority) {
        case 'urgent':
          return '#ff4d4f';
        case 'high':
          return '#fa8c16';
        case 'medium':
          return '#1890ff';
        case 'low':
          return '#52c41a';
        default:
          return '#d9d9d9';
      }
    },
    []
  );

  const getCategoryIcon = useCallback(
    (category: WorkflowTask['category']): string => {
      switch (category) {
        case 'deployment':
          return 'rocket';
        case 'security':
          return 'shield';
        case 'maintenance':
          return 'tool';
        case 'monitoring':
          return 'monitor';
        default:
          return 'clock-circle';
      }
    },
    []
  );

  const getHealthTrendIcon = useCallback(
    (trend: 'up' | 'down' | 'stable'): string => {
      switch (trend) {
        case 'up':
          return 'arrow-up';
        case 'down':
          return 'arrow-down';
        case 'stable':
          return 'minus';
        default:
          return 'minus';
      }
    },
    []
  );

  const getTasksByPriorityMemo = useCallback(
    (priority: WorkflowTask['priority']) => getTasksByPriority(priority),
    []
  );

  const getTasksByCategoryMemo = useCallback(
    (category: WorkflowTask['category']) => getTasksByCategory(category),
    []
  );

  return {
    // Data
    tasks,
    alerts,
    systemHealth,
    userStats,
    priorityMatrix,
    todaySummary,

    // Filtered data
    actionRequiredTasks,
    criticalAlerts,
    urgentTasks,

    // Actions
    dismissAlert,
    executeTaskAction,
    executeAlertAction,

    // Utilities
    getPriorityColor,
    getCategoryIcon,
    getHealthTrendIcon,
    getTasksByPriority: getTasksByPriorityMemo,
    getTasksByCategory: getTasksByCategoryMemo,
  };
};
