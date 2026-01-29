import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { OntologyProperty } from '../../utils/ttlParser';

interface PropertySpecificationProps {
  property: OntologyProperty;
  sectionNumber: string;
}

export const PropertySpecification: React.FC<PropertySpecificationProps> = ({ property, sectionNumber }) => {
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
    await navigator.clipboard.writeText(property.uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderURILink = (uri: string) => {
    const formatted = formatURI(uri);
    const fullName = formatted.prefix + formatted.localName;

    return (
      <a
        key={uri}
        href={uri}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-700 hover:text-primary-900 hover:underline font-mono"
      >
        {fullName}
      </a>
    );
  };

  return (
    <div id={`property-${extractLocalName(property.uri)}`} className="bg-cyan-50 border border-cyan-200 rounded-lg p-6 mb-6 scroll-mt-24">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-neutral-900 mb-3">
          <span className="text-neutral-600 mr-2">§ {sectionNumber}</span>
          {formatURI(property.uri).prefix}
          <span className="text-primary-700">{formatURI(property.uri).localName}</span>
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-neutral-900 min-w-[60px]">IRI:</span>
            <div className="flex items-center gap-2 flex-1">
              <a
                href={property.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-primary-700 hover:text-primary-900 hover:underline break-all"
              >
                {property.uri}
              </a>
              <button
                onClick={copyIRI}
                className="p-1 hover:bg-cyan-100 rounded transition-colors flex-shrink-0"
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
            <span className="font-semibold text-neutral-900">
              {property.type === 'ObjectProperty' ? 'an OWL Object Property' : 'an OWL Datatype Property'}
            </span>
          </div>

          {property.comment && (
            <div className="text-neutral-800 leading-relaxed italic border-l-4 border-cyan-300 pl-4 py-2">
              {property.comment}
            </div>
          )}

          {property.domain.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="font-semibold text-neutral-900 min-w-[80px]">Domain:</span>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {property.domain.map((uri) => renderURILink(uri))}
              </div>
            </div>
          )}

          {property.range.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="font-semibold text-neutral-900 min-w-[80px]">Range:</span>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {property.range.map((uri) => renderURILink(uri))}
              </div>
            </div>
          )}

          {property.subPropertyOf.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="font-semibold text-neutral-900 min-w-[140px]">Sub-property of:</span>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {property.subPropertyOf.map((uri) => renderURILink(uri))}
              </div>
            </div>
          )}

          {property.inverseOf.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="font-semibold text-neutral-900 min-w-[100px]">Inverse of:</span>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {property.inverseOf.map((uri) => renderURILink(uri))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
