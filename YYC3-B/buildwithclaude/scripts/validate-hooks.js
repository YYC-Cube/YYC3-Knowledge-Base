#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const Ajv = require('ajv').default || require('ajv');
const { globSync } = require('glob');

// Initialize AJV for JSON schema validation
const ajv = new Ajv({ allErrors: true });

// Load the hook schema
const hookSchema = require('./hook-schema.json');

// Compile the schema
const validateHook = ajv.compile(hookSchema);

// Track validation results
let hasErrors = false;
const errors = [];
const warnings = [];

// Find all hook markdown files
const hookFiles = globSync(['plugins/all-hooks/hooks/*.md'])
  .filter(file => !file.endsWith('README.md') && !file.endsWith('INDEX.md'));

console.log(`\n\x1b[34mValidating ${hookFiles.length} hook files...\x1b[0m\n`);

// Valid event types for reference
const validEvents = [
  'PreToolUse',
  'PostToolUse',
  'Stop',
  'Notification',
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'PreCompact',
  'SubagentStop'
];

// Validate each file
hookFiles.forEach(file => {
  console.log(`\x1b[90mChecking ${file}...\x1b[0m`);

  try {
    // Read file content
    const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');

    // Parse frontmatter
    const parsed = matter(content);

    // Check if frontmatter exists
    if (!parsed.data || Object.keys(parsed.data).length === 0) {
      errors.push({
        file,
        message: 'No frontmatter found'
      });
      hasErrors = true;
      return;
    }

    // Validate against schema
    const valid = validateHook(parsed.data);

    if (!valid) {
      validateHook.errors.forEach(error => {
        let message = error.message;
        if (error.instancePath) {
          message = `Field '${error.instancePath.replace('/', '')}' ${error.message}`;
        } else if (error.schemaPath.includes('/event/')) {
          message = `Event ${error.message}. Valid events: ${validEvents.join(', ')}`;
        } else if (error.schemaPath.includes('/category/')) {
          message = `Category ${error.message}. Valid categories: git, automation, notifications, formatting, security, testing, development, performance`;
        } else if (error.schemaPath.includes('/required')) {
          if (error.params.missingProperty === 'event') {
            message = `Missing required field 'event'. Valid events: ${validEvents.join(', ')}`;
          } else if (error.params.missingProperty === 'matcher') {
            message = `Missing required field 'matcher'. Use '*' for all tools or a pattern like 'Edit|Write'`;
          } else {
            message = `Missing required field '${error.params.missingProperty}'`;
          }
        }
        errors.push({
          file,
          message: message,
          details: error
        });
      });
      hasErrors = true;
    }

    // Additional custom validations

    // 1. Check file name matches name field
    const fileName = path.basename(file, '.md');
    if (parsed.data.name && fileName !== parsed.data.name) {
      warnings.push({
        file,
        message: `File name '${fileName}' doesn't match name field '${parsed.data.name}'`
      });
    }

    // 2. Check matcher pattern syntax (basic regex validation)
    if (parsed.data.matcher && parsed.data.matcher !== '*') {
      try {
        new RegExp(parsed.data.matcher);
      } catch (e) {
        errors.push({
          file,
          message: `Invalid matcher regex pattern: ${parsed.data.matcher}`
        });
        hasErrors = true;
      }
    }

    // 3. Check content is not empty
    if (!parsed.content || parsed.content.trim().length === 0) {
      warnings.push({
        file,
        message: 'Hook content is empty'
      });
    }

    // 4. Check for duplicate names
    if (parsed.data.name) {
      const allHookNames = hookFiles.map(f => {
        try {
          const c = fs.readFileSync(path.join(process.cwd(), f), 'utf8');
          const p = matter(c);
          return { file: f, name: p.data.name };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      const duplicates = allHookNames.filter(item =>
        item.name === parsed.data.name && item.file !== file
      );

      if (duplicates.length > 0) {
        errors.push({
          file,
          message: `Duplicate name '${parsed.data.name}' found in: ${duplicates.map(d => d.file).join(', ')}`
        });
        hasErrors = true;
      }
    }

    // 5. Validate version format if present
    if (parsed.data.version && !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(parsed.data.version)) {
      warnings.push({
        file,
        message: `Version '${parsed.data.version}' should follow semantic versioning (e.g., 1.0.0)`
      });
    }

    // 6. Check for language field when content suggests code
    if (parsed.content.includes('```') && !parsed.data.language) {
      warnings.push({
        file,
        message: 'Hook contains code blocks but no language field specified'
      });
    }

  } catch (error) {
    errors.push({
      file,
      message: `Failed to parse file: ${error.message}`
    });
    hasErrors = true;
  }
});

// Generate report
console.log('\n\x1b[1mHook Validation Report\x1b[0m');
console.log('='.repeat(50));

if (errors.length > 0) {
  console.log(`\x1b[31m\n❌ Errors (${errors.length}):\x1b[0m`);
  errors.forEach(error => {
    console.log(`\x1b[31m  - ${error.file}: ${error.message}\x1b[0m`);
  });
}

if (warnings.length > 0) {
  console.log(`\x1b[33m\n⚠️  Warnings (${warnings.length}):\x1b[0m`);
  warnings.forEach(warning => {
    console.log(`\x1b[33m  - ${warning.file}: ${warning.message}\x1b[0m`);
  });
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('\x1b[32m\n✅ All hook validations passed!\x1b[0m');
}

// Summary
console.log(`\n\x1b[34mSummary: ${hookFiles.length} hooks, ${errors.length} errors, ${warnings.length} warnings\x1b[0m`);

// Write detailed report
const report = {
  timestamp: new Date().toISOString(),
  totalFiles: hookFiles.length,
  errors: errors.length,
  warnings: warnings.length,
  details: {
    errors,
    warnings
  }
};

fs.writeFileSync('hook-validation-report.json', JSON.stringify(report, null, 2));

// Exit with error code if validation failed
if (hasErrors) {
  console.log('\x1b[31m\n❌ Hook validation failed!\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32m\n✅ Hook validation successful!\x1b[0m');
  process.exit(0);
}
