Arduino.forBlock['keypad_initialize'] = function(block, generator) {
  generator.addLibrary('KEYPAD_H', '#include "keypad.h"');
  
  var row1 = generator.valueToCode(block, 'ROW1', Arduino.ORDER_ATOMIC);
  var row2 = generator.valueToCode(block, 'ROW2', Arduino.ORDER_ATOMIC);
  var row3 = generator.valueToCode(block, 'ROW3', Arduino.ORDER_ATOMIC);
  var row4 = generator.valueToCode(block, 'ROW4', Arduino.ORDER_ATOMIC);
  var col1 = generator.valueToCode(block, 'COL1', Arduino.ORDER_ATOMIC);
  var col2 = generator.valueToCode(block, 'COL2', Arduino.ORDER_ATOMIC);
  var col3 = generator.valueToCode(block, 'COL3', Arduino.ORDER_ATOMIC);
  var col4 = generator.valueToCode(block, 'COL4', Arduino.ORDER_ATOMIC);
  
  generator.addVariable('KEYPAD_PINS', 'gpio_num_t keypad_pins[8] = {' + 
    row1 + ', ' + row2 + ', ' + row3 + ', ' + row4 + ', ' + 
    col1 + ', ' + col2 + ', ' + col3 + ', ' + col4 + '};');

  return 'keypad_initalize(keypad_pins);\n';
};

Arduino.forBlock['keypad_getkey'] = function(block, generator) {
  return ['keypad_getkey()', Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['keypad_delete'] = function(block, generator) {
  return 'keypad_delete();\n';
};