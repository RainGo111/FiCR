import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { Home, Documentation, Examples, Demo } from './pages';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/examples" element={<Examples />} />
          <Route path="/demo" element={<Demo />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
