import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import PartnerPortal from './pages/PartnerPortal';
import Login from './pages/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('fabricos_token');
    setIsAuthenticated(!!token);
  }, []);

  if (isAuthenticated === null) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login onLoginSuccess={() => setIsAuthenticated(true)} /> : <Navigate to="/" />} 
        />
        <Route path="/portal/:token" element={<PartnerPortal />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
