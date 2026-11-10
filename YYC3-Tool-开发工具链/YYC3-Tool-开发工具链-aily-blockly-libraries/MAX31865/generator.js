Arduino.forBlock['max31865_init'] = function(block, generator) {
  var cs_pin = block.getFieldValue('CS_PIN');
  var wire_mode = block.getFieldValue('WIRE_MODE');
  var sensor_type = block.getFieldValue('SENSOR_TYPE');
  
  generator.addLibrary('RAK12022_MAX31865_H', '#include "RAK12022_MAX31865.h"');
  generator.addVariable('max31865_sensor', 'MAX31865 maxTemp;');
  
  var code = 'maxTemp.begin(' + cs_pin + ', ' + wire_mode + ', ' + sensor_type + ');\n';
  return code;
};

Arduino.forBlock['max31865_read'] = function(block, generator) {
  var temp_var = generator.nameDB_.getName(block.getFieldValue('TEMP_VAR'), 'VARIABLE');
  var resistance_var = generator.nameDB_.getName(block.getFieldValue('RESISTANCE_VAR'), 'VARIABLE');
  var status_var = generator.nameDB_.getName(block.getFieldValue('STATUS_VAR'), 'VARIABLE');
  
  generator.addVariable('max31865_temp_var', 'float ' + temp_var + ' = 0;');
  generator.addVariable('max31865_resistance_var', 'float ' + resistance_var + ' = 0;');
  generator.addVariable('max31865_status_var', 'uint8_t ' + status_var + ' = 0;');
  
  var code = 'maxTemp.MAX31865_GetTemperatureAndStatus(' + temp_var + ', ' + resistance_var + ', ' + status_var + ');\n';
  return code;
};

Arduino.forBlock['max31865_set_low_threshold'] = function(block, generator) {
  var threshold = generator.valueToCode(block, 'THRESHOLD', generator.ORDER_ATOMIC) || '0';
  
  var code = 'maxTemp.MAX31865_SetLowFaultThreshold(' + threshold + ');\n';
  return code;
};

Arduino.forBlock['max31865_set_high_threshold'] = function(block, generator) {
  var threshold = generator.valueToCode(block, 'THRESHOLD', generator.ORDER_ATOMIC) || '0';
  
  var code = 'maxTemp.MAX31865_SetHighFaultThreshold(' + threshold + ');\n';
  return code;
};

Arduino.forBlock['max31865_check_fault'] = function(block, generator) {
  var fault_type = block.getFieldValue('FAULT_TYPE');
  var status_var = generator.nameDB_.getName(block.getFieldValue('STATUS_VAR'), 'VARIABLE');
  
  var code = '((' + status_var + ' & ' + fault_type + ') != 0)';
  return [code, generator.ORDER_LOGICAL_AND];
};