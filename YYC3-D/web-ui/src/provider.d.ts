/**
 * @description YYC³ Provider - React Context Provider
 * @module @yyc3/web-ui/provider
 */
import { type ReactNode } from 'react';
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
export declare function YYC3Provider({ children, config }: YYC3ProviderProps): JSX.Element;
export declare function useYYC3Context(): YYC3ContextValue;
export {};
//# sourceMappingURL=provider.d.ts.map