import React, { createContext, useContext } from 'react';
import { SnackbarProvider, useSnackbar, VariantType } from 'notistack';

interface ToastContextType {
  showToast: (message: string, severity?: VariantType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => console.warn('ToastContext not initialized')
});

const InnerToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar();

  const showToast = (message: string, variant: VariantType = 'default') => {
    enqueueSnackbar(message, { 
      variant,
      anchorOrigin: { vertical: 'top', horizontal: 'center' },
      autoHideDuration: 3000
    });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SnackbarProvider maxSnack={3}>
      <InnerToastProvider>
        {children}
      </InnerToastProvider>
    </SnackbarProvider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};