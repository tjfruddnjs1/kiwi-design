import React, { memo } from 'react';
import EnhancedPipelineFlow from './EnhancedPipelineFlow';

interface PipelineQuickActionsTabProps {
  selectedProjectId: string | null;
  onSelectProject: () => void;
}

const PipelineQuickActionsTab: React.FC<PipelineQuickActionsTabProps> = memo(
  ({ selectedProjectId, onSelectProject }) => {
    return (
      <EnhancedPipelineFlow
        selectedProjectId={selectedProjectId}
        onSelectProject={onSelectProject}
      />
    );
  }
);

PipelineQuickActionsTab.displayName = 'PipelineQuickActionsTab';

export default PipelineQuickActionsTab;
