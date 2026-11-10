import { describe, expect, test } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';

describe('parseFile for Ruby', () => {
  test('should parse Ruby correctly', async () => {
    const fileContent = `
      # User module for handling user-related functionality
      module User
        # Constants for user status
        ACTIVE = 1
        INACTIVE = 0

        # Person class represents a human user
        class Person
          attr_accessor :name, :age

          # Initialize a new person
          # @param name [String] the person's name
          # @param age [Integer] the person's age
          def initialize(name, age)
            @name = name
            @age = age
          end

          # Return a greeting
          # @return [String] a personalized greeting
          def greet
            "Hello, I'm #{@name} and I'm #{@age} years old!"
          end

          # A class method to create a Person
          def self.create(name, age)
            new(name, age)
          end
        end

        # Create a module method
        def self.find_by_name(name)
          # Implementation
        end
      end

      # Include external libraries
      require 'json'
      require_relative './helpers'

      # Create a user and greet
      person = User::Person.new("John", 30)
      puts person.greet
    `;
    const filePath = 'sample.rb';
    const config = {};
    const result = await parseFile(fileContent, filePath, config as RepomixConfigMerged);
    expect(typeof result).toBe('string');

    const expectContents = [
      // Module comment
      'User module for handling user-related functionality',

      // Module definition
      'module User',

      // Constants
      'ACTIVE = 1',
      'INACTIVE = 0',

      // Class comment
      'Person class represents a human user',

      // Class definition
      'class Person',
      'attr_accessor :name, :age',

      // Method comments
      'Initialize a new person',
      "@param name [String] the person's name",
      "@param age [Integer] the person's age",

      // Method definitions
      'def initialize(name, age)',
      'def greet',
      'def self.create(name, age)',

      // Module method
      'def self.find_by_name(name)',

      // Require statements
      "require 'json'",
      "require_relative './helpers'",
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should handle single class with inheritance', async () => {
    const fileContent = `
      class Admin < User
        # Admin has higher privileges
        def admin?
          true
        end
      end
    `;
    const filePath = 'admin.rb';
    const config = {};
    const result = await parseFile(fileContent, filePath, config as RepomixConfigMerged);
    expect(typeof result).toBe('string');

    const expectContents = ['class Admin < User', 'Admin has higher privileges', 'def admin?'];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should handle different comment styles', async () => {
    const fileContent = `
      # This is a regular comment
      class Example
        # This is a documentation comment
        # with multiple lines
        def method_with_comment
          # In-method comment
          puts "Hello"
        end

        =begin
        This is a multi-line comment block
        that can span multiple lines
        =end
        def another_method
          puts "World"
        end
      end
    `;
    const filePath = 'comments.rb';
    const config = {};
    const result = await parseFile(fileContent, filePath, config as RepomixConfigMerged);
    expect(typeof result).toBe('string');

    const expectContents = [
      'This is a regular comment',
      '# This is a documentation comment',
      '# with multiple lines',
      'In-method comment',
      'This is a multi-line comment block',
      'that can span multiple lines',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should handle singleton methods and module mixins', async () => {
    const fileContent = `
      module Loggable
        def log(message)
          puts "[LOG] #{message}"
        end
      end

      class Service
        include Loggable
        extend Comparable

        # Singleton method
        def self.fetch_data
          # Implementation
        end

        # Instance method
        def process
          log("Processing...")
        end
      end

      # Monkey patching an existing class
      class String
        def palindrome?
          self == self.reverse
        end
      end
    `;
    const filePath = 'service.rb';
    const config = {};
    const result = await parseFile(fileContent, filePath, config as RepomixConfigMerged);
    expect(typeof result).toBe('string');

    const expectContents = [
      'module Loggable',
      'def log(message)',
      'class Service',
      'Singleton method',
      'def self.fetch_data',
      'Instance method',
      'def process',
      'class String',
      'def palindrome?',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
