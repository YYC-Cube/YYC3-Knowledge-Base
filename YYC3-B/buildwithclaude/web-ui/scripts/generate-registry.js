#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

// Adjust paths to work from web-ui/scripts directory
const REPO_ROOT = path.join(__dirname, '..', '..');
const SUBAGENTS_DIR = path.join(REPO_ROOT, 'subagents');
const COMMANDS_DIR = path.join(REPO_ROOT, 'commands');
const HOOKS_DIR = path.join(REPO_ROOT, 'plugins', 'all-hooks', 'hooks');
const SKILLS_DIR = path.join(REPO_ROOT, 'plugins', 'all-skills', 'skills');
const PLUGINS_DIR = path.join(REPO_ROOT, 'plugins');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'registry.json');

async function getSubagents() {
  const files = await fs.readdir(SUBAGENTS_DIR);
  const subagents = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const filePath = path.join(SUBAGENTS_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const { data } = matter(content);
    
    subagents.push({
      name: data.name,
      category: data.category || 'uncategorized',
      description: data.description || '',
      version: '1.0.0',
      file: `subagents/${file}`,
      tools: data.tools ? data.tools.split(',').map(t => t.trim()) : [],
      path: file
    });
  }
  
  return subagents.sort((a, b) => a.name.localeCompare(b.name));
}

async function getCommands() {
  const files = await fs.readdir(COMMANDS_DIR);
  const commands = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const filePath = path.join(COMMANDS_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const { data } = matter(content);
    
    // Command name is the filename without .md
    const commandName = file.replace('.md', '');
    
    commands.push({
      name: commandName,
      category: data.category || 'uncategorized',
      description: data.description || '',
      version: '1.0.0',
      file: `commands/${file}`,
      path: file,
      argumentHint: data['argument-hint'] || '',
      model: data.model || ''
    });
  }
  
  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

async function getHooks() {
  try {
    const files = await fs.readdir(HOOKS_DIR);
    const hooks = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(HOOKS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const { data } = matter(content);

      const hookName = file.replace('.md', '');

      hooks.push({
        name: data.name || hookName,
        category: data.category || 'uncategorized',
        description: data.description || '',
        version: data.version || '1.0.0',
        file: `plugins/all-hooks/hooks/${file}`,
        path: hookName,
        event: data.event || '',
        matcher: data.matcher || '',
        language: data.language || 'bash',
        tags: data.tags || []
      });
    }

    return hooks.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn('Warning: Could not read hooks directory:', error.message);
    return [];
  }
}

async function getSkills() {
  try {
    const skillDirs = await fs.readdir(SKILLS_DIR);
    const skills = [];

    for (const dir of skillDirs) {
      const skillPath = path.join(SKILLS_DIR, dir, 'SKILL.md');

      try {
        const content = await fs.readFile(skillPath, 'utf-8');
        const { data } = matter(content);

        skills.push({
          name: data.name || dir,
          category: data.category || 'uncategorized',
          description: data.description || '',
          version: data.version || '1.0.0',
          file: `plugins/all-skills/skills/${dir}/SKILL.md`,
          path: dir,
          license: data.license || '',
          tags: data.tags || []
        });
      } catch {
        // Skip directories without SKILL.md
        continue;
      }
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn('Warning: Could not read skills directory:', error.message);
    return [];
  }
}

async function getPlugins() {
  try {
    const dirs = await fs.readdir(PLUGINS_DIR);
    const plugins = [];

    for (const dir of dirs) {
      const pluginJsonPath = path.join(PLUGINS_DIR, dir, '.claude-plugin', 'plugin.json');

      try {
        const content = await fs.readFile(pluginJsonPath, 'utf-8');
        const data = JSON.parse(content);

        plugins.push({
          name: data.name,
          description: data.description || '',
          version: data.version || '1.0.0',
          file: `plugins/${dir}/.claude-plugin/plugin.json`,
          path: dir,
          repository: data.repository || '',
          license: data.license || '',
          keywords: data.keywords || [],
          author: data.author || {},
          installCommand: `/plugin install ${data.name}@buildwithclaude`
        });
      } catch {
        // Skip directories without .claude-plugin/plugin.json
        continue;
      }
    }

    return plugins.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn('Warning: Could not read plugins directory:', error.message);
    return [];
  }
}

async function generateRegistry() {
  console.log('Generating registry.json...');

  try {
    const [subagents, commands, hooks, skills, plugins] = await Promise.all([
      getSubagents(),
      getCommands(),
      getHooks(),
      getSkills(),
      getPlugins()
    ]);

    const registry = {
      $schema: 'https://buildwithclaude.com/schema/registry.json',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      subagents,
      commands,
      hooks,
      skills,
      plugins
    };

    // Ensure public directory exists
    const publicDir = path.dirname(OUTPUT_PATH);
    await fs.mkdir(publicDir, { recursive: true });

    await fs.writeFile(
      OUTPUT_PATH,
      JSON.stringify(registry, null, 2)
    );

    console.log('✓ Registry generated successfully!');
    console.log(`  - ${subagents.length} subagents`);
    console.log(`  - ${commands.length} commands`);
    console.log(`  - ${hooks.length} hooks`);
    console.log(`  - ${skills.length} skills`);
    console.log(`  - ${plugins.length} plugins`);
    console.log(`  - Output: ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('Error generating registry:', error);
    process.exit(1);
  }
}

generateRegistry();