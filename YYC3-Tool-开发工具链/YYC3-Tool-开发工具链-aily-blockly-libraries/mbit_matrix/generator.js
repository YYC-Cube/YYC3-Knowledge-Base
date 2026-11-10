/**
 * Adafruit Microbit Library - Blockly Generator
 * For micro:bit LED matrix control
 */

// Ensure Arduino object exists
if (typeof Arduino === 'undefined') {
  var Arduino = {};
}

// Helper function to ensure matrix is initialized
function ensureMatrixBegin(generator) {
  generator.addLibrary('Adafruit_Microbit', '#include <Adafruit_Microbit.h>');
  generator.addLibrary('Adafruit_GFX', '#include <Adafruit_GFX.h>');
  generator.addObject('microbit_matrix', 'Adafruit_Microbit_Matrix matrix;');
  
  const setupKey = 'microbit_matrix_begin';
  if (!generator.setupCodes_ || !generator.setupCodes_[setupKey]) {
    generator.addSetup(setupKey, 'matrix.begin();\n');
  }
}

// Initialize matrix
Arduino.forBlock['microbit_matrix_begin'] = function(block, generator) {
  generator.addLibrary('Adafruit_Microbit', '#include <Adafruit_Microbit.h>');
  generator.addLibrary('Adafruit_GFX', '#include <Adafruit_GFX.h>');
  generator.addObject('microbit_matrix', 'Adafruit_Microbit_Matrix matrix;');
  
  const setupKey = 'microbit_matrix_begin';
  if (!generator.setupCodes_ || !generator.setupCodes_[setupKey]) {
    generator.addSetup(setupKey, 'matrix.begin();\n');
  }
  
  return '';
};

// Clear matrix
Arduino.forBlock['microbit_matrix_clear'] = function(block, generator) {
  ensureMatrixBegin(generator);
  return 'matrix.clear();\n';
};

// Fill matrix
Arduino.forBlock['microbit_matrix_fill'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const state = block.getFieldValue('STATE');
  return 'matrix.fillScreen(' + state + ');\n';
};

// Draw pixel
Arduino.forBlock['microbit_matrix_draw_pixel'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  const state = block.getFieldValue('STATE');
  return 'matrix.drawPixel(' + x + ', ' + y + ', ' + state + ');\n';
};

// Draw line
Arduino.forBlock['microbit_matrix_draw_line'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const x0 = generator.valueToCode(block, 'X0', generator.ORDER_ATOMIC) || '0';
  const y0 = generator.valueToCode(block, 'Y0', generator.ORDER_ATOMIC) || '0';
  const x1 = generator.valueToCode(block, 'X1', generator.ORDER_ATOMIC) || '4';
  const y1 = generator.valueToCode(block, 'Y1', generator.ORDER_ATOMIC) || '4';
  const state = block.getFieldValue('STATE');
  return 'matrix.drawLine(' + x0 + ', ' + y0 + ', ' + x1 + ', ' + y1 + ', ' + state + ');\n';
};

// Draw rectangle
Arduino.forBlock['microbit_matrix_draw_rect'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  const w = generator.valueToCode(block, 'W', generator.ORDER_ATOMIC) || '5';
  const h = generator.valueToCode(block, 'H', generator.ORDER_ATOMIC) || '5';
  const state = block.getFieldValue('STATE');
  return 'matrix.drawRect(' + x + ', ' + y + ', ' + w + ', ' + h + ', ' + state + ');\n';
};

// Fill rectangle
Arduino.forBlock['microbit_matrix_fill_rect'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  const w = generator.valueToCode(block, 'W', generator.ORDER_ATOMIC) || '5';
  const h = generator.valueToCode(block, 'H', generator.ORDER_ATOMIC) || '5';
  const state = block.getFieldValue('STATE');
  return 'matrix.fillRect(' + x + ', ' + y + ', ' + w + ', ' + h + ', ' + state + ');\n';
};

// Draw circle
Arduino.forBlock['microbit_matrix_draw_circle'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '2';
  const y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '2';
  const r = generator.valueToCode(block, 'R', generator.ORDER_ATOMIC) || '2';
  const state = block.getFieldValue('STATE');
  return 'matrix.drawCircle(' + x + ', ' + y + ', ' + r + ', ' + state + ');\n';
};

// Fill circle
Arduino.forBlock['microbit_matrix_fill_circle'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '2';
  const y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '2';
  const r = generator.valueToCode(block, 'R', generator.ORDER_ATOMIC) || '2';
  const state = block.getFieldValue('STATE');
  return 'matrix.fillCircle(' + x + ', ' + y + ', ' + r + ', ' + state + ');\n';
};

// Draw triangle
Arduino.forBlock['microbit_matrix_draw_triangle'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const x0 = generator.valueToCode(block, 'X0', generator.ORDER_ATOMIC) || '0';
  const y0 = generator.valueToCode(block, 'Y0', generator.ORDER_ATOMIC) || '4';
  const x1 = generator.valueToCode(block, 'X1', generator.ORDER_ATOMIC) || '2';
  const y1 = generator.valueToCode(block, 'Y1', generator.ORDER_ATOMIC) || '0';
  const x2 = generator.valueToCode(block, 'X2', generator.ORDER_ATOMIC) || '4';
  const y2 = generator.valueToCode(block, 'Y2', generator.ORDER_ATOMIC) || '4';
  const state = block.getFieldValue('STATE');
  return 'matrix.drawTriangle(' + x0 + ', ' + y0 + ', ' + x1 + ', ' + y1 + ', ' + x2 + ', ' + y2 + ', ' + state + ');\n';
};

