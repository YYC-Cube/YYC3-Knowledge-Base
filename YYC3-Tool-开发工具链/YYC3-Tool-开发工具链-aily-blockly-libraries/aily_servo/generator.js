/**
 * Servo library for Arduino - Combined generator code for Blockly
 * 
 * 支持平台:
 * - Arduino (使用标准 Servo 库)
 * - ESP32 (使用 ESP32Servo 库)
 * 
 * ESP32 可用GPIO引脚:
 * - 推荐: 4, 5, 12-19, 21-23, 25-27, 32, 33
 * - 避免: 6-11 (SPI闪存), 34-39 (仅输入), 0,2 (启动控制)
 */

// 通用库管理函数，确保不重复添加库
function ensureLibrary(generator, libraryKey, libraryCode) {
  if (!generator.libraries_) {
    generator.libraries_ = {};
  }
  if (!generator.libraries_[libraryKey]) {
    generator.addLibrary(libraryKey, libraryCode);
  }
}

// 检测是否为ESP32核心
function isESP32Core() {
  const boardConfig = window['boardConfig'];
  return boardConfig && boardConfig.core && boardConfig.core.indexOf('esp32') > -1;
}

// 通用添加Servo库代码，确保不会重复添加
function ensureServoLibrary(generator) {
  // 检测是否为ESP32核心（参考boardConfig检测方式）
  const isESP32 = isESP32Core();
  var libraryCode = isESP32 ? '#include <ESP32Servo.h>' : '#include <Servo.h>';
  ensureLibrary(generator, 'servo', libraryCode);
}

// 舵机初始化（基础版本）
Arduino.forBlock['servo_attach'] = function(block, generator) {
  ensureServoLibrary(generator);
  
  // PIN是dropdown字段，使用getFieldValue获取
  var pin = block.getFieldValue('PIN') || '18';
  var servoName = 'servo_pin_' + pin;
  
  // 使用addObject来声明舵机对象
  generator.addObject(servoName, 'Servo ' + servoName + ';');
  
  // 在setup中初始化舵机连接
  generator.addSetupBegin('servo_attach_' + pin, servoName + '.attach(' + pin + ');');
  
  var code = '// 引脚 ' + pin + ' 舵机已初始化\n';
  return code;
};

// 舵机初始化（高级版本）
Arduino.forBlock['servo_attach_advanced'] = function(block, generator) {
  ensureServoLibrary(generator);
  var pin = block.getFieldValue('PIN') || '18';
  var minPulseWidth = generator.valueToCode(block, 'MIN_PULSE_WIDTH', generator.ORDER_ATOMIC) || '544';
  var maxPulseWidth = generator.valueToCode(block, 'MAX_PULSE_WIDTH', generator.ORDER_ATOMIC) || '2400';
  var servoName = 'servo_pin_' + pin;
  generator.addObject(servoName, 'Servo ' + servoName + ';');
  generator.addSetupBegin('servo_attach_' + pin, servoName + '.attach(' + pin + ', ' + minPulseWidth + ', ' + maxPulseWidth + ');');
  var code = '// 引脚 ' + pin + ' 舵机已初始化 (脉宽范围: ' + minPulseWidth + '-' + maxPulseWidth + 'μs)\n';
  return code;
};

// 舵机连接到引脚（完整版本）
Arduino.forBlock['servo_attach_full'] = function(block, generator) {
  ensureServoLibrary(generator);
  var pin = block.getFieldValue('PIN') || '18';
  var minPulseWidth = generator.valueToCode(block, 'MIN_PULSE_WIDTH', generator.ORDER_ATOMIC) || '544';
  var maxPulseWidth = generator.valueToCode(block, 'MAX_PULSE_WIDTH', generator.ORDER_ATOMIC) || '2400';
  var servoName = 'servo_pin_' + pin;
  generator.addObject(servoName, 'Servo ' + servoName + ';');
  generator.addSetupBegin('servo_attach_' + pin, servoName + '.attach(' + pin + ', ' + minPulseWidth + ', ' + maxPulseWidth + ');');
  var code = '// 引脚 ' + pin + ' 舵机已初始化 (完整模式: 脉宽' + minPulseWidth + '-' + maxPulseWidth + 'μs)\n';
  return code;
};

