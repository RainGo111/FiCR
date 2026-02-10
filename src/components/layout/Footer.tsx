import React from 'react';
import { Github, ExternalLink } from 'lucide-react';
import siteConfig from '../../content/siteConfig.json';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-film-cream/95 border-t border-film-sand mt-auto bg-film-grain-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-sans font-semibold text-film-ink uppercase tracking-wider mb-4">
              About FiCR
            </h3>
            <p className="text-sm font-sans text-film-slate leading-relaxed">
              Fire Compliance and Risk Analysis Ontology for representing fire-safety-relevant
              physical objects and their relationships within existing buildings.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-sans font-semibold text-film-ink uppercase tracking-wider mb-4">
              Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://w3id.org/bam/ficr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-sans text-film-slate hover:text-accent-600 transition-film flex items-center gap-1"
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
                  className="text-sm font-sans text-film-slate hover:text-accent-600 transition-film flex items-center gap-1"
                >
                  BOT Ontology
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-sans font-semibold text-film-ink uppercase tracking-wider mb-4">
              Authors
            </h3>
            <p className="text-sm font-sans text-film-slate leading-relaxed">
              {siteConfig.ontology.authors.join(', ')}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-film-sand flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm font-sans text-film-carbon">
            {currentYear} FiCR Ontology. Licensed under appropriate open license.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-film-carbon hover:text-film-ink transition-film"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
};