// Fill triangle
Arduino.forBlock['microbit_matrix_fill_triangle'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const x0 = generator.valueToCode(block, 'X0', generator.ORDER_ATOMIC) || '0';
  const y0 = generator.valueToCode(block, 'Y0', generator.ORDER_ATOMIC) || '4';
  const x1 = generator.valueToCode(block, 'X1', generator.ORDER_ATOMIC) || '2';
  const y1 = generator.valueToCode(block, 'Y1', generator.ORDER_ATOMIC) || '0';
  const x2 = generator.valueToCode(block, 'X2', generator.ORDER_ATOMIC) || '4';
  const y2 = generator.valueToCode(block, 'Y2', generator.ORDER_ATOMIC) || '4';
  const state = block.getFieldValue('STATE');
  return 'matrix.fillTriangle(' + x0 + ', ' + y0 + ', ' + x1 + ', ' + y1 + ', ' + x2 + ', ' + y2 + ', ' + state + ');\n';
};

// Show icon
Arduino.forBlock['microbit_matrix_show_icon'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const icon = block.getFieldValue('ICON');
  let bitmapName = '';
  
  switch(icon) {
    case 'HEART':
      bitmapName = 'matrix.HEART';
      break;
    case 'EMPTYHEART':
      bitmapName = 'matrix.EMPTYHEART';
      break;
    case 'YES':
      bitmapName = 'matrix.YES';
      break;
    case 'NO':
      bitmapName = 'matrix.NO';
      break;
    case 'SMILE':
      bitmapName = 'matrix.MICROBIT_SMILE';
      break;
    default:
      bitmapName = 'matrix.HEART';
  }
  
  return 'matrix.show(' + bitmapName + ');\n';
};

// Show bitmap
Arduino.forBlock['microbit_matrix_show_bitmap'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const bitmap = generator.valueToCode(block, 'BITMAP', generator.ORDER_ATOMIC) || 'matrix.HEART';
  return 'matrix.show(' + bitmap + ');\n';
};

// Print text
Arduino.forBlock['microbit_matrix_print_text'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const text = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC) || '"HELLO"';
  return 'matrix.print(' + text + ');\n';
};

// Print number
Arduino.forBlock['microbit_matrix_print_number'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const number = generator.valueToCode(block, 'NUMBER', generator.ORDER_ATOMIC) || '0';
  return 'matrix.print(' + number + ');\n';
};

// Scroll text
Arduino.forBlock['microbit_matrix_scroll_text'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const text = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC) || '"HELLO"';
  const speed = generator.valueToCode(block, 'SPEED', generator.ORDER_ATOMIC) || '150';
  return 'matrix.scrollText(' + text + ', ' + speed + ');\n';
};

// Create bitmap
Arduino.forBlock['microbit_matrix_bitmap_create'] = function(block, generator) {
  ensureMatrixBegin(generator);
  const row1 = generator.valueToCode(block, 'ROW1', generator.ORDER_ATOMIC) || '0';
  const row2 = generator.valueToCode(block, 'ROW2', generator.ORDER_ATOMIC) || '0';
  const row3 = generator.valueToCode(block, 'ROW3', generator.ORDER_ATOMIC) || '0';
  const row4 = generator.valueToCode(block, 'ROW4', generator.ORDER_ATOMIC) || '0';
  const row5 = generator.valueToCode(block, 'ROW5', generator.ORDER_ATOMIC) || '0';
  
  // Generate a unique bitmap variable name
  const bitmapVar = 'bitmap_' + block.id.substring(0, 8);
  
  const bitmapDef = 'const uint8_t ' + bitmapVar + '[5] = {' + row1 + ', ' + row2 + ', ' + row3 + ', ' + row4 + ', ' + row5 + '};\n';
  generator.addVariable(bitmapVar, bitmapDef);
  
  return [bitmapVar, generator.ORDER_ATOMIC];
};

// Preset bitmap constants
Arduino.forBlock['microbit_matrix_bitmap_heart'] = function(block, generator) {
  ensureMatrixBegin(generator);
  return ['matrix.HEART', generator.ORDER_ATOMIC];
};

Arduino.forBlock['microbit_matrix_bitmap_empty_heart'] = function(block, generator) {
  ensureMatrixBegin(generator);
  return ['matrix.EMPTYHEART', generator.ORDER_ATOMIC];
};

Arduino.forBlock['microbit_matrix_bitmap_yes'] = function(block, generator) {
  ensureMatrixBegin(generator);
  return ['matrix.YES', generator.ORDER_ATOMIC];
};

Arduino.forBlock['microbit_matrix_bitmap_no'] = function(block, generator) {
  ensureMatrixBegin(generator);
  return ['matrix.NO', generator.ORDER_ATOMIC];
};

Arduino.forBlock['microbit_matrix_bitmap_smile'] = function(block, generator) {
  ensureMatrixBegin(generator);
  return ['matrix.MICROBIT_SMILE', generator.ORDER_ATOMIC];
};