import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import PartnerPortal from './pages/PartnerPortal';
import Login from './pages/Login';
import TrackWithdrawal from './pages/TrackWithdrawal';
import MobileDashboard from './pages/MobileDashboard';
import MobileNfeReader from './pages/MobileNfeReader';
import MobileReparto from './pages/MobileReparto';
import MobileRfidShowroom from './pages/MobileRfidShowroom';
import MobileDispatch from './pages/MobileDispatch';
import MobileReceive from './pages/MobileReceive';
import MobileScheduling from './pages/MobileScheduling';
import MobileQrScanner from './pages/MobileQrScanner';

import BackofficeDashboard from './pages/BackofficeDashboard';
import LicenseLockScreen from './pages/LicenseLockScreen';

import { ToastProvider } from './contexts/ToastContext';
import { LicenseProvider, useLicense } from './contexts/LicenseContext';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
  const { isLocked, errorMessage, loading } = useLicense();
  const isBackoffice = window.location.pathname.startsWith('/backoffice');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B10] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isLocked && !isBackoffice) {
    return <LicenseLockScreen errorMessage={errorMessage} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/mobile" element={<MobileDashboard />} />
          <Route path="/mobile/nfe" element={<MobileNfeReader />} />
          <Route path="/mobile/reparto" element={<MobileReparto />} />
          <Route path="/mobile/showroom" element={<MobileRfidShowroom />} />
          <Route path="/mobile/dispatch" element={<MobileDispatch />} />
          <Route path="/mobile/recebimento" element={<MobileReceive />} />
          <Route path="/mobile/scheduling" element={<MobileScheduling />} />
          <Route path="/mobile/scanner" element={<MobileQrScanner />} />
        </Route>

        {/* Public Routes */}
        <Route path="/login" element={<Login onLoginSuccess={() => { window.location.href = '/'; }} />} />
        <Route path="/portal/:token" element={<PartnerPortal />} />
        <Route path="/track/:code" element={<TrackWithdrawal />} />

        {/* Backoffice Route - Seguro por Token de Admin e isolamento no Backend */}
        <Route path="/backoffice" element={<BackofficeDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ToastProvider>
      <LicenseProvider>
        <AppContent />
      </LicenseProvider>
    </ToastProvider>
  );
}

export default App;
