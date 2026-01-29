<div align="center">

  
  <h1>🔥 FiCR Ontology Portal</h1>
  
  <p align="center">
    <b>Fire Compliance and Risk Analysis (FiCR) Ontology</b>
    <br />
    <i>A semantic web platform for fire safety engineering and building compliance</i>
  </p>

  <br />

  <!-- Soft Style Live Demo Badge -->
  <a href="https://RainGo111.github.io/FiCR/">
    <img src="https://img.shields.io/badge/🚀_Live_Demo-Click_to_Open-3b82f6?style=flat-square&logoColor=white" alt="Live Demo" />
  </a>

  <br />
  <br />
</div>

---

## 📖 About The Project

The **FiCR Ontology Portal** is a specialized web application designed to bridge the gap between complex semantic models and practical fire safety engineering. It serves as a comprehensive interface for the **Fire Compliance and Risk Analysis (FiCR)** ontology, enabling researchers, engineers, and domain experts to explore, understand, and implement fire safety standards in the Semantic Web.

This platform provides a user-friendly layer over the raw `.ttl` (Turtle) ontology files, offering interactive visualization, search capabilities, and direct alignment references with other building standards like **BOT (Building Topology Ontology)**.

---

## ✨ Core Modules

This application is divided into several key modules designed for different use cases:

### 🔍 Ontology Browser
An interactive, searchable index of all classes and properties defined in the FiCR namespace.
*   **Class Hierarchy**: View parent-child relationships.
*   **Property Definitions**: Detailed domain and range specifications.
*   **Smart Search**: Instantly find terms without browsing the entire tree.

### 📚 Documentation Hub
A curated knowledge base explaining the core concepts of FiCR.
*   **Modules**: Broken down by functional areas (e.g., Risk Assessment, Building Materials, Regulations).
*   **Best Practices**: Guidelines on how to instantiate the ontology in real-world projects.

### 🔗 Alignments
Visual and textual explanations of how FiCR connects with the wider Semantic Web ecosystem.
*   **BOT Integration**: How building topology interfaces with fire zones.
*   **SOSA/SSN**: Integration with sensor networks for real-time fire detection.

### 💡 Usage Examples
A collection of "Cookbook" style recipes for common modeling tasks.
*   **Copy-Paste Ready**: All examples are provided in valid Turtle syntax.
*   **Scenario Based**: Examples range from simple room definitions to complex evacuation paths.

---

## 🛠️ Getting Started

### Prerequisites
*   Node.js (v16+)
*   npm

### Installation & Run

1.  **Clone the repository**
    ```bash
    git clone https://github.com/RainGo111/FiCR.git
    cd FiCR
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start local server**
    ```bash
    npm run dev
    ```

---

## 📦 Project Structure

The project follows a clean, modular architecture:

```
├── public/
│   └── ficr.ttl                 # The core ontology file (Single Source of Truth)
├── src/
│   ├── components/
│   │   ├── OntologyViewer.tsx   # Core parsing and visualization engine
│   │   └── ...
│   ├── content/
│   │   ├── siteConfig.json      # Global settings (Title, Version, Authors)
│   │   └── demoConfig.json      # Content for demo pages
│   ├── pages/                   # Application Routes
│   └── utils/                   # RDF/Turtle parsing logic
```

## 📝 Customization Guide

### Changing the Ontology
To use this portal for a different version of FiCR or a completely new ontology:
1.  Replace `public/ficr.ttl` with your new file.
2.  Update metadata in `src/content/siteConfig.json`.

### Theming
The UI is built with **Tailwind CSS**. You can customize the color scheme (e.g., changing the primary compliance color) by editing the `theme.extend.colors` section in `tailwind.config.js`.

---

## 📄 License & Acknowledgments

**FiCR Ontology Authors**:
*   Maxime Lefrançois
*   Pieter Pauwels
*   Georg Ferdinand Schneider
*   Mads Holten Rasmussen

*Portal implementation is licensed under MIT. Ontology content retains its original license.*
