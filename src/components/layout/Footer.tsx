import React from 'react';
import { Github, ExternalLink } from 'lucide-react';
import siteConfig from '../../content/siteConfig.json';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-50 border-t border-neutral-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-4">
              About FiCR
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Fire Compliance and Risk Analysis Ontology for representing fire-safety-relevant
              physical objects and their relationships within existing buildings.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-4">
              Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://w3id.org/bam/ficr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-600 hover:text-primary-600 transition-colors flex items-center gap-1"
                >
                  Ontology URI
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://w3id.org/bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-600 hover:text-primary-600 transition-colors flex items-center gap-1"
                >
                  BOT Ontology
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-4">
              Authors
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              {siteConfig.ontology.authors.join(', ')}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-neutral-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-neutral-500">
            {currentYear} FiCR Ontology. Licensed under appropriate open license.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 hover:text-neutral-700 transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
};
