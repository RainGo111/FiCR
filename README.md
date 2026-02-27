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

This platform provides:
- An interactive **Ontology Browser** over the raw `.ttl` ontology files
- A **SPARQL Query Lab** for live querying against a GraphDB knowledge graph
- A **FiCR Chatbot** powered by LLM that takes building survey JSON and produces fire compliance reports through an automated pipeline
- A **Fire Risk Report** page with compliance analysis results

---

## ✨ Core Modules

### 🔍 Ontology Browser (Documentation)
An interactive, searchable index of all classes and properties defined in the FiCR namespace.
*   **Class Hierarchy**: View parent-child relationships.
*   **Property Definitions**: Detailed domain and range specifications.
*   **Smart Search**: Instantly find terms without browsing the entire tree.

### 🧪 SPARQL Query Lab
Direct programmatic access to the FiCR Knowledge Graph via GraphDB.
*   **Preset Queries**: Curated SPARQL queries organized by module (Inventory, Compliance, Risk).
*   **Custom Editor**: Write and execute your own SPARQL queries.
*   **Live Results**: Interactive results table with URI shortening.

### 🤖 FiCR Chatbot
An LLM-powered fire compliance analysis pipeline with a chat interface.
*   **Upload** a building survey JSON file (e.g., `duplex_a_survey.json`).
*   **Automated Pipeline**: Validate JSON → Build RDF knowledge graph → Run 14 SPARQL compliance queries → Generate LLM report.
*   **Streaming Output**: Report is streamed in real-time from the LLM.
*   **Download**: Export the generated report as a `.md` file.
*   **Multi-LLM Support**: Choose from Claude, OpenAI, Gemini, DeepSeek, or Zhipu GLM.

### 📊 Fire Risk Report
A pre-computed compliance report page driven by live GraphDB data.
*   **KPI Metrics**: Color-coded compliance rates.
*   **Print-to-PDF**: Generate printable reports.

### 🗺️ Roadmap
Product roadmap with capability preview.

---

## 🛠️ Getting Started

### Prerequisites
*   **Node.js** (v16+) and **npm** — for the frontend
*   **Python** (3.10+) and **pip** — for the chatbot backend
*   At least **one LLM API key** (Anthropic, OpenAI, Google, DeepSeek, or Zhipu GLM) — for the chatbot

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/RainGo111/FiCR.git
    cd FiCR
    ```

2.  **Install frontend dependencies**
    ```bash
    npm install
    ```

3.  **Install backend dependencies**
    ```bash
    cd backend
    pip install -r requirements.txt
    ```

4.  **Configure LLM API keys**
    ```bash
    # In the backend/ directory:
    cp .env.example .env
    # Edit .env and add at least one API key
    ```

### Running Locally

You need **two terminals** to run the full application:

**Terminal 1 — Backend (Python FastAPI)**
```bash
cd backend
uvicorn server:app --port 8000 --reload
```

**Terminal 2 — Frontend (Vite)**
```bash
npm run dev
```

Then open **http://localhost:5173** in your browser.

### Using the Chatbot

1.  Navigate to the **FiCR Chatbot** page.
2.  Select an LLM provider and model from the toolbar dropdown.
3.  Load a sample survey (e.g., "Duplex A") or paste/upload your own survey JSON.
4.  Click **Analyze** — the pipeline will:
    - Validate the survey JSON against the `ficr-survey-v1` schema
    - Convert it to an RDF knowledge graph (ABox)
    - Run 14 SPARQL compliance queries against the merged TBox + regulatory config
    - Stream a fire compliance report from the selected LLM
5.  Once complete, click **Download Report (.md)** to save.

> **Note**: The chatbot requires the Python backend to be running locally. The static pages (Documentation, Roadmap) work without the backend. The Query Lab and Report pages require a running GraphDB instance.

---

## 📦 Project Structure

```
├── public/                          # Static ontology files
│   ├── ficr_tbox_0.13.0.ttl        # FiCR ontology (TBox)
│   └── ficr_demo_0.13.0.ttl        # Demo instance data
├── src/                             # React frontend
│   ├── components/
│   │   ├── chatbot/                 # Chat UI components
│   │   ├── documentation/           # Ontology browser components
│   │   ├── layout/                  # Header, Footer, Layout
│   │   └── shared/                  # Card, Button, CodeBlock, etc.
│   ├── pages/                       # Route pages
│   │   ├── Home.tsx
│   │   ├── Documentation.tsx
│   │   ├── QueryLab.tsx
│   │   ├── Chatbot.tsx              # LLM chatbot page
│   │   ├── Report.tsx
│   │   └── Roadmap.tsx
│   ├── content/                     # Site config, preset queries
│   ├── hooks/                       # Custom React hooks
│   └── utils/                       # TTL/RDF parsers
├── backend/                         # Python pipeline backend
│   ├── server.py                    # FastAPI server (SSE streaming)
│   ├── pipeline.py                  # 4-stage pipeline orchestrator
│   ├── ficr_json_to_rdf.py         # Stage 2: JSON → RDF converter
│   ├── ficr_sparql_runner.py        # Stage 3: SPARQL query executor
│   ├── prompts/                     # LLM system prompts
│   ├── schemas/                     # JSON Schema (ficr-survey-v1)
│   ├── references/                  # TBox, regulatory config, SPARQL queries, sample data
│   ├── tests/                       # Schema & SPARQL tests
│   ├── requirements.txt             # Python dependencies
│   └── .env.example                 # API key template
├── supabase/                        # Supabase edge functions
├── .github/workflows/deploy.yml     # GitHub Pages deployment
├── package.json                     # Node.js dependencies
├── vite.config.ts                   # Vite config with API proxies
└── tailwind.config.js               # Tailwind CSS theme
```

---

## 🔧 Configuration

### Frontend Environment (`.env` in project root)
```env
GRAPHDB_URL=http://localhost:7200/repositories/FiCR
GRAPHDB_USER=admin
GRAPHDB_PASS=root
CHATBOT_API_URL=http://localhost:8000
```

### Backend Environment (`backend/.env`)
Copy from `backend/.env.example` and add your API keys:
```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AI...
DEEPSEEK_API_KEY=sk-...
GLM_API_KEY=...
```

You only need **one** provider configured to use the chatbot.

---

## 📄 License & Acknowledgments

**FiCR Ontology Authors**:
*   Maxime Lefrançois
*   Pieter Pauwels
*   Georg Ferdinand Schneider
*   Mads Holten Rasmussen

*Portal implementation is licensed under MIT. Ontology content retains its original license.*
