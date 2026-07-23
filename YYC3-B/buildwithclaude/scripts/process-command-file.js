#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get command line arguments
const [,, inputFile, outputFile, category] = process.argv;

if (!inputFile || !outputFile || !category) {
  console.error('Usage: process-command-file.js <input> <output> <category>');
  process.exit(1);
}

// Read the input file
const content = fs.readFileSync(inputFile, 'utf8');

// Extract title and description from content
function extractInfo(content) {
  const lines = content.split('\n');
  let title = '';
  let description = '';
  let hasTitle = false;
  
  // First, check if there's a heading
  for (const line of lines) {
    if (line.startsWith('#')) {
      title = line.replace(/^#+\s*/, '').trim();
      hasTitle = true;
      break;
    }
  }
  
  // If no heading, use filename
  if (!title) {
    const filename = path.basename(inputFile, '.md');
    title = filename.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  
  // Extract description - look for the first meaningful text
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines, headings, code blocks
    if (!line || line.startsWith('#') || line.startsWith('```') || line.startsWith('---')) {
      continue;
    }
    
    // Skip lines that are just instructions or commands
    if (line.startsWith('Follow') || line.startsWith('1.') || line.startsWith('-') || line.startsWith('*')) {
      // For act.md special case
      if (line.includes('RED-GREEN-REFACTOR')) {
        description = 'Follow RED-GREEN-REFACTOR cycle approach for test-driven development';
        break;
      }
      continue;
    }
    
    // Found a description line
    description = line;
    // Clean up common patterns
    description = description.replace(/^(This command |Command for |Follow this systematic approach to )/i, '');
    
    if (description.length > 200) {
      description = description.substring(0, 197) + '...';
    }
    break;
  }
  
  // Generate better fallback descriptions based on filename patterns
  if (!description || description.length < 10) {
    const filename = path.basename(inputFile, '.md');
    
    // Special cases based on filename
    const specialCases = {
      'act': 'Follow RED-GREEN-REFACTOR cycle for test-driven development workflow',
      'husky': 'Set up Git hooks with Husky for automated code quality checks',
      'ci-setup': 'Setup continuous integration pipeline for automated testing and deployment',
      'e2e-setup': 'Configure end-to-end testing framework and test infrastructure',
      'svelte:a11y': 'Check and fix accessibility issues in Svelte components',
      'svelte:component': 'Create new Svelte components with best practices',
      'svelte:debug': 'Debug Svelte applications and components',
      'svelte:migrate': 'Migrate Svelte projects to newer versions',
      'svelte:optimize': 'Optimize Svelte application performance and bundle size',
      'svelte:scaffold': 'Scaffold new Svelte project structure',
      'svelte:storybook': 'Set up and manage Storybook for Svelte components',
      'svelte:test': 'Write and run tests for Svelte components',
      'svelte:test-coverage': 'Generate test coverage reports for Svelte projects',
      'svelte:test-fix': 'Fix failing tests in Svelte projects',
      'svelte:test-setup': 'Set up testing infrastructure for Svelte projects',
    };
    
    if (specialCases[filename]) {
      description = specialCases[filename];
    } else {
      // Generate from filename
      description = `${title.charAt(0).toUpperCase() + title.slice(1)} operations and workflow`;
    }
  }
  
  return { title, description };
}

// Extract arguments hint if present
function extractArgumentHint(content) {
  // Look for $ARGUMENTS or argument patterns
  if (content.includes('$ARGUMENTS')) {
    // Try to find description of arguments
    const argMatch = content.match(/\*\*\$ARGUMENTS\*\*:?\s*([^\n]+)/);
    if (argMatch) {
      return argMatch[1].trim();
    }
    return '[arguments]';
  }
  return null;
}

// Extract allowed tools if mentioned
function extractAllowedTools(content) {
  // Look for tool mentions in content
  const tools = new Set();
  
  if (content.match(/git\s+(status|diff|log|add|commit|push|pull)/gi)) {
    tools.add('Bash(git *)');
  }
  if (content.match(/gh\s+(pr|issue|repo|workflow)/gi)) {
    tools.add('Bash(gh *)');
  }
  if (content.match(/npm\s+(install|run|test)/gi)) {
    tools.add('Bash(npm *)');
  }
  if (content.includes('Read') || content.includes('read file')) {
    tools.add('Read');
  }
  if (content.includes('Edit') || content.includes('modify file')) {
    tools.add('Edit');
  }
  if (content.includes('Write') || content.includes('create file')) {
    tools.add('Write');
  }
  if (content.includes('Glob') || content.includes('find files')) {
    tools.add('Glob');
  }
  
  return tools.size > 0 ? Array.from(tools).join(', ') : null;
}

// Clean up content
function cleanContent(content) {
  // Remove any existing frontmatter
  if (content.startsWith('---')) {
    const endIndex = content.indexOf('---', 3);
    if (endIndex !== -1) {
      content = content.substring(endIndex + 3).trim();
    }
  }
  
  // Ensure proper markdown structure
  const lines = content.split('\n');
  const cleanedLines = [];
  let inCodeBlock = false;
  
  for (let line of lines) {
    // Track code blocks
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }
    
    // Keep the line
    cleanedLines.push(line);
  }
  
  return cleanedLines.join('\n').trim();
}

// Process the file
const info = extractInfo(content);
const argumentHint = extractArgumentHint(content);
const allowedTools = extractAllowedTools(content);
const cleanedContent = cleanContent(content);

// Build frontmatter
let frontmatter = '---\n';
frontmatter += `description: ${info.description}\n`;
frontmatter += `category: ${category}\n`;
if (argumentHint) {
  frontmatter += `argument-hint: ${argumentHint}\n`;
}
if (allowedTools) {
  frontmatter += `allowed-tools: ${allowedTools}\n`;
}
frontmatter += '---\n\n';

// Combine frontmatter and content
const output = frontmatter + cleanedContent;

// Write to output file
fs.writeFileSync(outputFile, output, 'utf8');
console.log(`  Created: ${outputFile}`);