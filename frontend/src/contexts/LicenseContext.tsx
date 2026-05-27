import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getLicenseStatus } from '../services/api';
import type { LicenseStatusResponse } from '../services/api';
import api from '../services/api';

interface LicenseContextType {
  isLocked: boolean;
  errorMessage: string;
  enabledModules: string[];
  currentVersion: string;
  loading: boolean;
  gracePeriodActive: boolean;
  graceDaysLeft: number;
  refreshLicense: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export const LicenseProvider = ({ children }: { children: ReactNode }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [loading, setLoading] = useState(true);
  const [gracePeriodActive, setGracePeriodActive] = useState(false);
  const [graceDaysLeft, setGraceDaysLeft] = useState(0);

  const refreshLicense = async () => {
    const token = localStorage.getItem('fabricos_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await getLicenseStatus();
      setIsLocked(data.is_locked);
      setEnabledModules(data.enabled_modules || []);
      setCurrentVersion(data.current_version || '1.0.0');
      setGracePeriodActive(data.grace_period_active || false);
      setGraceDaysLeft(data.grace_days_left || 0);
      
      if (data.is_locked) {
        setErrorMessage("Instância suspensa por pendências financeiras ou expiração. Entre em contato com a FabricOS.");
      } else {
        setErrorMessage("");
      }
    } catch (error: any) {
      // Se a chamada de status der 403, significa que o sistema já bloqueou no middleware local
      if (error.response?.status === 403) {
        setIsLocked(true);
        const detail = error.response?.data?.detail || "Instância suspensa por pendências financeiras ou expiração.";
        setErrorMessage(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  // 1. Sincroniza a licença ao montar o componente
  useEffect(() => {
    refreshLicense();

    // Loop de ping a cada 20 segundos para detectar kill-switch remoto em tempo real
    const interval = setInterval(() => {
      refreshLicense();
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // 2. Interceptador global do Axios para forçar Lockdown em caso de erro 403 de licença em outras APIs
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 403) {
          const detail = error.response.data?.detail || "";
          if (
            detail.includes("Instância suspensa") || 
            detail.includes("Licença expirada") || 
            detail.includes("não licenciado") ||
            detail.includes("Chave de licença local corrompida")
          ) {
            setIsLocked(true);
            setErrorMessage(detail);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <LicenseContext.Provider 
      value={{ 
        isLocked, 
        errorMessage, 
        enabledModules, 
        currentVersion, 
        loading, 
        gracePeriodActive,
        graceDaysLeft,
        refreshLicense 
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
};

export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
};
