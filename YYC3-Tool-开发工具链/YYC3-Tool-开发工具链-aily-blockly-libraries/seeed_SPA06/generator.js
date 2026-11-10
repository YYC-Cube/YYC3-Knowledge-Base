/**
 * SPA06 (SPL07-003) 气压温度传感器代码生成器
 * 用于读取气压、温度和海拔高度数据
 */

// SPA06初始化
Arduino.forBlock['spa06_init'] = function(block, generator) {
  generator.addLibrary('include_wire', '#include <Wire.h>');
  generator.addLibrary('include_spl07', '#include <SPL07-003.h>');

  generator.addVariable('spa06_object', 'SPL07_003 spa06;');

  var address = block.getFieldValue('ADDRESS') || '0x77';

  generator.addSetupBegin('wire_begin', 'Wire.begin();');
  generator.addSetupBegin('spa06_begin', 'spa06.begin(' + address + ', &Wire);');

  return '';
};

// 读取温度
Arduino.forBlock['spa06_read_temperature'] = function(block, generator) {
  var code = 'spa06.readTemperature()';
  return [code, Arduino.ORDER_ATOMIC];
};

// 读取气压
Arduino.forBlock['spa06_read_pressure'] = function(block, generator) {
  var code = 'spa06.readPressure()';
  return [code, Arduino.ORDER_ATOMIC];
};

// 读取海拔
Arduino.forBlock['spa06_read_altitude'] = function(block, generator) {
  var code = 'spa06.calcAltitude()';
  return [code, Arduino.ORDER_ATOMIC];
};

// 气压数据就绪
Arduino.forBlock['spa06_pressure_available'] = function(block, generator) {
  var code = 'spa06.pressureAvailable()';
  return [code, Arduino.ORDER_ATOMIC];
};

// 温度数据就绪
Arduino.forBlock['spa06_temperature_available'] = function(block, generator) {
  var code = 'spa06.temperatureAvailable()';
  return [code, Arduino.ORDER_ATOMIC];
};

// 设置工作模式
Arduino.forBlock['spa06_set_mode'] = function(block, generator) {
  var mode = block.getFieldValue('MODE');
  var code = 'spa06.setMode(' + mode + ');\n';
  return code;
};

// 设置气压采样配置
Arduino.forBlock['spa06_set_pressure_config'] = function(block, generator) {
  var rate = block.getFieldValue('RATE');
  var oversample = block.getFieldValue('OVERSAMPLE');
  var code = 'spa06.setPressureConfig(' + rate + ', ' + oversample + ');\n';
  return code;
};

// 设置温度采样配置
Arduino.forBlock['spa06_set_temperature_config'] = function(block, generator) {
  var rate = block.getFieldValue('RATE');
  var oversample = block.getFieldValue('OVERSAMPLE');
  var code = 'spa06.setTemperatureConfig(' + rate + ', ' + oversample + ');\n';
  return code;
};

// 设置气压偏移
Arduino.forBlock['spa06_set_pressure_offset'] = function(block, generator) {
  var offset = generator.valueToCode(block, 'OFFSET', Arduino.ORDER_ATOMIC) || '0';
  var code = 'spa06.setPressureOffset(' + offset + ');\n';
  return code;
};

// 设置温度偏移
Arduino.forBlock['spa06_set_temperature_offset'] = function(block, generator) {
  var offset = generator.valueToCode(block, 'OFFSET', Arduino.ORDER_ATOMIC) || '0';
  var code = 'spa06.setTemperatureOffset(' + offset + ');\n';
  return code;
};
