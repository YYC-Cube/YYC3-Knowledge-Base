import { describe, expect, test } from 'vitest';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('parseFile for Python', () => {
  const defaultConfig = createMockConfig({});

  test('should parse basic Python correctly', async () => {
    const fileContent = `
      # Python greeting function
      '''
      A simple greeting function that prints a hello message
      Args:
          name: The name to greet
      '''
      def greet(name): print(f"Hello, {name}")
    `;
    const filePath = 'dummy.py';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'greet',
      'Python greeting function',
      'A simple greeting function',
      'Args:',
      'name: The name to greet',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse class with decorators and inheritance', async () => {
    const fileContent = `
      @dataclass
      @register
      class UserModel(BaseModel):
          name: str
          age: int
    `;

    const result = await parseFile(fileContent, 'example.py', defaultConfig);

    const expectContents = ['@dataclass', '@register', 'class UserModel(BaseModel)'];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse function with decorators and type annotations', async () => {
    const fileContent = `
      @route("/users")
      @authenticate
      def get_users(page: int = 1, limit: int = 10) -> List[User]:
          return users[page:limit]
    `;

    const result = await parseFile(fileContent, 'example.py', defaultConfig);

    const expectContents = [
      '@route("/users")',
      '@authenticate',
      'def get_users(page: int = 1, limit: int = 10) -> List[User]',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse docstring', async () => {
    const fileContent = `
      """
      This is a docstring
      with multiple lines
      """
    `;

    const result = await parseFile(fileContent, 'example.py', defaultConfig);

    const expectContents = ['This is a docstring', 'with multiple lines'];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse comments', async () => {
    const fileContent = '# This is a single line comment';

    const result = await parseFile(fileContent, 'example.py', defaultConfig);

    const expectContents = ['# This is a single line comment'];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse type aliases', async () => {
    const fileContent = `
      UserId = int
      Result = Union[Success, Error]
    `;

    const result = await parseFile(fileContent, 'example.py', defaultConfig);

    const expectContents = ['UserId = int', 'Result = Union[Success, Error]'];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
