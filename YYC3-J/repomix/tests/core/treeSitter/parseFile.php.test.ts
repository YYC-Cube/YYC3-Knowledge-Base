import { describe, expect, test } from 'vitest';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../../tests/testing/testUtils.js';

describe('parseFile for PHP', () => {
  test('should parse PHP correctly', async () => {
    const fileContent = `
<?php

namespace App;

use App\\Greeter;

// Define the greeting function
function greet($name) {
    // Print the personalized greeting message
    echo "Hello, " . $name . "!";
}

// Execute the greeting function
greet("John");

interface Greeter {
  public function greet($name);
}

final class GreeterImpl implements Greeter {
  public function greet($name) {
    echo "Hello, " . $name . "!";
  }
}

trait GreeterTrait {
  public function greet($name) {
    echo "Hello, " . $name . "!";
  }
}

/**
 * Greeting function
 * @param name The name to greet
 * @return string The greeting message
 */
enum GreeterEnum: string {
  case GREET = "Hello, %s!";
}

?>
`;
    const filePath = 'dummy.php';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');
    const expectContents = [
      'namespace App;',
      'use App\\Greeter;',
      'function greet($name) {',
      '// Define the greeting function',
      '// Print the personalized greeting message',
      '// Execute the greeting function',
      'interface Greeter {',
      'public function greet($name) {',
      'final class GreeterImpl implements Greeter {',
      'public function greet($name) {',
      'trait GreeterTrait {',
      'public function greet($name) {',
      '/**',
      '* Greeting function',
      '* @param name The name to greet',
      '* @return string The greeting message',
      '*/',
      'enum GreeterEnum: string {',
    ];
    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
