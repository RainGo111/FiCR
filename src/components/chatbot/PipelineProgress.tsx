import React from 'react';
import { CheckCircle2, Loader2, Circle, XCircle } from 'lucide-react';

export type StageStatus = 'pending' | 'running' | 'complete' | 'error';

export interface StageInfo {
  id: string;
  label: string;
  status: StageStatus;
  detail?: string;
}

interface PipelineProgressProps {
  stages: StageInfo[];
}

const statusIcon = (status: StageStatus) => {
  switch (status) {
    case 'complete':
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'running':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Circle className="w-5 h-5 text-neutral-300" />;
  }
};

const statusColor = (status: StageStatus) => {
  switch (status) {
    case 'complete': return 'bg-emerald-50 border-emerald-200';
    case 'running': return 'bg-blue-50 border-blue-200';
    case 'error': return 'bg-red-50 border-red-200';
    default: return 'bg-neutral-50 border-neutral-200';
  }
};

export const PipelineProgress: React.FC<PipelineProgressProps> = ({ stages }) => {
  return (
    <div className="flex flex-col gap-2">
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex items-center gap-3">
          {/* Connector line */}
          <div className="flex flex-col items-center">
            {statusIcon(stage.status)}
            {i < stages.length - 1 && (
              <div className={`w-0.5 h-4 mt-1 ${
                stage.status === 'complete' ? 'bg-emerald-300' : 'bg-neutral-200'
              }`} />
            )}
          </div>
          {/* Stage card */}
          <div className={`flex-1 px-3 py-2 rounded-lg border text-sm ${statusColor(stage.status)}`}>
            <span className="font-medium text-neutral-800">{stage.label}</span>
            {stage.detail && (
              <span className="ml-2 text-neutral-500">{stage.detail}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
