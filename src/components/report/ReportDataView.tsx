import React from 'react';
import { BuildingOverview } from './BuildingOverview';
import { SpatialInventory } from './SpatialInventory';
import { ElementInventory } from './ElementInventory';
import { ComplianceSection } from './ComplianceSection';
import { RiskSection } from './RiskSection';
import { WorkflowSection } from './WorkflowSection';
import type { SparqlResults } from './types';

interface ReportDataViewProps {
  results: SparqlResults;
}

export const ReportDataView: React.FC<ReportDataViewProps> = ({ results }) => {
  return (
    <div className="space-y-10">
      <BuildingOverview results={results} />
      <SpatialInventory results={results} />
      <ElementInventory results={results} />
      <ComplianceSection results={results} />
      <RiskSection results={results} />
      <WorkflowSection results={results} />
    </div>
  );
};
