import fs from 'node:fs/promises';
import path from 'node:path';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';

// Write output to file or stdout
export const writeOutputToDisk = async (output: string, config: RepomixConfigMerged): Promise<undefined> => {
  // Write to stdout
  if (config.output.stdout === true) {
    process.stdout.write(output);
    return;
  }

  // Normal case: write to file
  const outputPath = path.resolve(config.cwd, config.output.filePath);
  logger.trace(`Writing output to: ${outputPath}`);

  // Create output directory if it doesn't exist
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  await fs.writeFile(outputPath, output);
};
