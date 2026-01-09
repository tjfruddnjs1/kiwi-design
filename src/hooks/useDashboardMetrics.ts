import { useMemo } from 'react';
import { mockProjects, getActiveProjects } from '../data/mockProjects';

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  productionProjects: number;
  averageHealth: number;
}

export const useDashboardMetrics = (): DashboardMetrics => {
  return useMemo(() => {
    const activeProjects = getActiveProjects();
    return {
      totalProjects: mockProjects.length,
      activeProjects: activeProjects.length,
      productionProjects: mockProjects.filter(
        p => p.environment === 'production'
      ).length,
      averageHealth: Math.round(
        activeProjects.reduce((sum, p) => sum + p.healthScore, 0) /
          activeProjects.length
      ),
    };
  }, []);
};
