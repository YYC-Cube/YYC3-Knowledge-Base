#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files that need fixing based on validation errors
const filesToFix = [
  'timeline-compressor.md',
  'testing_plan_integration.md',
  'system-behavior-simulator.md',
  'simulation-calibrator.md',
  'setup-monorepo.md',
  'setup-automated-releases.md',
  'project-timeline-simulator.md',
  'pac-validate.md',
  'pac-update-status.md',
  'pac-create-ticket.md',
  'pac-create-epic.md',
  'pac-configure.md',
  'market-response-modeler.md',
  'init-project.md',
  'git-status.md',
  'generate-tests.md',
  'generate-test-cases.md',
  'future-scenario-generator.md',
  'directory-deep-dive.md',
  'digital-twin-creator.md',
  'decision-tree-explorer.md',
  'decision-quality-analyzer.md',
  'constraint-modeler.md',
  'code-permutation-tester.md',
  'check-file.md',
  'business-scenario-explorer.md',
  'architecture-scenario-explorer.md',
  'add-package.md'
];

const COMMANDS_DIR = path.join(__dirname, '..', 'commands');

// Mappings for better argument hints based on command names
const argumentHintMappings = {
  'timeline-compressor.md': 'Specify timeline and compression ratio',
  'testing_plan_integration.md': 'Specify test plan or integration type',
  'system-behavior-simulator.md': 'Specify system behavior parameters',
  'simulation-calibrator.md': 'Specify calibration parameters',
  'setup-monorepo.md': 'Specify monorepo configuration options',
  'setup-automated-releases.md': 'Specify release automation settings',
  'project-timeline-simulator.md': 'Specify project timeline parameters',
  'pac-validate.md': 'Specify validation rules or targets',
  'pac-update-status.md': 'Specify status update details',
  'pac-create-ticket.md': 'Specify ticket details',
  'pac-create-epic.md': 'Specify epic details',
  'pac-configure.md': 'Specify configuration settings',
  'market-response-modeler.md': 'Specify market response parameters',
  'init-project.md': 'Specify project name and type',
  'git-status.md': 'Optional: specify path or options',
  'generate-tests.md': 'Specify test generation options',
  'generate-test-cases.md': 'Specify test case requirements',
  'future-scenario-generator.md': 'Specify scenario parameters',
  'directory-deep-dive.md': 'Specify directory path',
  'digital-twin-creator.md': 'Specify digital twin parameters',
  'decision-tree-explorer.md': 'Specify decision tree parameters',
  'decision-quality-analyzer.md': 'Specify analysis criteria',
  'constraint-modeler.md': 'Specify constraint parameters',
  'code-permutation-tester.md': 'Specify permutation test options',
  'check-file.md': 'Specify file path to check',
  'business-scenario-explorer.md': 'Specify business scenario parameters',
  'architecture-scenario-explorer.md': 'Specify architecture scenario options',
  'add-package.md': '[package-name] [type]'
};

console.log('Fixing argument-hint fields in command files...\n');

let fixedCount = 0;
let errorCount = 0;

filesToFix.forEach(file => {
  const filePath = path.join(COMMANDS_DIR, file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${file}`);
    errorCount++;
    return;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      console.error(`❌ No frontmatter found in ${file}`);
      errorCount++;
      return;
    }
    
    const frontmatter = frontmatterMatch[1];
    const afterFrontmatter = content.substring(frontmatterMatch[0].length);
    
    // Find the argument-hint line
    const argumentHintMatch = frontmatter.match(/^argument-hint:\s*(.*)$/m);
    if (!argumentHintMatch) {
      console.log(`⚠️  No argument-hint found in ${file}, skipping`);
      return;
    }
    
    const currentValue = argumentHintMatch[1];
    let newValue = '';
    
    // Determine the new value
    if (argumentHintMappings[file]) {
      // Use the specific mapping
      newValue = `"${argumentHintMappings[file]}"`;
    } else if (currentValue.startsWith('[') && currentValue.endsWith(']')) {
      // Wrap array notation in quotes
      newValue = `"${currentValue}"`;
    } else if (currentValue.startsWith('#')) {
      // Replace comment-like content with generic hint
      newValue = '"<arguments>"';
    } else if (!currentValue.startsWith('"') && !currentValue.startsWith("'")) {
      // Wrap unquoted strings
      newValue = `"${currentValue}"`;
    } else {
      // Already quoted, skip
      console.log(`✓ ${file} already has proper quotes`);
      return;
    }
    
    // Replace the argument-hint line
    const newFrontmatter = frontmatter.replace(
      /^argument-hint:.*$/m,
      `argument-hint: ${newValue}`
    );
    
    // Reconstruct the file
    const newContent = `---\n${newFrontmatter}\n---${afterFrontmatter}`;
    
    // Write the file
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Fixed ${file}: ${currentValue} → ${newValue}`);
    fixedCount++;
    
  } catch (error) {
    console.error(`❌ Error processing ${file}: ${error.message}`);
    errorCount++;
  }
});

console.log(`\n===========================================`);
console.log(`Summary:`);
console.log(`  ✅ Fixed: ${fixedCount} files`);
if (errorCount > 0) {
  console.log(`  ❌ Errors: ${errorCount} files`);
}
console.log(`===========================================\n`);

if (errorCount > 0) {
  process.exit(1);
}