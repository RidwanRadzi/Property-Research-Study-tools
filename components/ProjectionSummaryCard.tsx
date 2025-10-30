import React from 'react';
import Spinner from './ui/Spinner';

interface ProjectionSummaryCardProps {
  summary: string | null;
  isLoading: boolean;
  error: string | null;
}

const ProjectionSummaryCard: React.FC<ProjectionSummaryCardProps> = ({ summary, isLoading, error }) => {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Spinner />
          <span>Generating summary...</span>
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-xs text-red-600">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      );
    }
    if (summary) {
      return (
        <p className="text-xs text-gray-700">{summary}</p>
      );
    }
    return null;
  };

  return (
    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md min-h-[50px]">
      <h4 className="font-bold text-xs text-blue-800 mb-1">AI Summary</h4>
      {renderContent()}
    </div>
  );
};

export default ProjectionSummaryCard;
