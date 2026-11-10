Arduino.forBlock['hx711_create'] = function(block, generator) {
  var varName = Arduino.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  
  generator.addLibrary('#include <HX711.h>', '#include <HX711.h>');
  generator.addVariable('HX711 ' + varName, 'HX711 ' + varName + ';');
  
  return '';
};

Arduino.forBlock['hx711_begin'] = function(block, generator) {
  var varName = Arduino.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var dataPin = block.getFieldValue('DATAPIN');
  var clockPin = block.getFieldValue('CLOCKPIN');
  
  return varName + '.begin(' + dataPin + ', ' + clockPin + ');\n';
};

Arduino.forBlock['hx711_tare'] = function(block, generator) {
  var varName = Arduino.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var times = block.getFieldValue('TIMES');
  
  return varName + '.tare(' + times + ');\n';
};

Arduino.forBlock['hx711_set_scale'] = function(block, generator) {
  var varName = Arduino.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var scale = generator.valueToCode(block, 'SCALE', Arduino.ORDER_ATOMIC);
  
  return varName + '.set_scale(' + scale + ');\n';
};

Arduino.forBlock['hx711_get_units'] = function(block, generator) {
  var varName = Arduino.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var times = block.getFieldValue('TIMES');
  
  return [varName + '.get_units(' + times + ')', Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['hx711_read'] = function(block, generator) {
  var varName = Arduino.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  
  return [varName + '.read()', Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['hx711_read_average'] = function(block, generator) {
  var varName = Arduino.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var times = block.getFieldValue('TIMES');
  
  return [varName + '.read_average(' + times + ')', Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['hx711_power_down'] = function(block, generator) {
  var varName = Arduino.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  
  return varName + '.power_down();\n';
};

Arduino.forBlock['hx711_power_up'] = function(block, generator) {
  var varName = Arduino.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  
  return varName + '.power_up();\n';
};

Arduino.forBlock['hx711_set_gain'] = function(block, generator) {
  var varName = Arduino.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var gain = block.getFieldValue('GAIN');
  
  return varName + '.set_gain(' + gain + ');\n';
};

Arduino.forBlock['hx711_calibrate_scale'] = function(block, generator) {
  var varName = Arduino.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var weight = generator.valueToCode(block, 'WEIGHT', Arduino.ORDER_ATOMIC);
  var times = block.getFieldValue('TIMES');
  
  return varName + '.calibrate_scale(' + weight + ', ' + times + ');\n';
};