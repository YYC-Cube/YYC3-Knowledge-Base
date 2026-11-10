/**
 * @description useYYC3 Hook
 * @module @yyc3/web-ui/hooks/use-yyc3
 */

import { useYYC3Context } from '../provider';

export function useYYC3() {
  const { hub, initialized, error } = useYYC3Context();

  return {
    hub,
    initialized,
    error,
    isReady: initialized && !error && hub !== null,
  };
}
