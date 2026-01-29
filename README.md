<div align="center">
  <h1>🔥 FiCR Ontology Portal</h1>
  <p>
    <b>Fire Compliance and Risk Analysis (FiCR) Ontology</b>
    <br/>
    A modern, interactive portal for exploring fire safety semantic models.
  </p>

  <!-- Badges -->
  <p>
    <a href="https://RainGo111.github.io/FiCR/">
      <img src="https://img.shields.io/badge/Live-Demo-2ea44f?style=for-the-badge&logo=github&logoColor=white" alt="Live Demo" />
    </a>
    <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  </p>
</div>

---

## 🚀 Introduction

This project is a modern web portal designed to visualize and document the **FiCR (Fire Compliance and Risk Analysis) Ontology**. It provides researchers and engineers with an interactive way to explore classes, properties, and alignment with other building ontologies (like BOT).

### ✨ Key Features

*   **🔍 Ontology Viewer**: Searchable browser for all FiCR classes and properties.
*   **📚 Interactive Documentation**: Comprehensive guides and references.
*   **💡 Usage Examples**: Practical Turtle/RDF examples for fire safety modeling.
*   **⚡ Modern Stack**: Built with React 18, Vite, and Tailwind CSS for high performance.

---

## 🛠️ Getting Started

### Prerequisites

*   Node.js (v16+)
*   npm

### Installation

1.  **Clone the repo**
    ```bash
    git clone https://github.com/RainGo111/FiCR.git
    cd FiCR
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run locally**
    ```bash
    npm run dev
    ```

    👉 **[Click here to open: http://localhost:5173](http://localhost:5173)**

---

## 📦 Project Structure

```bash
public/          # Static assets (ficr.ttl ontology file)
src/
├── components/  # React components
├── content/     # JSON configuration (siteConfig, demoConfig)
├── pages/       # Route pages
└── utils/       # RDF parsing utilities
```

## 📝 Customization

You can easily customize the content without touching the code:
*   **Site Info**: Edit `src/content/siteConfig.json` to change titles, descriptions, or authors.
*   **Ontology**: Replace `public/ficr.ttl` with your own Turtle file.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This portal implementation is available under the MIT License. The FiCR ontology itself retains its own licensing terms.

---
<div align="center">
  <sub>Built with ❤️ by the FiCR Team</sub>
</div>
