import { describe, expect, test } from 'vitest';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('parseFile comment support', () => {
  // Test for JavaScript/TypeScript comments
  test('should parse all types of JavaScript/TypeScript comments', async () => {
    const fileContent = [
      '// Single line comment',
      '/* Multi-line comment',
      '   spanning multiple lines */',
      'function func1() {}',
      '',
      '/**',
      ' * JSDoc documentation',
      ' * @param {string} name - The name parameter',
      ' * @returns {void}',
      ' */',
      'function func2(name) {}',
      '',
      '/** Single line JSDoc */',
      'const x = 1;',
    ].join('\n');

    const filePath = 'test.ts';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'Single line comment',
      'Multi-line comment',
      'JSDoc documentation',
      '@param {string} name - The name parameter',
      '@returns {void}',
      'Single line JSDoc',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  // Test for Python comments
  test('should parse all types of Python comments', async () => {
    const fileContent = [
      '# Single line comment',
      "'''",
      'Multi-line docstring',
      'with multiple lines',
      "'''",
      'def func1(): pass',
      '',
      '"""',
      'Double quote docstring',
      'with indentation',
      '    indented line',
      '"""',
      'def func2(): pass',
    ].join('\n');

    const filePath = 'test.py';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = ['Single line comment', 'Multi-line docstring', 'Double quote docstring', 'indented line'];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  // Test for Java comments
  test('should parse all types of Java comments', async () => {
    const fileContent = [
      '// Single line comment',
      '/* Multi-line comment',
      '   spanning multiple lines */',
      'public class Test {',
      '    /**',
      '     * JavaDoc for class field',
      '     */',
      '    private int field;',
      '',
      '    /**',
      '     * JavaDoc for method',
      '     * @param name The name parameter',
      '     * @return A greeting message',
      '     * @throws Exception If something goes wrong',
      '     */',
      '    public String greet(String name) {',
      '        return "Hello";',
      '    }',
      '}',
    ].join('\n');

    const filePath = 'test.java';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'Single line comment',
      'Multi-line comment',
      'JavaDoc for class field',
      'JavaDoc for method',
      '@param name The name parameter',
      '@return A greeting message',
      '@throws Exception If something goes wrong',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  // Test for C# comments
  test('should parse all types of C# comments', async () => {
    const fileContent = [
      '// Single line comment',
      '/* Multi-line comment',
      '   spanning multiple lines */',
      '',
      '/// <summary>',
      '/// XML documentation for class',
      '/// </summary>',
      'public class Test {',
      '    /// <summary>',
      '    /// Property documentation',
      '    /// </summary>',
      '    /// <value>The value description</value>',
      '    public int Property { get; set; }',
      '}',
    ].join('\n');

    const filePath = 'test.cs';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'Single line comment',
      'Multi-line comment',
      'XML documentation for class',
      'Property documentation',
      '<value>The value description</value>',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  // Test for Rust comments
  test('should parse all types of Rust comments', async () => {
    const fileContent = [
      '// Single line comment',
      '/* Multi-line comment',
      '   spanning multiple lines */',
      '',
      '//! Module documentation',
      '',
      '/// Documentation for struct',
      'struct Test {',
      '    /// Field documentation',
      '    field: i32',
      '}',
    ].join('\n');

    const filePath = 'test.rs';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'Single line comment',
      'Multi-line comment',
      'Module documentation',
      'Documentation for struct',
      'Field documentation',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  // Test for Ruby comments
  test('should parse all types of Ruby comments', async () => {
    const fileContent = [
      '# Single line comment',
      'def func1',
      'end',
      '',
      '# Documentation comment',
      '# @param name [String] The name',
      '# @return [void]',
      'def func2(name)',
      'end',
      '',
      '=begin',
      'Multi-line comment block',
      'using =begin/=end syntax',
      '=end',
      'def func3',
      'end',
    ].join('\n');

    const filePath = 'test.rb';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'Single line comment',
      'Documentation comment',
      '@param name [String] The name',
      '@return [void]',
      'Multi-line comment block',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
