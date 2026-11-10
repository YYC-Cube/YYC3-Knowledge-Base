Arduino.forBlock['wind_begin'] = function(block, generator) {
  const speedPin = block.getFieldValue('SPEED_PIN');
  const dirPin = block.getFieldValue('DIR_PIN');
  
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  generator.addSetupBegin('wind_begin', `  WindSpeed::begin(${speedPin}, ${dirPin});`);
  
  return '';
};

Arduino.forBlock['wind_begin_speed'] = function(block, generator) {
  const speedPin = block.getFieldValue('SPEED_PIN');
  
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  generator.addSetupBegin('wind_begin_speed', `  WindSpeed::beginWindSpeed(${speedPin});`);
  
  return '';
};

Arduino.forBlock['wind_begin_direction'] = function(block, generator) {
  const dirPin = block.getFieldValue('DIR_PIN');
  
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  generator.addSetupBegin('wind_begin_direction', `  WindSpeed::beginWindDirection(${dirPin});`);
  
  return '';
};

Arduino.forBlock['wind_update'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  
  return 'WindSpeed::update();\n';
};

Arduino.forBlock['wind_update_speed'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  
  return 'WindSpeed::updateWindSpeed();\n';
};

Arduino.forBlock['wind_update_direction'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  
  return 'WindSpeed::updateWindDirection();\n';
};

Arduino.forBlock['wind_get_speed_kmh'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  
  return ['WindSpeed::getWindSpeed()', generator.ORDER_ATOMIC];
};

Arduino.forBlock['wind_get_speed_mph'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  
  return ['WindSpeed::getWindSpeedMph()', generator.ORDER_ATOMIC];
};

Arduino.forBlock['wind_get_direction'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  
  return ['WindSpeed::getWindDirection()', generator.ORDER_ATOMIC];
};

Arduino.forBlock['wind_get_direction_string'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  
  return ['WindSpeed::getWindDirectionString()', generator.ORDER_ATOMIC];
};

Arduino.forBlock['wind_get_direction_adc'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  
  return ['WindSpeed::getWindDirectionADC()', generator.ORDER_ATOMIC];
};

Arduino.forBlock['wind_is_data_ready'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  
  return ['WindSpeed::isDataReady()', generator.ORDER_ATOMIC];
};

// 初始化雨量传感器
Arduino.forBlock['rain_init'] = function(block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  generator.addSetupBegin('rain_init', 'RainSensor::begin(' + pin + ');');
  return '';
};

// 更新雨量数据
Arduino.forBlock['rain_update'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  return 'RainSensor::update();\n';
};

// 获取累计降雨量（毫米）
Arduino.forBlock['rain_get_total'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  return ['RainSensor::getRainfallTotal()', Arduino.ORDER_FUNCTION_CALL];
};

// 获取最近1小时降雨量（毫米）
Arduino.forBlock['rain_get_hour'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  return ['RainSensor::getRainfallLastHour()', Arduino.ORDER_FUNCTION_CALL];
};

// 获取最近24小时降雨量（毫米）
Arduino.forBlock['rain_get_day'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  return ['RainSensor::getRainfallLastDay()', Arduino.ORDER_FUNCTION_CALL];
};

// 获取雨滴计数
Arduino.forBlock['rain_get_ticks'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  return ['RainSensor::getRainTicks()', Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['rain_is_data_ready'] = function(block, generator) {
  generator.addLibrary('#include <Wind.h>', '#include "Wind.h"');
  return ['RainSensor::isDataReady()', generator.ORDER_ATOMIC];
};