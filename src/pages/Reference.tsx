import React from 'react';
import { OntologyViewer } from '../components/OntologyViewer';

export const Reference: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">Ontology Reference</h1>
        <p className="text-lg text-neutral-600">
          Browse all classes, object properties, and datatype properties defined in the FiCR ontology
        </p>
      </div>

      <OntologyViewer />
    </div>
  );
};
