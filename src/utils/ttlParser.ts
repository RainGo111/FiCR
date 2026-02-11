import { Parser, Store, Quad } from 'n3';

export interface OntologyClass {
  uri: string;
  label: string;
  comment: string;
  subClassOf: string[];
  disjointWith: string[];
  equivalentClass: string[];
  examples: string[];
  type: 'Class';
}

export interface OntologyProperty {
  uri: string;
  label: string;
  comment: string;
  domain: string[];
  range: string[];
  subPropertyOf: string[];
  inverseOf: string[];
  type: 'ObjectProperty' | 'DatatypeProperty';
}

export interface ParsedOntology {
  classes: OntologyClass[];
  objectProperties: OntologyProperty[];
  datatypeProperties: OntologyProperty[];
  metadata: {
    title: string;
    description: string;
    version: string;
    namespace: string;
  };
}

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const OWL_CLASS = 'http://www.w3.org/2002/07/owl#Class';
const OWL_OBJECT_PROPERTY = 'http://www.w3.org/2002/07/owl#ObjectProperty';
const OWL_DATATYPE_PROPERTY = 'http://www.w3.org/2002/07/owl#DatatypeProperty';
const OWL_ONTOLOGY = 'http://www.w3.org/2002/07/owl#Ontology';
const OWL_DISJOINT_WITH = 'http://www.w3.org/2002/07/owl#disjointWith';
const OWL_EQUIVALENT_CLASS = 'http://www.w3.org/2002/07/owl#equivalentClass';
const OWL_INVERSE_OF = 'http://www.w3.org/2002/07/owl#inverseOf';
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
const RDFS_COMMENT = 'http://www.w3.org/2000/01/rdf-schema#comment';
const RDFS_SUBCLASS_OF = 'http://www.w3.org/2000/01/rdf-schema#subClassOf';
const RDFS_SUB_PROPERTY_OF = 'http://www.w3.org/2000/01/rdf-schema#subPropertyOf';
const RDFS_DOMAIN = 'http://www.w3.org/2000/01/rdf-schema#domain';
const RDFS_RANGE = 'http://www.w3.org/2000/01/rdf-schema#range';
const SKOS_EXAMPLE = 'http://www.w3.org/2004/02/skos/core#example';
const DC_TITLE = 'http://purl.org/dc/terms/title';
const DC_DESCRIPTION = 'http://purl.org/dc/terms/description';
const OWL_VERSION_INFO = 'http://www.w3.org/2002/07/owl#versionInfo';

export async function parseTTL(ttlContent: string): Promise<ParsedOntology> {
  const parser = new Parser();
  const store = new Store();

  return new Promise((resolve, reject) => {
    parser.parse(ttlContent, (error, quad, prefixes) => {
      if (error) {
        reject(error);
        return;
      }

      if (quad) {
        store.addQuad(quad);
      } else {
        const classes = extractClasses(store);
        const objectProperties = extractProperties(store, OWL_OBJECT_PROPERTY);
        const datatypeProperties = extractProperties(store, OWL_DATATYPE_PROPERTY);
        const metadata = extractMetadata(store);

        resolve({
          classes,
          objectProperties,
          datatypeProperties,
          metadata,
        });
      }
    });
  });
}

function extractClasses(store: Store): OntologyClass[] {
  const classQuads = store.getQuads(null, RDF_TYPE, OWL_CLASS, null);
  const classes: OntologyClass[] = [];

  classQuads.forEach((quad: Quad) => {
    const uri = quad.subject.value;

    const labels = store.getQuads(quad.subject, RDFS_LABEL, null, null);
    const label = labels.length > 0 ? labels[0].object.value : extractLocalName(uri);

    const comments = store.getQuads(quad.subject, RDFS_COMMENT, null, null);
    const comment = comments.length > 0 ? comments[0].object.value : '';

    const subClassOfQuads = store.getQuads(quad.subject, RDFS_SUBCLASS_OF, null, null);
    const subClassOf = subClassOfQuads.map((q: Quad) => q.object.value);

    const disjointWithQuads = store.getQuads(quad.subject, OWL_DISJOINT_WITH, null, null);
    const disjointWith = disjointWithQuads.map((q: Quad) => q.object.value);

    const equivalentClassQuads = store.getQuads(quad.subject, OWL_EQUIVALENT_CLASS, null, null);
    const equivalentClass = equivalentClassQuads.map((q: Quad) => q.object.value);

    const exampleQuads = store.getQuads(quad.subject, SKOS_EXAMPLE, null, null);
    const examples = exampleQuads.map((q: Quad) => q.object.value);

    classes.push({
      uri,
      label,
      comment,
      subClassOf,
      disjointWith,
      equivalentClass,
      examples,
      type: 'Class',
    });
  });

  return classes.sort((a, b) => a.label.localeCompare(b.label));
}

