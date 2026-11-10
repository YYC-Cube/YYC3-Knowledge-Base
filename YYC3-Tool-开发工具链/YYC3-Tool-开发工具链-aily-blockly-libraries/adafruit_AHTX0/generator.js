
// Adafruit AHTX0 温湿度传感器库的代码生成器

// 初始化AHT温湿度传感器
Arduino.forBlock['ahtx0_begin'] = function(block, generator) {
  // 添加必要的库
  generator.addLibrary('Adafruit_AHTX0', '#include <Adafruit_AHTX0.h>');
  generator.addVariable('aht_sensor', 'Adafruit_AHTX0 aht;');
  
  // 在setup部分初始化传感器
  generator.addSetupBegin('aht_begin', 'if (!aht.begin()) {\n  Serial.println("Could not find AHT sensor!");\n  while (1) delay(10);\n}\n');
  
  return '';
};

// 读取AHT温湿度传感器数据
Arduino.forBlock['ahtx0_read'] = function(block, generator) {
  generator.addVariable('aht_sensors', 'sensors_event_t humidity, temp;');
  
  return 'aht.getEvent(&humidity, &temp);\n';
};

// 获取温度值
Arduino.forBlock['ahtx0_get_temperature'] = function(block, generator) {
  generator.addVariable('aht_sensors', 'sensors_event_t humidity, temp;');
  return ['temp.temperature', Arduino.ORDER_ATOMIC];
};

// 获取湿度值
Arduino.forBlock['ahtx0_get_humidity'] = function(block, generator) {
  generator.addVariable('aht_sensors', 'sensors_event_t humidity, temp;');
  return ['humidity.relative_humidity', Arduino.ORDER_ATOMIC];
};
