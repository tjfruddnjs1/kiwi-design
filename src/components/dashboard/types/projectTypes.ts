import {
  Project,
  ProjectPipeline,
  PipelineStage,
  ProjectSecuritySummary,
  ProjectInfrastructure,
  SASTReport,
  DASTReport,
} from '../../../data/mockProjects';

export interface ProjectComponentProps {
  project: Project;
  onClick?: () => void;
}

export interface PipelineFlowProps {
  project: Project;
  onStageClick?: (stage: PipelineStage) => void;
}

export interface SecurityVulnerabilitiesProps {
  project: Project;
  onViewDetails?: () => void;
}

export interface HealthStatusProps {
  project: Project;
}

export interface InfrastructureStatusProps {
  project: Project;
  onViewDetails?: () => void;
}

export interface EnhancedProjectListProps {
  selectedProjectId?: string;
  onProjectSelect: (projectId: string) => void;
  onQuickActionsSelect?: (projectId: string) => void;
  onAreaClick?: (
    projectId: string,
    area:
      | 'project-info'
      | 'pipeline-quick-actions'
      | 'security-vulnerabilities'
      | 'infrastructure-hub'
      | 'integrated-dashboard'
  ) => void;
}

export {
  Project,
  ProjectPipeline,
  PipelineStage,
  ProjectSecuritySummary,
  ProjectInfrastructure,
  SASTReport,
  DASTReport,
};
