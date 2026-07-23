import { describe, expect, test } from 'vitest';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../../tests/testing/testUtils.js';

describe('parseFile for Rust', () => {
  test('should parse Rust correctly', async () => {
    const fileContent = `
      // Module declaration
      mod greetings {
          // Trait definition
          pub trait Greeter {
              /// Says hello to someone
              fn greet(&self, name: &str) -> String;
          }

          // Struct definition
          #[derive(Debug)]
          pub struct SimpleGreeter {
              prefix: String
          }

          // Implementation block
          impl Greeter for SimpleGreeter {
              fn greet(&self, name: &str) -> String {
                  format!("{}, {}!", self.prefix, name)
              }
          }

          // Enum definition
          #[derive(Debug)]
          pub enum Language {
              English,
              Japanese,
              Spanish
          }

          // Main function
          fn main() {
              let greeter = SimpleGreeter {
                  prefix: String::from("Hello")
              };
              println!("{}", greeter.greet("World"));
          }
      }
    `;
    const filePath = 'dummy.rs';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'mod greetings {',
      'pub trait Greeter {',
      '// Says hello to someone',
      'fn greet(&self, name: &str) -> String {',
      'pub struct SimpleGreeter {',
      'impl Greeter for SimpleGreeter {',
      'pub enum Language {',
      'fn main() {',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
