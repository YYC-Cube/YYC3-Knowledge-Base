/**
 * @description YYC³ Provider - React Context Provider
 * @module @yyc3/web-ui/provider
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import { YYC3Hub, type HubConfig } from '@yyc3/core';

export interface YYC3ProviderProps {
  children: ReactNode;
  config?: HubConfig;
}

interface YYC3ContextValue {
  hub: YYC3Hub | null;
  initialized: boolean;
  error: Error | null;
}

const YYC3Context = createContext<YYC3ContextValue>({
  hub: null,
  initialized: false,
  error: null,
});

export function YYC3Provider({ children, config }: YYC3ProviderProps): JSX.Element {
  const [hub, setHub] = React.useState<YYC3Hub | null>(null);
  const [initialized, setInitialized] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const initHub = async () => {
      try {
        const newHub = new YYC3Hub(config);
        await newHub.initialize();
        setHub(newHub);
        setInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
      }
    };

    initHub();
  }, [config]);

  return React.createElement(
    YYC3Context.Provider,
    { value: { hub, initialized, error } },
    children
  );
}

export function useYYC3Context(): YYC3ContextValue {
  return useContext(YYC3Context);
}
