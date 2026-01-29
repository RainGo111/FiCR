import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { Home, Documentation, Reference, Examples, Demo } from './pages';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/reference" element={<Reference />} />
          <Route path="/examples" element={<Examples />} />
          <Route path="/demo" element={<Demo />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