// 舵机写入角度
Arduino.forBlock['servo_write'] = function(block, generator) {
  ensureServoLibrary(generator);
  
  var pin = block.getFieldValue('PIN') || '18';
  var angle = generator.valueToCode(block, 'ANGLE', generator.ORDER_ATOMIC) || '90';
  var servoName = 'servo_pin_' + pin;
  
  // 确保舵机对象和初始化
  generator.addObject(servoName, 'Servo ' + servoName + ';');
  generator.addSetupBegin('servo_attach_' + pin, servoName + '.attach(' + pin + ');');
  
  // 生成控制舵机角度的代码
  var code = servoName + '.write(' + angle + ');\n';
  return code;
};

// 舵机写入脉宽
Arduino.forBlock['servo_write_microseconds'] = function(block, generator) {
  ensureServoLibrary(generator);
  
  var pin = block.getFieldValue('PIN') || '18';
  var microseconds = generator.valueToCode(block, 'MICROSECONDS', generator.ORDER_ATOMIC) || '1500';
  var servoName = 'servo_pin_' + pin;
  
  // 确保舵机对象和初始化
  generator.addObject(servoName, 'Servo ' + servoName + ';');
  generator.addSetupBegin('servo_attach_' + pin, servoName + '.attach(' + pin + ');');
  
  // 生成控制舵机脉宽的代码
  var code = servoName + '.writeMicroseconds(' + microseconds + ');\n';
  return code;
};

// 舵机读取角度
Arduino.forBlock['servo_read'] = function(block, generator) {
  ensureServoLibrary(generator);
  
  var pin = block.getFieldValue('PIN') || '18';
  var servoName = 'servo_pin_' + pin;
  
  // 确保舵机对象和初始化
  generator.addObject(servoName, 'Servo ' + servoName + ';');
  generator.addSetupBegin('servo_attach_' + pin, servoName + '.attach(' + pin + ');');
  
  var code = servoName + '.read()';
  return [code, generator.ORDER_FUNCTION_CALL];
};

// 舵机读取脉宽
Arduino.forBlock['servo_read_microseconds'] = function(block, generator) {
  ensureServoLibrary(generator);
  
  var pin = block.getFieldValue('PIN') || '18';
  var servoName = 'servo_pin_' + pin;
  
  // 确保舵机对象和初始化
  generator.addObject(servoName, 'Servo ' + servoName + ';');
  generator.addSetupBegin('servo_attach_' + pin, servoName + '.attach(' + pin + ');');
  
  var code = servoName + '.readMicroseconds()';
  return [code, generator.ORDER_FUNCTION_CALL];
};

// 舵机连接状态检查
Arduino.forBlock['servo_attached'] = function(block, generator) {
  ensureServoLibrary(generator);
  
  var pin = block.getFieldValue('PIN') || '18';
  var servoName = 'servo_pin_' + pin;
  
  // 确保舵机对象和初始化
  generator.addObject(servoName, 'Servo ' + servoName + ';');
  generator.addSetupBegin('servo_attach_' + pin, servoName + '.attach(' + pin + ');');
  
  var code = servoName + '.attached()';
  return [code, generator.ORDER_FUNCTION_CALL];
};

// 舵机断开连接
Arduino.forBlock['servo_detach'] = function(block, generator) {
  ensureServoLibrary(generator);
  
  var pin = block.getFieldValue('PIN') || '18';
  var servoName = 'servo_pin_' + pin;
  
  // 确保舵机对象已声明（但不需要在setup中自动attach）
  generator.addObject(servoName, 'Servo ' + servoName + ';');
  
  var code = servoName + '.detach();\n';
  return code;
};

