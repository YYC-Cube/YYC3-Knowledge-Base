#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');
const matter = require('gray-matter');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats').default;
const chalk = require('chalk').default;

// Initialize AJV with formats
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

async function loadSchema() {
  const schemaPath = path.join(__dirname, 'mcp-server-schema.json');
  const schemaContent = await fs.readFile(schemaPath, 'utf8');
  return JSON.parse(schemaContent);
}

async function validateMCPServer(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const { data: frontmatter, content: markdown } = matter(content);
  
  const errors = [];
  const warnings = [];
  
  // Extract filename without extension
  const filename = path.basename(filePath, '.md');
  const category = path.basename(path.dirname(filePath));
  
  // Check if name matches filename
  if (frontmatter.name !== filename) {
    errors.push(`Name mismatch: frontmatter name '${frontmatter.name}' doesn't match filename '${filename}'`);
  }
  
  // Validate markdown content
  if (!markdown || markdown.trim().length < 500) {
    warnings.push('Markdown content seems too short (less than 500 characters)');
  }
  
  // Check for required markdown sections
  const requiredSections = [
    '## Overview',
    '## Features',
    '## Requirements',
    '## Configuration',
    '## Available Tools',
    '## Security Considerations',
    '## Examples',
    '## Troubleshooting',
    '## Resources'
  ];
  
  for (const section of requiredSections) {
    if (!markdown.includes(section)) {
      warnings.push(`Missing recommended section: ${section}`);
    }
  }
  
  // Check verification status matches directory
  if (category === 'verified' && frontmatter.verification?.status !== 'verified') {
    errors.push('Server in verified directory must have verification.status = "verified"');
  }
  if (category === 'community' && frontmatter.verification?.status !== 'community') {
    errors.push('Server in community directory must have verification.status = "community"');
  }
  if (category === 'experimental' && frontmatter.verification?.status !== 'experimental') {
    errors.push('Server in experimental directory must have verification.status = "experimental"');
  }
  
  // Security warnings for experimental servers
  if (frontmatter.verification?.status === 'experimental' && !frontmatter.verification?.security_audit) {
    warnings.push('Experimental server should include security warnings');
  }
  
  // Check for at least one installation method
  if (!frontmatter.installation_methods || frontmatter.installation_methods.length === 0) {
    errors.push('At least one installation method must be provided');
  }
  
  // Validate installation methods have proper examples
  frontmatter.installation_methods?.forEach((method, index) => {
    if (method.type !== 'manual' && !method.config_example) {
      errors.push(`Installation method ${index + 1} (${method.type}) missing config_example`);
    }
  });
  
  return { errors, warnings };
}

async function main() {
  console.log(chalk.blue.bold('\n🔍 Validating MCP Servers...\n'));
  
  try {
    // Load schema
    const schema = await loadSchema();
    const validate = ajv.compile(schema);
    
    // Find all MCP server files
    const files = await glob('mcp-servers/**/*.md', {
      ignore: ['mcp-servers/TEMPLATE.md']
    });
    
    if (files.length === 0) {
      console.log(chalk.yellow('No MCP server files found to validate.'));
      return;
    }
    
    let hasErrors = false;
    let totalErrors = 0;
    let totalWarnings = 0;
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const { data: frontmatter } = matter(content);
      
      console.log(chalk.cyan(`\nValidating: ${file}`));
      
      // Schema validation
      const valid = validate(frontmatter);
      if (!valid) {
        hasErrors = true;
        console.log(chalk.red('  ❌ Schema validation failed:'));
        validate.errors.forEach(error => {
          console.log(chalk.red(`     - ${error.instancePath || '/'}: ${error.message}`));
          totalErrors++;
        });
      }
      
      // Custom validation
      const { errors, warnings } = await validateMCPServer(file);
      
      if (errors.length > 0) {
        hasErrors = true;
        console.log(chalk.red('  ❌ Validation errors:'));
        errors.forEach(error => {
          console.log(chalk.red(`     - ${error}`));
          totalErrors++;
        });
      }
      
      if (warnings.length > 0) {
        console.log(chalk.yellow('  ⚠️  Warnings:'));
        warnings.forEach(warning => {
          console.log(chalk.yellow(`     - ${warning}`));
          totalWarnings++;
        });
      }
      
      if (!valid && errors.length === 0) {
        console.log(chalk.green('  ✅ Additional validation passed'));
      } else if (valid && errors.length === 0 && warnings.length === 0) {
        console.log(chalk.green('  ✅ All validations passed'));
      }
    }
    
    // Summary
    console.log(chalk.blue.bold('\n📊 Summary:'));
    console.log(`  Total files validated: ${files.length}`);
    console.log(`  Total errors: ${totalErrors}`);
    console.log(`  Total warnings: ${totalWarnings}`);
    
    if (hasErrors) {
      console.log(chalk.red.bold('\n❌ Validation failed! Please fix the errors above.'));
      process.exit(1);
    } else {
      console.log(chalk.green.bold('\n✅ All MCP servers validated successfully!'));
      
      // Create validation report
      const report = {
        timestamp: new Date().toISOString(),
        filesValidated: files.length,
        totalErrors: 0,
        totalWarnings: totalWarnings,
        status: 'passed'
      };
      
      await fs.writeFile(
        'mcp-validation-report.json',
        JSON.stringify(report, null, 2)
      );
    }
    
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Validation script error:'), error.message);
    process.exit(1);
  }
}

// Run validation
main();