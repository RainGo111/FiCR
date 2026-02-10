import React, { useState, useEffect } from 'react';
import { Card, Button, CodeBlock } from '../components/shared';
import { Download, Search, ArrowUp } from 'lucide-react';
import { TableOfContents, ClassSpecification, PropertySpecification, TOCSection } from '../components/documentation';
import { loadOntology, ParsedOntology } from '../utils/ttlParser';
import siteConfig from '../content/siteConfig.json';

export const Documentation: React.FC = () => {
  const [ontology, setOntology] = useState<ParsedOntology | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    loadOntology()
      .then((data) => {
        setOntology(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildTOC = (): TOCSection[] => {
    const toc: TOCSection[] = [
      {
        id: 'introduction',
        number: '1',
        title: 'Introduction',
      },
      {
        id: 'namespace',
        number: '2',
        title: 'Namespace',
      },
      {
        id: 'axiomatization',
        number: '3',
        title: 'Axiomatization',
        subsections: [
          {
            id: 'overview-classes',
            number: '3.1',
            title: 'Overview of Classes and Properties',
          },
          {
            id: 'classes',
            number: '3.2',
            title: 'Classes',
          },
          {
            id: 'object-properties',
            number: '3.3',
            title: 'Object Properties',
          },
          {
            id: 'datatype-properties',
            number: '3.4',
            title: 'Datatype Properties',
          },
        ],
      },
      {
        id: 'citation',
        number: '4',
        title: 'Citation',
      },
    ];

    return toc;
  };

  const filteredClasses = ontology?.classes.filter((cls) =>
    cls.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.comment.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredObjectProperties = ontology?.objectProperties.filter((prop) =>
    prop.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prop.comment.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredDatatypeProperties = ontology?.datatypeProperties.filter((prop) =>
    prop.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prop.comment.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const prefixesCode = Object.entries(siteConfig.prefixes)
    .map(([prefix, uri]) => `@prefix ${prefix}: <${uri}> .`)
    .join('\n');

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-neutral-600">Loading ontology...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Ontology</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <TableOfContents sections={buildTOC()} />
        </aside>

        <main className="lg:col-span-3">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-neutral-900 mb-3">
              FiCR Ontology Specification
            </h1>
            <p className="text-lg text-neutral-600 mb-4">
              Fire Compliance and Risk Analysis Ontology
            </p>
            <div className="flex gap-3">
              <a href={`${import.meta.env.BASE_URL}ficr_tbox.ttl`} download>
                <Button variant="primary" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download FiCR Ontology
                </Button>
              </a>
            </div>
          </header>

          <section id="introduction" className="mb-12 scroll-mt-20">
            <h2 className="text-3xl font-bold text-neutral-900 mb-6 border-b-2 border-neutral-200 pb-2">
              <span className="text-neutral-600 mr-3">1.</span>
              Introduction
            </h2>
            <Card>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Purpose</h3>
                  <p className="text-neutral-700 leading-relaxed">
                    {siteConfig.ontology.purpose}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Scope</h3>
                  <p className="text-neutral-700 leading-relaxed">
                    {siteConfig.ontology.scope}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Version</h3>
                  <p className="text-neutral-700 font-semibold text-xl">
                    {siteConfig.ontology.version}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Authors</h3>
                  <p className="text-neutral-700">
                    {siteConfig.ontology.authors.join(', ')}
                  </p>
                </div>
              </div>
            </Card>
          </section>

          <section id="namespace" className="mb-12 scroll-mt-20">
            <h2 className="text-3xl font-bold text-neutral-900 mb-6 border-b-2 border-neutral-200 pb-2">
              <span className="text-neutral-600 mr-3">2.</span>
              Namespace
            </h2>
            <Card>
              <p className="text-neutral-700 mb-4">
                The FiCR ontology uses the following namespace and prefix declarations:
              </p>
              <div className="mb-4">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-sm font-semibold text-neutral-600">Namespace:</span>
                  <span className="font-mono text-sm text-primary-700">{siteConfig.ontology.namespace}</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-sm font-semibold text-neutral-600">Prefix:</span>
                  <span className="font-mono text-lg font-bold text-neutral-900">{siteConfig.ontology.prefix}:</span>
                </div>
              </div>
              <CodeBlock code={prefixesCode} language="turtle" title="All Namespace Prefixes" />
            </Card>
          </section>

          <section id="axiomatization" className="mb-12 scroll-mt-20">
            <h2 className="text-3xl font-bold text-neutral-900 mb-6 border-b-2 border-neutral-200 pb-2">
              <span className="text-neutral-600 mr-3">3.</span>
              Axiomatization
            </h2>

            <div id="overview-classes" className="mb-8 scroll-mt-20">
              <h3 className="text-2xl font-bold text-neutral-900 mb-4">
                <span className="text-neutral-600 mr-3">3.1</span>
                Overview of Classes and Properties
              </h3>
              <Card>
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary-600 mb-1">
                      {ontology?.classes.length || 0}
                    </div>
                    <div className="text-sm text-neutral-600">Classes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-secondary-600 mb-1">
                      {ontology?.objectProperties.length || 0}
                    </div>
                    <div className="text-sm text-neutral-600">Object Properties</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-accent-600 mb-1">
                      {ontology?.datatypeProperties.length || 0}
                    </div>
                    <div className="text-sm text-neutral-600">Datatype Properties</div>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search classes and properties..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </Card>
            </div>

            <div id="classes" className="mb-8 scroll-mt-20">
              <h3 className="text-2xl font-bold text-neutral-900 mb-4">
                <span className="text-neutral-600 mr-3">3.2</span>
                Classes
              </h3>
              <p className="text-neutral-600 mb-6">
                This section introduces the {filteredClasses.length} classes defined in the FiCR ontology.
              </p>
              {filteredClasses.map((cls, index) => (
                <ClassSpecification
                  key={cls.uri}
                  cls={cls}
                  sectionNumber={`3.2.${index + 1}`}
                />
              ))}
            </div>

            <div id="object-properties" className="mb-8 scroll-mt-20">
              <h3 className="text-2xl font-bold text-neutral-900 mb-4">
                <span className="text-neutral-600 mr-3">3.3</span>
                Object Properties
              </h3>
              <p className="text-neutral-600 mb-6">
                This section introduces the {filteredObjectProperties.length} object properties defined in the FiCR ontology.
              </p>
              {filteredObjectProperties.map((prop, index) => (
                <PropertySpecification
                  key={prop.uri}
                  property={prop}
                  sectionNumber={`3.3.${index + 1}`}
                />
              ))}
            </div>

            <div id="datatype-properties" className="mb-8 scroll-mt-20">
              <h3 className="text-2xl font-bold text-neutral-900 mb-4">
                <span className="text-neutral-600 mr-3">3.4</span>
                Datatype Properties
              </h3>
              <p className="text-neutral-600 mb-6">
                This section introduces the {filteredDatatypeProperties.length} datatype properties defined in the FiCR ontology.
              </p>
              {filteredDatatypeProperties.map((prop, index) => (
                <PropertySpecification
                  key={prop.uri}
                  property={prop}
                  sectionNumber={`3.4.${index + 1}`}
                />
              ))}
            </div>
          </section>

          <section id="citation" className="mb-12 scroll-mt-20">
            <h2 className="text-3xl font-bold text-neutral-900 mb-6 border-b-2 border-neutral-200 pb-2">
              <span className="text-neutral-600 mr-3">4.</span>
              Citation
            </h2>
            <Card>
              <p className="text-neutral-700 mb-6">
                If you use FiCR in your research or project, please cite it as follows:
              </p>
              <div className="bg-neutral-50 rounded-lg p-4">
                <p className="text-sm text-neutral-700 leading-relaxed">
                  {siteConfig.citation.text}
                </p>
              </div>
            </Card>
          </section>
        </main>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-primary-600 text-white p-3 rounded-full shadow-lg hover:bg-primary-700 transition-colors z-50"
          title="Back to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