function extractProperties(store: Store, propertyType: string): OntologyProperty[] {
  const propertyQuads = store.getQuads(null, RDF_TYPE, propertyType, null);
  const properties: OntologyProperty[] = [];

  propertyQuads.forEach((quad: Quad) => {
    const uri = quad.subject.value;

    const labels = store.getQuads(quad.subject, RDFS_LABEL, null, null);
    const label = labels.length > 0 ? labels[0].object.value : extractLocalName(uri);

    const comments = store.getQuads(quad.subject, RDFS_COMMENT, null, null);
    const comment = comments.length > 0 ? comments[0].object.value : '';

    const domainQuads = store.getQuads(quad.subject, RDFS_DOMAIN, null, null);
    const domain = domainQuads.map((q: Quad) => q.object.value);

    const rangeQuads = store.getQuads(quad.subject, RDFS_RANGE, null, null);
    const range = rangeQuads.map((q: Quad) => q.object.value);

    const subPropertyOfQuads = store.getQuads(quad.subject, RDFS_SUB_PROPERTY_OF, null, null);
    const subPropertyOf = subPropertyOfQuads.map((q: Quad) => q.object.value);

    const inverseOfQuads = store.getQuads(quad.subject, OWL_INVERSE_OF, null, null);
    const inverseOf = inverseOfQuads.map((q: Quad) => q.object.value);

    properties.push({
      uri,
      label,
      comment,
      domain,
      range,
      subPropertyOf,
      inverseOf,
      type: propertyType === OWL_OBJECT_PROPERTY ? 'ObjectProperty' : 'DatatypeProperty',
    });
  });

  return properties.sort((a, b) => a.label.localeCompare(b.label));
}

function extractMetadata(store: Store): ParsedOntology['metadata'] {
  const ontologyQuads = store.getQuads(null, RDF_TYPE, OWL_ONTOLOGY, null);

  if (ontologyQuads.length === 0) {
    return {
      title: 'Ontology',
      description: '',
      version: '',
      namespace: '',
    };
  }

  const ontologySubject = ontologyQuads[0].subject;

  const titleQuads = store.getQuads(ontologySubject, DC_TITLE, null, null);
  const title = titleQuads.length > 0 ? titleQuads[0].object.value : 'Ontology';

  const descriptionQuads = store.getQuads(ontologySubject, DC_DESCRIPTION, null, null);
  const commentQuads = store.getQuads(ontologySubject, RDFS_COMMENT, null, null);
  const description = descriptionQuads.length > 0
    ? descriptionQuads[0].object.value
    : commentQuads.length > 0
    ? commentQuads[0].object.value
    : '';

  const versionQuads = store.getQuads(ontologySubject, OWL_VERSION_INFO, null, null);
  const version = versionQuads.length > 0 ? versionQuads[0].object.value : '';

  const namespace = ontologySubject.value;

  return {
    title,
    description,
    version,
    namespace,
  };
}

function extractLocalName(uri: string): string {
  const parts = uri.split(/[#/]/);
  return parts[parts.length - 1] || uri;
}

export async function loadOntology(): Promise<ParsedOntology> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}ficr_tbox.ttl`);
    if (!response.ok) {
      throw new Error(`Failed to load ontology: ${response.statusText}`);
    }
    const ttlContent = await response.text();
    return await parseTTL(ttlContent);
  } catch (error) {
    console.error('Error loading ontology:', error);
    throw error;
  }
}
