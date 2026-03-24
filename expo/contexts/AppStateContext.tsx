import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';

type LoadingState = 
  | 'idle'
  | 'initial_loading'
  | 'fetching_data'
  | 'sending_data'
  | 'processing_request';

type ErrorState = {
  errorCode: string;
  errorMessage?: string;
  module?: string;
} | null;

export const [AppStateProvider, useAppState] = createContextHook(() => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [errorState, setErrorState] = useState<ErrorState>(null);
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null);

  const startOperation = useCallback((operation: string, state: LoadingState = 'processing_request') => {
    console.log(`[AppState] Starting operation: ${operation}`);
    setOperationInProgress(operation);
    setLoadingState(state);
    setErrorState(null);
  }, []);

  const endOperation = useCallback(() => {
    console.log(`[AppState] Ending operation: ${operationInProgress || 'unknown'}`);
    setOperationInProgress(null);
    setLoadingState('idle');
  }, [operationInProgress]);

  const setError = useCallback((error: { errorCode: string; errorMessage?: string; module?: string }) => {
    console.log(`[AppState] Error: ${error.errorCode}`, error.errorMessage);
    setErrorState(error);
    setLoadingState('idle');
    setOperationInProgress(null);
  }, []);

  const clearError = useCallback(() => {
    console.log('[AppState] Clearing error');
    setErrorState(null);
  }, []);

  const isLoading = useMemo(() => loadingState !== 'idle', [loadingState]);

  return useMemo(() => ({
    loadingState,
    errorState,
    operationInProgress,
    isLoading,
    startOperation,
    endOperation,
    setError,
    clearError,
  }), [
    loadingState,
    errorState,
    operationInProgress,
    isLoading,
    startOperation,
    endOperation,
    setError,
    clearError,
  ]);
});
