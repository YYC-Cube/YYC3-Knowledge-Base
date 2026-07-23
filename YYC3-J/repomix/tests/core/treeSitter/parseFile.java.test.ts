import { describe, expect, test } from 'vitest';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../../tests/testing/testUtils.js';

describe('parseFile for Java', () => {
  test('should parse Java correctly', async () => {
    const fileContent = `
      /**
       * A simple Hello World class
       */
      public class HelloWorld {
        /**
         * Main entry point
         * @param args command line arguments
         */
        public static void main(String[] args) {
          System.out.println("Hello, world!");
        }
      }
    `;
    const filePath = 'dummy.java';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      '/**',
      '* A simple Hello World class',
      '*/',
      'public class HelloWorld {',
      '* Main entry point',
      '* @param args command line arguments',
      'public static void main(String[] args) {',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
