import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { OntologyClass } from '../../utils/ttlParser';

interface ClassSpecificationProps {
  cls: OntologyClass;
  sectionNumber: string;
}

export const ClassSpecification: React.FC<ClassSpecificationProps> = ({ cls, sectionNumber }) => {
  const [copied, setCopied] = useState(false);

  const extractLocalName = (uri: string): string => {
    const parts = uri.split(/[#/]/);
    return parts[parts.length - 1] || uri;
  };

  const formatURI = (uri: string): { prefix: string; localName: string } => {
    if (uri.includes('w3id.org/bot')) {
      return { prefix: 'bot:', localName: extractLocalName(uri) };
    }
    if (uri.includes('w3id.org/bam/ficr')) {
      return { prefix: 'ficr:', localName: extractLocalName(uri) };
    }
    if (uri.includes('w3.org/2001/XMLSchema')) {
      return { prefix: 'xsd:', localName: extractLocalName(uri) };
    }
    if (uri.includes('w3.org/2000/01/rdf-schema')) {
      return { prefix: 'rdfs:', localName: extractLocalName(uri) };
    }
    if (uri.includes('w3.org/2002/07/owl')) {
      return { prefix: 'owl:', localName: extractLocalName(uri) };
    }
    return { prefix: '', localName: extractLocalName(uri) };
  };

  const copyIRI = async () => {
    await navigator.clipboard.writeText(cls.uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderURILink = (uri: string, showSubclass = false) => {
    const formatted = formatURI(uri);
    const fullName = formatted.prefix + formatted.localName;

    return (
      <span key={uri}>
        {showSubclass && ' ⊑ '}
        <a
          href={uri}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-700 hover:text-primary-900 hover:underline font-mono"
        >
          {fullName}
        </a>
      </span>
    );
  };

  return (
    <div id={`class-${extractLocalName(cls.uri)}`} className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-6 scroll-mt-24">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-neutral-900 mb-3">
          <span className="text-neutral-600 mr-2">§ {sectionNumber}</span>
          {formatURI(cls.uri).prefix}
          <span className="text-primary-700">{formatURI(cls.uri).localName}</span>
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-neutral-900 min-w-[60px]">IRI:</span>
            <div className="flex items-center gap-2 flex-1">
              <a
                href={cls.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-primary-700 hover:text-primary-900 hover:underline break-all"
              >
                {cls.uri}
              </a>
              <button
                onClick={copyIRI}
                className="p-1 hover:bg-teal-100 rounded transition-colors flex-shrink-0"
                title="Copy IRI"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-neutral-600" />
                )}
              </button>
            </div>
          </div>

          <div>
            <span className="font-semibold text-neutral-900">a OWL Class</span>
          </div>

          {cls.comment && (
            <div className="text-neutral-800 leading-relaxed italic border-l-4 border-teal-300 pl-4 py-2">
              {cls.comment}
            </div>
          )}

          {cls.subClassOf.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="font-semibold text-neutral-900 min-w-[100px]">Subclass of:</span>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {cls.subClassOf.map((uri) => renderURILink(uri))}
              </div>
            </div>
          )}

          {cls.examples.length > 0 && (
            <div className="bg-white rounded-md p-4 border border-teal-200">
              <div className="font-semibold text-neutral-900 mb-2">Example</div>
              <div className="text-neutral-700 text-sm">
                {cls.examples.map((example, idx) => (
                  <div key={idx}>{example}</div>
                ))}
              </div>
            </div>
          )}

          {cls.disjointWith.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="font-semibold text-neutral-900 min-w-[120px]">Disjoint with:</span>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {cls.disjointWith.map((uri) => renderURILink(uri))}
              </div>
            </div>
          )}

          {cls.equivalentClass.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="font-semibold text-neutral-900 min-w-[140px]">Equivalent class:</span>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {cls.equivalentClass.map((uri) => renderURILink(uri))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
