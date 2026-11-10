declare module '@secretlint/secretlint-rule-preset-recommend' {
  import type { SecretLintRulePresetCreator } from '@secretlint/types';

  // Re-export as a preset creator without importing runtime Secretlint modules.
  export const creator: SecretLintRulePresetCreator;
}
