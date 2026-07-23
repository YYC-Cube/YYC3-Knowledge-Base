import { describe, expect, test } from 'vitest';
import { buildCliConfig } from '../../../src/cli/actions/defaultAction.js';
import type { CliOptions } from '../../../src/cli/types.js';

describe('Diffs Flag in CLI', () => {
  test('should set includeDiffs to true when --include-diffs flag is provided', () => {
    const options: CliOptions = {
      includeDiffs: true,
    };

    const config = buildCliConfig(options);

    expect(config.output?.git?.includeDiffs).toBe(true);
  });

  test('should not set includeDiffs when --include-diffs flag is not provided', () => {
    const options: CliOptions = {};

    const config = buildCliConfig(options);

    expect(config.output?.git?.includeDiffs).toBeUndefined();
  });

  test('should include other git options when provided alongside --include-diffs', () => {
    const options: CliOptions = {
      includeDiffs: true,
      gitSortByChanges: false,
    };

    const config = buildCliConfig(options);

    expect(config.output?.git?.includeDiffs).toBe(true);
    expect(config.output?.git?.sortByChanges).toBe(false);
  });
});
