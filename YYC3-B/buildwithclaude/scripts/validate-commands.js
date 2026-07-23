const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const Ajv = require('ajv');

const COMMANDS_DIR = path.join(__dirname, '..', 'plugins/all-commands/commands');
const SCHEMA_PATH = path.join(__dirname, 'command-schema.json');

// Load schema
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

// Initialize AJV
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

// Read all command files
const commandFiles = fs.readdirSync(COMMANDS_DIR)
  .filter(file => file.endsWith('.md') && file !== 'README.md' && file !== 'INDEX.md');

let hasErrors = false;

console.log(`Validating ${commandFiles.length} command files...\n`);

commandFiles.forEach(file => {
  const filePath = path.join(COMMANDS_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');
  let warnings = [];
  
  try {
    const { data: frontmatter, content: bodyContent } = matter(content);
    
    // Check if frontmatter exists
    if (Object.keys(frontmatter).length === 0) {
      console.error(`❌ ${file}: No frontmatter found`);
      hasErrors = true;
      return;
    }
    
    // Validate against schema
    const valid = validate(frontmatter);
    
    if (!valid) {
      console.error(`❌ ${file}: Validation failed`);
      validate.errors.forEach(error => {
        console.error(`   - ${error.instancePath || 'root'}: ${error.message}`);
      });
      hasErrors = true;
      return;
    }
    
    // Content validation
    const trimmedContent = bodyContent.trim();
    
    // Check if content exists
    if (!trimmedContent) {
      console.error(`❌ ${file}: No content found after frontmatter`);
      hasErrors = true;
      return;
    }
    
    // Check for "You are a..." pattern (warning only)
    if (trimmedContent.match(/^You are (a|an)\s+/i)) {
      warnings.push('Content starts with "You are a..." - consider using direct instructions instead');
    }
    
    // Check for $ARGUMENTS usage
    if (trimmedContent.includes('$ARGUMENTS')) {
      if (!frontmatter['argument-hint']) {
        warnings.push('Uses $ARGUMENTS but no argument-hint provided in frontmatter');
      }
    } else if (frontmatter['argument-hint']) {
      warnings.push('Has argument-hint but doesn\'t use $ARGUMENTS in content');
    }
    
    // Check for actionable content
    const hasActionableContent = trimmedContent.match(/\b(create|run|execute|check|fix|analyze|generate|update|modify|write|read|test|validate|build|deploy)\b/i);
    if (!hasActionableContent) {
      warnings.push('Content may lack actionable instructions');
    }
    
    // Report status
    if (warnings.length > 0) {
      console.log(`⚠️  ${file}: Valid with warnings`);
      warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    } else {
      console.log(`✅ ${file}: Valid`);
    }
  } catch (error) {
    console.error(`❌ ${file}: Error parsing file - ${error.message}`);
    hasErrors = true;
  }
});

console.log('\n' + '-'.repeat(50));

if (hasErrors) {
  console.error('\n❌ Validation failed! Please fix the errors above.');
  process.exit(1);
} else {
  console.log('\n✅ All command files are valid!');
}