// 获取舵机连接的引脚
Arduino.forBlock['servo_get_pin'] = function(block, generator) {
  ensureServoLibrary(generator);
  
  var pin = block.getFieldValue('PIN') || '18';
  var servoName = 'servo_pin_' + pin;
  
  // 确保舵机对象和初始化
  generator.addObject(servoName, 'Servo ' + servoName + ';');
  generator.addSetupBegin('servo_attach_' + pin, servoName + '.attach(' + pin + ');');
  
  // 对于引脚自动管理模式，直接返回引脚号
  var code = pin;
  return [code, generator.ORDER_ATOMIC];
};

// 舵机精确角度控制（浮点数）
Arduino.forBlock['servo_write_float'] = function(block, generator) {
  ensureServoLibrary(generator);
  
  var pin = block.getFieldValue('PIN') || '18';
  var angle = generator.valueToCode(block, 'ANGLE', generator.ORDER_ATOMIC) || '90.0';
  var servoName = 'servo_pin_' + pin;
  
  // 确保舵机对象和初始化
  generator.addObject(servoName, 'Servo ' + servoName + ';');
  generator.addSetupBegin('servo_attach_' + pin, servoName + '.attach(' + pin + ');');
  
  // 检测是否为ESP32核心
  const isESP32 = isESP32Core();
  
  // ESP32Servo支持writeFloat方法，标准Servo使用write方法
  // if (isESP32) {
  //   var code = servoName + '.writeFloat(' + angle + ');\n';
  // } else {
  var code = servoName + '.write(' + angle + ');\n';
  // }
  return code;
};

// 数值映射到角度
Arduino.forBlock['servo_map_angle'] = function(block, generator) {
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
  var fromMin = generator.valueToCode(block, 'FROM_MIN', generator.ORDER_ATOMIC) || '0';
  var fromMax = generator.valueToCode(block, 'FROM_MAX', generator.ORDER_ATOMIC) || '1023';
  var toMin = generator.valueToCode(block, 'TO_MIN', generator.ORDER_ATOMIC) || '0';
  var toMax = generator.valueToCode(block, 'TO_MAX', generator.ORDER_ATOMIC) || '180';
  
  var code = 'map(' + value + ', ' + fromMin + ', ' + fromMax + ', ' + toMin + ', ' + toMax + ')';
  return [code, generator.ORDER_FUNCTION_CALL];
};

// 舵机扫描功能
Arduino.forBlock['servo_sweep'] = function(block, generator) {
  ensureServoLibrary(generator);
  
  var pin = block.getFieldValue('PIN') || '18';
  var startAngle = generator.valueToCode(block, 'START_ANGLE', generator.ORDER_ATOMIC) || '0';
  var endAngle = generator.valueToCode(block, 'END_ANGLE', generator.ORDER_ATOMIC) || '180';
  var delayMs = generator.valueToCode(block, 'DELAY_MS', generator.ORDER_ATOMIC) || '20';
  var servoName = 'servo_pin_' + pin;
  
  // 确保舵机对象和初始化
  generator.addObject(servoName, 'Servo ' + servoName + ';');
  generator.addSetupBegin('servo_attach_' + pin, servoName + '.attach(' + pin + ');');
  
  var code = '';
  code += '// 引脚 ' + pin + ' 舵机扫描从 ' + startAngle + ' 度到 ' + endAngle + ' 度\n';
  code += 'for (int angle = ' + startAngle + '; angle <= ' + endAngle + '; angle++) {\n';
  code += '  ' + servoName + '.write(angle);\n';
  code += '  delay(' + delayMs + ');\n';
  code += '}\n';
  code += 'for (int angle = ' + endAngle + '; angle >= ' + startAngle + '; angle--) {\n';
  code += '  ' + servoName + '.write(angle);\n';
  code += '  delay(' + delayMs + ');\n';
  code += '}\n';
  
  return code;
};

// 舵机角度值
Arduino.forBlock['servo_angle'] = function(block, generator) {
  // 获取角度值
  var angle = block.getFieldValue('ANGLE');
  return [angle, generator.ORDER_ATOMIC];
};
