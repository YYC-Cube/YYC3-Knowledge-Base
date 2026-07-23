/**
 * @description YYC³ Provider - React Context Provider
 * @module @yyc3/web-ui/provider
 */
import React, { createContext, useContext } from 'react';
import { YYC3Hub } from '@yyc3/core';
const YYC3Context = createContext({
    hub: null,
    initialized: false,
    error: null,
});
export function YYC3Provider({ children, config }) {
    const [hub, setHub] = React.useState(null);
    const [initialized, setInitialized] = React.useState(false);
    const [error, setError] = React.useState(null);
    React.useEffect(() => {
        const initHub = async () => {
            try {
                const newHub = new YYC3Hub(config);
                await newHub.initialize();
                setHub(newHub);
                setInitialized(true);
            }
            catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to initialize'));
            }
        };
        initHub();
    }, [config]);
    return React.createElement(YYC3Context.Provider, { value: { hub, initialized, error } }, children);
}
export function useYYC3Context() {
    return useContext(YYC3Context);
}
//# sourceMappingURL=provider.js.map