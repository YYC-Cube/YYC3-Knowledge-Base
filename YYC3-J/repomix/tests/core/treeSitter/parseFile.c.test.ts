import { describe, expect, test } from 'vitest';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('parseFile for C', () => {
  test('should parse C correctly', async () => {
    const fileContent = `
      /**
       * A simple C program demonstrating various language features
       */
      #include <stdio.h>
      #include <stdlib.h>

      /* Define a constant */
      #define MAX_SIZE 100

      /**
       * Structure representing a person
       */
      struct Person {
        char* name;
        int age;
      };

      /**
       * Union for different number types
       */
      union Number {
        int i;
        float f;
        double d;
      };

      /**
       * Enum for status codes
       */
      enum Status {
        SUCCESS = 0,
        ERROR = 1,
        PENDING = 2
      };

      /* Type definition for a pointer to function returning int */
      typedef int (*IntFunctionPtr)(int, int);

      /**
       * Add two integers
       * @param a First integer
       * @param b Second integer
       * @return Sum of a and b
       */
      int add(int a, int b) {
        // Add two numbers
        return a + b;
      }

      /**
       * Main function
       * @return Exit status
       */
      int main(int argc, char** argv) {
        // Create a person
        struct Person person;
        person.name = "John";
        person.age = 30;

        // Print info
        printf("Name: %s, Age: %d\\n", person.name, person.age);

        // Use union
        union Number num;
        num.i = 42;
        printf("Integer: %d\\n", num.i);

        // Function pointer
        IntFunctionPtr operation = add;
        printf("Result: %d\\n", operation(5, 3));

        return SUCCESS;
      }
    `;
    const filePath = 'sample.c';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      // Comments
      'A simple C program demonstrating various language features',
      'Define a constant',

      // Struct
      'struct Person',
      'Structure representing a person',

      // Union
      'Union for different number types',

      // Enum
      'enum Status',
      'Enum for status codes',

      // Type definition comment
      'Type definition for a pointer to function returning int',

      // Functions
      'int add(int a, int b)',
      'Add two integers',
      '@param a First integer',
      '@param b Second integer',
      '@return Sum of a and b',

      // Main function
      'int main(int argc, char** argv)',
      'Main function',
      '@return Exit status',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should handle function declarations and definitions', async () => {
    const fileContent = `
      /* Function declaration */
      void print_message(const char* message);

      /* Function definition */
      int calculate_sum(int values[], int count) {
        int sum = 0;
        for (int i = 0; i < count; i++) {
          sum += values[i];
        }
        return sum;
      }

      /* Function with no params */
      void init(void) {
        // Initialize something
      }
    `;
    const filePath = 'functions.c';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'Function declaration',
      'Function definition',
      'int calculate_sum(int values[], int count)',
      'Function with no params',
      'void init(void)',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should handle complex type definitions', async () => {
    const fileContent = `
      /* Simple typedef */
      typedef unsigned long size_t;

      /* Struct typedef */
      typedef struct {
        double x;
        double y;
      } Point;

      /* Enum typedef */
      typedef enum {
        RED,
        GREEN,
        BLUE
      } Color;

      /* Function pointer typedef */
      typedef void (*Callback)(void* data);

      /* Array typedef */
      typedef char String[256];
    `;
    const filePath = 'types.c';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'Simple typedef',
      'Struct typedef',
      'Enum typedef',
      'Function pointer typedef',
      'Array typedef',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
