import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { Home, Documentation, QueryLab, Report, Chatbot, Roadmap } from './pages';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/query-lab" element={<QueryLab />} />
          <Route path="/chatbot" element={<Chatbot />} />
          <Route path="/report" element={<Report />} />
          <Route path="/roadmap" element={<Roadmap />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
