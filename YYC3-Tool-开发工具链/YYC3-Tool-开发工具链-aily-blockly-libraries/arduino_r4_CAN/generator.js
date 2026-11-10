Arduino.forBlock['can_begin'] = function(block, generator) {
  var bitrate = block.getFieldValue('BITRATE');
  generator.addLibrary('arduino_can', '#include <Arduino_CAN.h>');
  
  var code = 'CAN1.begin(' + bitrate + ');\n';
  return code;
};

Arduino.forBlock['can_available'] = function(block, generator) {
  generator.addLibrary('arduino_can', '#include <Arduino_CAN.h>');
  
  var code = 'CAN1.available()';
  return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['can_read'] = function(block, generator) {
  var variable = block.getFieldValue('VAR');
  generator.addLibrary('arduino_can', '#include <Arduino_CAN.h>');
  
  var code = variable + ' = CAN1.read();\n';
  return code;
};

Arduino.forBlock['can_create_message'] = function(block, generator) {
  var id = generator.valueToCode(block, 'ID', Arduino.ORDER_ATOMIC);
  var data = generator.valueToCode(block, 'DATA', Arduino.ORDER_ATOMIC);
  generator.addLibrary('arduino_can', '#include <Arduino_CAN.h>');
  
  var code = 'CANMessage(' + id + ', ' + data + ')';
  return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['can_write'] = function(block, generator) {
  var msg = generator.valueToCode(block, 'MSG', Arduino.ORDER_ATOMIC);
  generator.addLibrary('arduino_can', '#include <Arduino_CAN.h>');
  
  var code = 'CAN1.write(' + msg + ');\n';
  return code;
};

Arduino.forBlock['can_get_message_id'] = function(block, generator) {
  var variable = block.getFieldValue('VAR');
  generator.addLibrary('arduino_can', '#include <Arduino_CAN.h>');
  
  var code = variable + '.id';
  return [code, Arduino.ORDER_MEMBER];
};

Arduino.forBlock['can_get_message_data'] = function(block, generator) {
  var variable = block.getFieldValue('VAR');
  var index = generator.valueToCode(block, 'INDEX', Arduino.ORDER_ATOMIC);
  generator.addLibrary('arduino_can', '#include <Arduino_CAN.h>');
  
  var code = variable + '.data[' + index + ']';
  return [code, Arduino.ORDER_MEMBER];
};

Arduino.forBlock['can_set_filter_mask'] = function(block, generator) {
  var type = block.getFieldValue('TYPE');
  var mask = generator.valueToCode(block, 'MASK', Arduino.ORDER_ATOMIC);
  generator.addLibrary('arduino_can', '#include <Arduino_CAN.h>');
  
  var code = 'CAN.setFilterMask_' + type + '(' + mask + ');\n';
  return code;
};

Arduino.forBlock['can_set_filter_id'] = function(block, generator) {
  var type = block.getFieldValue('TYPE');
  var id = generator.valueToCode(block, 'ID', Arduino.ORDER_ATOMIC);
  generator.addLibrary('arduino_can', '#include <Arduino_CAN.h>');
  
  var code = 'CAN.setFilterId_' + type + '(' + id + ');\n';
  return code;
};