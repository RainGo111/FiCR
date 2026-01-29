import React from 'react';
import { Card, Badge } from '../components/shared';
import { ExternalLink, GitBranch } from 'lucide-react';
import siteConfig from '../content/siteConfig.json';

export const Alignments: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">Ontology Alignments</h1>
        <p className="text-lg text-neutral-600">
          FiCR is aligned with established ontologies to ensure semantic interoperability
          and reuse of proven conceptual models
        </p>
      </div>

      <div className="mb-8">
        <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 border-2 border-primary-100">
          <div className="flex items-start gap-4">
            <div className="bg-white p-3 rounded-xl shadow-soft">
              <GitBranch className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2">
                Why Ontology Alignment Matters
              </h2>
              <p className="text-neutral-700 leading-relaxed">
                By aligning with existing ontologies, FiCR ensures that data can be seamlessly
                integrated with other systems, promotes reuse of established vocabularies, and
                enables interoperability across different domains and applications.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        {siteConfig.alignments.map((alignment, index) => (
          <Card key={index} hover>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold text-neutral-900">{alignment.ontology}</h2>
                <Badge variant="primary">Active Alignment</Badge>
              </div>
              <a
                href={alignment.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-mono text-sm transition-colors"
              >
                {alignment.uri}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="mb-4">
              <p className="text-neutral-700 leading-relaxed">{alignment.description}</p>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Main Alignments</h3>
              <div className="space-y-2">
                {alignment.mainAlignments.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="flex items-start gap-3 text-sm bg-white rounded-lg p-3"
                  >
                    <span className="text-primary-600 font-bold mt-0.5">•</span>
                    <code className="text-neutral-700 flex-grow">{item}</code>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-12">
        <Card className="border-2 border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">Extending Alignments</h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            FiCR is designed to be extensible. If you need to align FiCR with additional
            ontologies for your specific use case, you can:
          </p>
          <ul className="space-y-2 text-neutral-700">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold mt-1">1.</span>
              <span>Use OWL equivalence and mapping axioms to relate FiCR concepts to external vocabularies</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold mt-1">2.</span>
              <span>Create application-specific extension modules that import both FiCR and your target ontology</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold mt-1">3.</span>
              <span>Contribute alignment mappings back to the FiCR community</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};
