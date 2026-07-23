import { describe, expect, test } from 'vitest';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('parseFile for Go', () => {
  test('should parse Go correctly', async () => {
    const fileContent = `
      // Package main is the entry point
      package main

      import (
        "fmt"
        "os"
      )

      // User represents a person
      type User struct {
        Name string
        Age  int
      }

      // Greeter is something that can greet
      type Greeter interface {
        Greet() string
      }

      // Constants
      const (
        MaxUsers = 100
        Version  = "1.0.0"
      )

      // Variables
      var (
        debugMode = false
        logLevel  = "info"
      )

      // SayHello prints a greeting message
      func SayHello(name string) {
        fmt.Printf("Hello, %s!\\n", name)
      }

      // Greet implements the Greeter interface
      func (u User) Greet() string {
        return fmt.Sprintf("Hello, I'm %s!", u.Name)
      }

      // Main entry point
      func main() {
        user := User{Name: "John", Age: 30}
        fmt.Println(user.Greet())
        SayHello(os.Args[1])
      }
    `;
    const filePath = 'sample.go';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      // Package declaration
      'package main',
      'Package main is the entry point',

      // Imports
      'import (',
      '"fmt"',
      '"os"',

      // Struct definition
      'type User struct',
      'User represents a person',
      'Name string',
      'Age  int',

      // Interface definition
      'type Greeter interface',
      'Greeter is something that can greet',
      'Greet() string',

      // Constants
      'const (',
      'MaxUsers = 100',
      'Version  = "1.0.0"',

      // Variables
      'var (',
      'debugMode = false',
      'logLevel  = "info"',

      // Functions
      'func SayHello(name string)',
      'SayHello prints a greeting message',

      // Methods
      'func (u User) Greet() string',
      'Greet implements the Greeter interface',

      // Main function
      'func main()',
      'Main entry point',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should handle single imports', async () => {
    const fileContent = `
      package main

      import "fmt"

      func main() {
        fmt.Println("Hello, world!")
      }
    `;
    const filePath = 'simple.go';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = ['import "fmt"', 'func main()'];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should handle different comment styles', async () => {
    const fileContent = `
      // This is a line comment
      package main

      /* This is a block comment
         spanning multiple lines */
      func main() {
        // Inside function comment
        fmt.Println("Hello")
      }
    `;
    const filePath = 'comments.go';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'This is a line comment',
      'This is a block comment\n         spanning multiple lines',
      'Inside function comment',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should handle type aliases', async () => {
    const fileContent = `
      package main

      // UserID is a type alias for integer
      type UserID int

      // Result is a type alias for map
      type Result map[string]interface{}
    `;
    const filePath = 'types.go';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'type UserID int',
      'UserID is a type alias for integer',
      'type Result map[string]interface{}',
      'Result is a type alias for map',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
