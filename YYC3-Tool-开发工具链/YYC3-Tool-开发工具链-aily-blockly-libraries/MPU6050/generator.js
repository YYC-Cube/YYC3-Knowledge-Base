Arduino.forBlock['mpu6050_begin'] = function(block, generator) {
  // 添加库引用
  generator.addLibrary('Wire', '#include <Wire.h>');
  generator.addLibrary('Adafruit_MPU6050', '#include <Adafruit_MPU6050.h>');
  generator.addLibrary('Adafruit_Sensor', '#include <Adafruit_Sensor.h>');
  
  // 添加对象定义
  generator.addObject('mpu6050', 'Adafruit_MPU6050 mpu;');
  generator.addVariable('mpu6050_events', 'sensors_event_t a, g, temp;');
  
  // 添加初始化代码到setup
  generator.addSetupBegin('mpu6050_begin', 'if (!mpu.begin()) {\n  Serial.println("Failed to find MPU6050 chip");\n  while (1) {\n    delay(10);\n  }\n}\n\n  // 设置默认参数\n  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);\n  mpu.setGyroRange(MPU6050_RANGE_500_DEG);\n  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);');
  
  return '';
};

Arduino.forBlock['mpu6050_get_accel'] = function(block, generator) {
  var axis = block.getFieldValue('AXIS');
  
  // 确保事件数据更新
  var code = 'mpu.getEvent(&a, &g, &temp); a.acceleration.' + axis;
  return [code, Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['mpu6050_get_gyro'] = function(block, generator) {
  var axis = block.getFieldValue('AXIS');
  
  // 获取角速度数据 (需要转换回度/秒，因为库返回的是弧度/秒)
  var code = 'mpu.getEvent(&a, &g, &temp); (g.gyro.' + axis + ' * 57.2958)'; // 57.2958 = 180/PI 将弧度转为度
  return [code, Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['mpu6050_get_temp'] = function(block, generator) {
  // 获取温度数据
  var code = 'mpu.getEvent(&a, &g, &temp); temp.temperature';
  return [code, Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['mpu6050_set_accel_range'] = function(block, generator) {
  var range = block.getFieldValue('RANGE');
  return 'mpu.setAccelerometerRange(' + range + ');\n';
};

Arduino.forBlock['mpu6050_set_gyro_range'] = function(block, generator) {
  var range = block.getFieldValue('RANGE');
  return 'mpu.setGyroRange(' + range + ');\n';
};

Arduino.forBlock['mpu6050_set_filter_bandwidth'] = function(block, generator) {
  var bandwidth = block.getFieldValue('BANDWIDTH');
  return 'mpu.setFilterBandwidth(' + bandwidth + ');\n';
};