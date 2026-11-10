import { describe, expect, test } from 'vitest';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('parseFile for C/C++', () => {
  // Test for C++
  test('should parse C++ correctly', async () => {
    const fileContent = `
      // Main entry point
      /* The main function that outputs
       * a greeting to the world
       */
      int main() {
        std::cout << "Hello, world!"; return 0;
      }
    `;
    const filePath = 'dummy.cpp';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      '// Main entry point',
      '/* The main function that outputs',
      '* a greeting to the world',
      '*/',
      'int main() {',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse C++ header correctly', async () => {
    const fileContent = `
      // Header file main function
      /* This header declares the main function
       * for the program entry point
       */
      int main() { std::cout << "Hello, world!"; return 0; }
    `;
    const filePath = 'dummy.hpp';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = ['main', 'Header file main function', 'This header declares the main function'];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  // Test for C
  test('should parse C correctly', async () => {
    const fileContent = `
      /* The main function
       * Prints a greeting to stdout
       */
      // Entry point of the program
      int main() { printf("Hello, world!"); return 0; }
    `;
    const filePath = 'dummy.c';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = ['main', 'The main function', 'Prints a greeting to stdout', 'Entry point of the program'];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse C header correctly', async () => {
    const fileContent = `
      /* Header file for main function
       * Declares the program entry point
       */
      // Main function prototype
      int main() { printf("Hello, world!"); return 0; }
    `;
    const filePath = 'dummy.h';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'main',
      'Header file for main function',
      'Declares the program entry point',
      'Main function prototype',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
