import React, { useState, useEffect } from 'react';
import { Card, Tabs, SearchBar, Badge } from './shared';
import { loadOntology, ParsedOntology, OntologyClass, OntologyProperty } from '../utils/ttlParser';
import { Box, Link as LinkIcon, Type, Loader } from 'lucide-react';

export const OntologyViewer: React.FC = () => {
  const [ontology, setOntology] = useState<ParsedOntology | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('classes');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filterItems = <T extends { label: string; comment: string; uri: string }>(
    items: T[]
  ): T[] => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.comment.toLowerCase().includes(query) ||
        item.uri.toLowerCase().includes(query)
    );
  };

  const renderClassCard = (cls: OntologyClass) => (
    <Card key={cls.uri} className="mb-4">
      <div className="flex items-start gap-3">
        <div className="bg-primary-100 text-primary-600 p-2 rounded-lg flex-shrink-0">
          <Box className="w-5 h-5" />
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">{cls.label}</h3>
          {cls.comment && <p className="text-neutral-600 text-sm mb-3">{cls.comment}</p>}
          <div className="space-y-2">
            <div>
              <span className="text-xs text-neutral-500 font-medium">URI:</span>
              <code className="ml-2 text-xs text-neutral-700 bg-neutral-100 px-2 py-1 rounded">
                {cls.uri}
              </code>
            </div>
            {cls.subClassOf.length > 0 && (
              <div>
                <span className="text-xs text-neutral-500 font-medium">Subclass of:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {cls.subClassOf.map((parent, index) => (
                    <Badge key={index} variant="neutral">
                      {parent.split('#').pop() || parent.split('/').pop()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  const renderPropertyCard = (prop: OntologyProperty) => (
    <Card key={prop.uri} className="mb-4">
      <div className="flex items-start gap-3">
        <div className="bg-secondary-100 text-secondary-600 p-2 rounded-lg flex-shrink-0">
          {prop.type === 'ObjectProperty' ? (
            <LinkIcon className="w-5 h-5" />
          ) : (
            <Type className="w-5 h-5" />
          )}
        </div>
        <div className="flex-grow">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-neutral-900">{prop.label}</h3>
            <Badge variant={prop.type === 'ObjectProperty' ? 'primary' : 'secondary'}>
              {prop.type === 'ObjectProperty' ? 'Object' : 'Datatype'}
            </Badge>
          </div>
          {prop.comment && <p className="text-neutral-600 text-sm mb-3">{prop.comment}</p>}
          <div className="space-y-2">
            <div>
              <span className="text-xs text-neutral-500 font-medium">URI:</span>
              <code className="ml-2 text-xs text-neutral-700 bg-neutral-100 px-2 py-1 rounded">
                {prop.uri}
              </code>
            </div>
            {prop.domain.length > 0 && (
              <div>
                <span className="text-xs text-neutral-500 font-medium">Domain:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {prop.domain.map((d, index) => (
                    <Badge key={index} variant="neutral">
                      {d.split('#').pop() || d.split('/').pop()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {prop.range.length > 0 && (
              <div>
                <span className="text-xs text-neutral-500 font-medium">Range:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {prop.range.map((r, index) => (
                    <Badge key={index} variant="neutral">
                      {r.split('#').pop() || r.split('/').pop()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-red-200 bg-red-50">
        <p className="text-red-700">Error loading ontology: {error}</p>
      </Card>
    );
  }

  if (!ontology) {
    return null;
  }

  const filteredClasses = filterItems(ontology.classes);
  const filteredObjectProperties = filterItems(ontology.objectProperties);
  const filteredDatatypeProperties = filterItems(ontology.datatypeProperties);

  const tabs = [
    {
      id: 'classes',
      label: `Classes (${filteredClasses.length})`,
      icon: <Box className="w-4 h-4" />
    },
    {
      id: 'objectProperties',
      label: `Object Properties (${filteredObjectProperties.length})`,
      icon: <LinkIcon className="w-4 h-4" />
    },
    {
      id: 'datatypeProperties',
      label: `Datatype Properties (${filteredDatatypeProperties.length})`,
      icon: <Type className="w-4 h-4" />
    }
  ];

  return (
    <div>
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search classes, properties, descriptions..."
        className="mb-6"
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      <div>
        {activeTab === 'classes' && (
          <div>
            {filteredClasses.length === 0 ? (
              <Card>
                <p className="text-neutral-600 text-center py-8">
                  No classes found matching your search.
                </p>
              </Card>
            ) : (
              filteredClasses.map(renderClassCard)
            )}
          </div>
        )}

        {activeTab === 'objectProperties' && (
          <div>
            {filteredObjectProperties.length === 0 ? (
              <Card>
                <p className="text-neutral-600 text-center py-8">
                  No object properties found matching your search.
                </p>
              </Card>
            ) : (
              filteredObjectProperties.map(renderPropertyCard)
            )}
          </div>
        )}

        {activeTab === 'datatypeProperties' && (
          <div>
            {filteredDatatypeProperties.length === 0 ? (
              <Card>
                <p className="text-neutral-600 text-center py-8">
                  No datatype properties found matching your search.
                </p>
              </Card>
            ) : (
              filteredDatatypeProperties.map(renderPropertyCard)
            )}
          </div>
        )}
      </div>
    </div>
  );
};
