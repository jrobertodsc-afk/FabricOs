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
import FichaTecnicaView from './pages/FichaTecnicaView';

import FeedbackWidget from './components/FeedbackWidget';
import { WarningCircle } from '@phosphor-icons/react';

function AppContent() {
  const { isLocked, errorMessage, loading, gracePeriodActive, graceDaysLeft } = useLicense();
  const isBackoffice = window.location.pathname.startsWith('/backoffice');
  const isLoginPage = window.location.pathname === '/login';

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
    <>
      {/* Aviso Global de Inadimplência (Carência) */}
      {gracePeriodActive && !isBackoffice && !isLoginPage && (
        <div className="bg-warning/20 border-b border-warning/50 text-warning px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2 z-[100] relative">
          <WarningCircle size={20} weight="fill" />
          Atenção: Sua fatura está vencida. Você tem {graceDaysLeft} {graceDaysLeft === 1 ? 'dia' : 'dias'} para regularizar antes da suspensão do sistema.
        </div>
      )}

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
          
          <Route path="/ficha/:id" element={<FichaTecnicaView />} />
        </Routes>
      </BrowserRouter>

      {/* Widget Flutuante de Feedback (Somente Produção e Logado) */}
      {!isBackoffice && !isLoginPage && <FeedbackWidget />}
    </>
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
