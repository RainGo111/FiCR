import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { Home, Documentation, QueryLab, Demo } from './pages';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/query-lab" element={<QueryLab />} />
          <Route path="/demo" element={<Demo />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
