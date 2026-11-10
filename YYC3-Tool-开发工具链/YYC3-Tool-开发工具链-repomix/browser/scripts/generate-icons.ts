import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ICON_SIZES: readonly number[] = [16, 19, 32, 38, 48, 64, 128] as const;
const INPUT_SVG_PATH = path.join(__dirname, '../app/images/icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../app/images');

/**
 * Ensures the output directory exists
 */
function ensureOutputDirectory(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

/**
 * Generates a PNG icon of the specified size
 */
async function generateIcon(size: number): Promise<void> {
  try {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);

    await sharp(INPUT_SVG_PATH).resize(size, size).png().toFile(outputPath);

    console.log(`✅ Generated ${size}x${size} icon: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error generating ${size}x${size} icon:`, error);
    throw error;
  }
}

/**
 * Validates that the input SVG file exists
 */
function validateInputFile(): void {
  if (!fs.existsSync(INPUT_SVG_PATH)) {
    throw new Error(`Input SVG file not found: ${INPUT_SVG_PATH}`);
  }
  console.log(`📁 Input SVG: ${INPUT_SVG_PATH}`);
}

/**
 * Main function to generate all icon sizes
 */
async function generateAllIcons(): Promise<void> {
  console.log('🚀 Starting icon generation...');

  try {
    validateInputFile();
    ensureOutputDirectory();

    // Generate all icons in parallel
    const iconPromises = ICON_SIZES.map((size) => generateIcon(size));
    await Promise.all(iconPromises);

    console.log(`🎉 Successfully generated ${ICON_SIZES.length} icons!`);
    console.log(`📂 Output directory: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('💥 Failed to generate icons:', error);
    process.exit(1);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  void generateAllIcons();
}

export { generateAllIcons, generateIcon, ICON_SIZES };
