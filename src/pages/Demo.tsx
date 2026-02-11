import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, CodeBlock } from '../components/shared';
import { Building2, AlertCircle, Loader2, Flame, Box, Layers, Database } from 'lucide-react';
import { loadDemo, ParsedDemo } from '../utils/demoParser';

type QueryType = 'building' | 'compartments' | 'elements' | null;

const SPARQL_QUERIES = {
  building: `PREFIX ficr: <http://example.org/ficr#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?building ?purposeGroup ?sprinklerStatus ?height ?hazardClass
WHERE {
  ?building rdf:type ficr:Building ;
            ficr:purposeGroup ?purposeGroup ;
            ficr:sprinklerStatus ?sprinklerStatus ;
            ficr:overallHeight_m ?height ;
            ficr:hazardClass ?hazardClass .
}`,
  compartments: `PREFIX ficr: <http://example.org/ficr#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?compartment ?name ?location ?floorArea
WHERE {
  ?compartment rdf:type ficr:FireCompartment ;
               ficr:name ?name ;
               ficr:location ?location ;
               ficr:actualFloorArea_m2 ?floorArea .
}
ORDER BY ?location`,
  elements: `PREFIX ficr: <http://example.org/ficr#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?element ?type ?adjacentZone ?reiValue
WHERE {
  ?element rdf:type ficr:FireRelevantElement ;
           ficr:elementType ?type ;
           ficr:adjacentToZone ?adjacentZone .

  OPTIONAL {
    ?element ficr:actual_REI_Wall ?reiValue .
  }
  OPTIONAL {
    ?element ficr:actual_REI_Floor ?reiValue .
  }
}
ORDER BY ?type ?element`
};

export const Demo: React.FC = () => {
  const [demoData, setDemoData] = useState<ParsedDemo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<QueryType>(null);

  useEffect(() => {
    loadDemo()
      .then((data) => {
        setDemoData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load demo data');
        setLoading(false);
      });
  }, []);

  const renderQueryResult = () => {
    if (!demoData || !selectedQuery) return null;

    const building = demoData.buildings[0];

    switch (selectedQuery) {
      case 'building':
        return building ? (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-neutral-600" />
              Query Result
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Building URI</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Purpose Group</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Sprinkler Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Height (m)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Hazard Class</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm font-mono text-neutral-900">{building.uri.split('#')[1] || building.uri}</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{building.purposeGroup}</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{building.sprinklerStatus}</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{building.overallHeight_m}</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{building.hazardClass}</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </div>
        ) : null;

      case 'compartments':
        return (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-neutral-600" />
              Query Result
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Compartment URI</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Floor Area (m²)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {demoData.compartments.map((compartment, index) => (
                    <tr key={index} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm font-mono text-neutral-900">{compartment.uri.split('#')[1] || compartment.uri}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{compartment.name}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{compartment.location}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{compartment.actualFloorArea_m2}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        );

      case 'elements':
        return (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-neutral-600" />
              Query Result
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Element URI</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Adjacent to Zone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">REI Value (min)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {demoData.elements.map((element, index) => (
                    <tr key={index} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm font-mono text-neutral-900">{element.uri.split('#')[1] || element.uri}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{element.type}</td>
                      <td className="px-6 py-4 text-sm font-mono text-neutral-900">{element.adjacentToZone?.split('#')[1] || element.adjacentToZone}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">
                        {element.type === 'Wall' ? element.actual_REI_Wall : element.actual_REI_Floor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const building = demoData?.buildings[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl mb-4 shadow-medium">
          <Flame className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">
          Interactive Fire Risk Demo
        </h1>
        <p className="text-xl text-neutral-600">
          Explore FiCR ontology with real building data
        </p>
      </div>

      {loading && (
        <Card className="mb-8 bg-neutral-50 border-neutral-200">
          <div className="flex items-center justify-center gap-3 text-neutral-700">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-lg font-medium">Loading demo data...</p>
          </div>
        </Card>
      )}

      {error && (
        <Card className="mb-8 bg-red-50 border-red-200">
          <div className="flex items-start gap-3 text-red-700">
            <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Error loading demo data</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {demoData && building && (
        <>
          <Card className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-neutral-800 text-white p-2.5 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900">Building Overview</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  <tr className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">Building URI</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{building.uri.split('#')[1] || building.uri}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">Purpose Group</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{building.purposeGroup}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">Sprinkler Status</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{building.sprinklerStatus}</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">Overall Height</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{building.overallHeight_m} m</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">Hazard Class</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{building.hazardClass}</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </Card>

          <Card className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-neutral-700 text-white p-2.5 rounded-xl">
                <Box className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900">Fire Compartments</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">URI</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Floor Area (m²)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {demoData.compartments.map((compartment, index) => (
                    <tr key={index} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm font-mono text-neutral-900">{compartment.uri.split('#')[1] || compartment.uri}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{compartment.name}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{compartment.location}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{compartment.actualFloorArea_m2}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>

          <Card className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-neutral-600 text-white p-2.5 rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900">Fire-Relevant Elements</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">URI</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Adjacent to Zone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Actual REI (min)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {demoData.elements.map((element, index) => (
                    <tr key={index} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm font-mono text-neutral-900">{element.uri.split('#')[1] || element.uri}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{element.type}</td>
                      <td className="px-6 py-4 text-sm font-mono text-neutral-900">{element.adjacentToZone?.split('#')[1] || element.adjacentToZone}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">
                        {element.type === 'Wall' ? element.actual_REI_Wall : element.actual_REI_Floor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-neutral-500 text-white p-2.5 rounded-xl">
                <Database className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900">SPARQL Query Examples</h2>
            </div>

            <p className="text-neutral-600 mb-6">
              Explore how FiCR ontology data can be queried using SPARQL. Select a query below to view
              the SPARQL syntax and see the results from the demo dataset.
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              <Button
                variant={selectedQuery === 'building' ? 'primary' : 'outline'}
                onClick={() => setSelectedQuery(selectedQuery === 'building' ? null : 'building')}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Building Query
              </Button>
              <Button
                variant={selectedQuery === 'compartments' ? 'primary' : 'outline'}
                onClick={() => setSelectedQuery(selectedQuery === 'compartments' ? null : 'compartments')}
              >
                <Box className="w-4 h-4 mr-2" />
                Compartment Query
              </Button>
              <Button
                variant={selectedQuery === 'elements' ? 'primary' : 'outline'}
                onClick={() => setSelectedQuery(selectedQuery === 'elements' ? null : 'elements')}
              >
                <Layers className="w-4 h-4 mr-2" />
                Elements Query
              </Button>
            </div>

            {selectedQuery && (
              <div className="border-t border-neutral-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-neutral-900">SPARQL Query</h3>
                  <Badge variant="neutral">Read-only</Badge>
                </div>
                <CodeBlock
                  code={SPARQL_QUERIES[selectedQuery]}
                  language="sparql"
                />
                {renderQueryResult()}
              </div>
            )}
          </Card>

          <div className="mt-8 text-center text-sm text-neutral-500 pb-4">
            <p>Demo data loaded from <code>ficr_demo.ttl</code></p>
            <p>This demonstrates FiCR ontology structure with a real building example</p>
          </div>
        </>
      )}
    </div>
  );
};
