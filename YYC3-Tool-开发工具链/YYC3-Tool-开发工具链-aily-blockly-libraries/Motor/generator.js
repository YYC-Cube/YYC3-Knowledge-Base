Arduino.forBlock['afmotor_dc_init'] = function(block, generator) {
  var motor_num = block.getFieldValue('MOTOR');
  var freq = block.getFieldValue('FREQ');
  
  // 添加库引用
  generator.addLibrary('#include <AFMotor.h>', '#include <AFMotor.h>');
  
  // 创建电机对象
  var motorVariable = 'motor' + motor_num;
  generator.addObject('AF_DCMotor ' + motorVariable, 'AF_DCMotor ' + motorVariable + '(' + motor_num + ', ' + freq + ')');
  
  return '';
};

Arduino.forBlock['afmotor_dc_run'] = function(block, generator) {
  var motor_num = block.getFieldValue('MOTOR');
  var direction = block.getFieldValue('DIRECTION');
  var speed = generator.valueToCode(block, 'SPEED', Arduino.ORDER_ATOMIC) || '0';
  
  var motorVariable = 'motor' + motor_num;
  
  var code = motorVariable + '.setSpeed(' + speed + ');\n';
  code += motorVariable + '.run(' + direction + ');\n';
  
  return code;
};

Arduino.forBlock['afmotor_stepper_init'] = function(block, generator) {
  var stepper_num = block.getFieldValue('STEPPER');
  var steps = generator.valueToCode(block, 'STEPS', Arduino.ORDER_ATOMIC) || '200';
  
  // 添加库引用
  generator.addLibrary('#include <AFMotor.h>', '#include <AFMotor.h>');
  
  // 创建步进电机对象
  var stepperVariable = 'stepper' + stepper_num;
  generator.addObject('AF_Stepper ' + stepperVariable, 'AF_Stepper ' + stepperVariable + '(' + steps + ', ' + stepper_num + ')');
  
  return '';
};

Arduino.forBlock['afmotor_stepper_setspeed'] = function(block, generator) {
  var stepper_num = block.getFieldValue('STEPPER');
  var rpm = generator.valueToCode(block, 'RPM', Arduino.ORDER_ATOMIC) || '10';
  
  var stepperVariable = 'stepper' + stepper_num;
  
  var code = stepperVariable + '.setSpeed(' + rpm + ');\n';
  
  return code;
};

Arduino.forBlock['afmotor_stepper_step'] = function(block, generator) {
  var stepper_num = block.getFieldValue('STEPPER');
  var steps = generator.valueToCode(block, 'STEPS', Arduino.ORDER_ATOMIC) || '100';
  var direction = block.getFieldValue('DIRECTION');
  var style = block.getFieldValue('STYLE');
  
  var stepperVariable = 'stepper' + stepper_num;
  
  var code = stepperVariable + '.step(' + steps + ', ' + direction + ', ' + style + ');\n';
  
  return code;
};

Arduino.forBlock['afmotor_stepper_onestep'] = function(block, generator) {
  var stepper_num = block.getFieldValue('STEPPER');
  var direction = block.getFieldValue('DIRECTION');
  var style = block.getFieldValue('STYLE');
  
  var stepperVariable = 'stepper' + stepper_num;
  
  var code = stepperVariable + '.onestep(' + direction + ', ' + style + ');\n';
  
  return code;
};

Arduino.forBlock['afmotor_stepper_release'] = function(block, generator) {
  var stepper_num = block.getFieldValue('STEPPER');
  
  var stepperVariable = 'stepper' + stepper_num;
  
  var code = stepperVariable + '.release();\n';
  
  return code;
};