# FiCR Ontology Portal

A modern, interactive web portal for exploring the **Fire Compliance and Risk Analysis (FiCR) Ontology**. Built with React, TypeScript, and Tailwind CSS, this application provides comprehensive documentation, visualization, and examples of the FiCR semantic model for fire safety in buildings.

## Features

- **Interactive Documentation**: Complete ontology documentation with searchable modules, classes, and properties
- **Ontology Viewer**: Browse and search all classes, object properties, and datatype properties from the FiCR.ttl file
- **Usage Examples**: Practical Turtle/RDF examples demonstrating common fire safety modeling patterns
- **Alignment Information**: Detailed view of how FiCR aligns with other ontologies like BOT
- **Demo Page**: Placeholder for interactive demonstrations and SPARQL queries
- **Modern UI**: Clean, iOS-inspired design with smooth animations and responsive layout
- **Copy-to-Clipboard**: Easy copying of code examples, citations, and namespace prefixes
- **Downloadable Ontology**: Direct download of the FiCR.ttl ontology file

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. Clone this repository or extract the project files

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## Project Structure

```
├── public/
│   └── ficr.ttl                 # FiCR ontology file in Turtle format
├── src/
│   ├── components/
│   │   ├── layout/              # Layout components (Header, Footer, Layout)
│   │   ├── shared/              # Reusable UI components
│   │   └── OntologyViewer.tsx   # Ontology browser component
│   ├── content/
│   │   ├── siteConfig.json      # Site-wide configuration and content
│   │   └── demoConfig.json      # Demo page configuration
│   ├── pages/                   # Page components for each route
│   ├── utils/
│   │   └── ttlParser.ts         # TTL/RDF parsing utilities
│   ├── App.tsx                  # Main app component with routing
│   └── main.tsx                 # Application entry point
├── tailwind.config.js           # Tailwind CSS configuration
└── package.json                 # Project dependencies
```

## Customization

### Replacing the Ontology File

To use this portal with a different ontology:

1. Replace `public/ficr.ttl` with your ontology file (must be in Turtle format)
2. The file must follow standard RDF/OWL conventions
3. Ensure your ontology includes:
   - `rdf:type` declarations for classes and properties
   - `rdfs:label` for human-readable names
   - `rdfs:comment` for descriptions (optional)
   - `rdfs:domain` and `rdfs:range` for properties (optional)

### Modifying Content

All text content, metadata, and configuration can be modified through JSON files:

#### Site Configuration (`src/content/siteConfig.json`)

Edit this file to update:
- Ontology metadata (title, description, version, authors)
- Namespace prefixes
- Module structure and organization
- Alignment information with other ontologies
- Citation formats

Example structure:
```json
{
  "ontology": {
    "title": "Your Ontology Name",
    "description": "Your ontology description",
    "version": "1.0.0",
    "authors": ["Author 1", "Author 2"]
  },
  "modules": [
    {
      "name": "Module Name",
      "description": "Module description",
      "classes": ["Class1", "Class2"]
    }
  ]
}
```

#### Demo Configuration (`src/content/demoConfig.json`)

Edit this file to update:
- Demo objectives and descriptions
- Available datasets
- Planned features and their status

### Styling

The application uses Tailwind CSS with a custom theme. To modify colors, spacing, or other design tokens:

1. Edit `tailwind.config.js`
2. Modify the `extend` section to customize:
   - Color palettes (primary, secondary, neutral)
   - Border radius values
   - Box shadows
   - Font families

Example:
```javascript
colors: {
  primary: {
    500: '#0ea5e9',  // Your primary color
    600: '#0284c7',
  }
}
```

## Building for Production

To create a production build:

```bash
npm run build
```

The optimized files will be in the `dist/` directory, ready for deployment to any static hosting service.

## Deploying to GitHub Pages

This project is pre-configured for GitHub Pages deployment:

### Automatic Deployment

1. Push your code to GitHub repository named `FiCR`
2. Go to repository Settings → Pages
3. Set Source to "GitHub Actions"
4. The workflow will automatically build and deploy on every push to `main`

### Manual Deployment

If you prefer manual deployment:

```bash
npm run build
```

Then deploy the `dist/` folder to your GitHub Pages or any static hosting service.

### Configuration Notes

- **Router**: Uses `HashRouter` to avoid 404 errors on page refresh
- **Base URL**: Configured in `vite.config.ts` as `/FiCR/` for production (change if your repo name differs)
- **Asset URLs**: All public assets use `import.meta.env.BASE_URL` for correct path resolution

### Changing Repository Name

If your repository name is different from `FiCR`:

1. Update `vite.config.ts`:
```javascript
base: mode === 'production' ? '/your-repo-name/' : '/',
```

2. Rebuild the project:
```bash
npm run build
```

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **n3** - RDF/Turtle parsing
- **react-syntax-highlighter** - Code syntax highlighting
- **Lucide React** - Icon library

## Pages

- **Home** (`/`) - Landing page with overview and key features
- **Documentation** (`/documentation`) - Comprehensive documentation with all sections
- **Reference** (`/reference`) - Interactive ontology browser
- **Alignments** (`/alignments`) - Ontology alignment information
- **Examples** (`/examples`) - Practical usage examples
- **Demo** (`/demo`) - Interactive demonstrations (placeholder)

## Browser Support

This application works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

Please refer to the FiCR ontology license for usage terms. This portal implementation is provided as-is.

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues related to:
- The FiCR ontology itself - Contact the ontology authors
- This portal application - Create an issue in the repository

## Acknowledgments

FiCR Ontology Authors:
- Maxime Lefrançois
- Pieter Pauwels
- Georg Ferdinand Schneider
- Mads Holten Rasmussen

Built with modern web technologies and best practices for semantic web applications.
