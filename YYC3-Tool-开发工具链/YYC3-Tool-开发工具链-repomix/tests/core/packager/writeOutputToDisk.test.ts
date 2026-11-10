import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { writeOutputToDisk } from '../../../src/core/packager/writeOutputToDisk.js';

vi.mock('node:fs/promises');
vi.mock('../../shared/logger');

describe('writeOutputToDisk', () => {
  let originalStdoutWrite: typeof process.stdout.write;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = vi.fn();
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
  });

  it('should write output to the specified file path', async () => {
    const output = 'test output';
    const config: RepomixConfigMerged = {
      cwd: '/test/directory',
      output: { filePath: 'output.txt' },
    } as RepomixConfigMerged;

    const outputPath = path.resolve(config.cwd, config.output.filePath);

    await writeOutputToDisk(output, config);

    expect(fs.writeFile).toHaveBeenCalledWith(outputPath, output);
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it('should write to stdout if stdout is true', async () => {
    const output = 'test output';
    const config: RepomixConfigMerged = {
      cwd: '/test/directory',
      output: { stdout: true },
    } as RepomixConfigMerged;

    await writeOutputToDisk(output, config);

    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(process.stdout.write).toHaveBeenCalledWith(output);
  });
});
