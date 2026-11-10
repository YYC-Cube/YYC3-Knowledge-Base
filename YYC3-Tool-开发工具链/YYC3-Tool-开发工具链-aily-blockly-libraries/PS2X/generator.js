Arduino.forBlock['ps2x_init'] = function(block, generator) {
  var clk = block.getFieldValue('CLK');
  var cmd = block.getFieldValue('CMD');
  var att = block.getFieldValue('ATT');
  var dat = block.getFieldValue('DAT');
  var pressures = block.getFieldValue('PRESSURES');
  var rumble = block.getFieldValue('RUMBLE');
  
  generator.addLibrary('PS2X', '#include <PS2X_lib.h>');
  generator.addVariable('ps2x', 'PS2X ps2x;');
  generator.addVariable('ps2x_error', 'int ps2x_error = 0;');
  generator.addVariable('ps2x_type', 'byte ps2x_type = 0;');
  
  var initCode = 'delay(300);\n';
  initCode += '  ps2x_error = ps2x.config_gamepad(' + clk + ', ' + cmd + ', ' + att + ', ' + dat + ', ' + pressures + ', ' + rumble + ');\n';
  initCode += '  if(ps2x_error == 0){\n';
  initCode += '    Serial.println("Found Controller, configured successful");\n';
  initCode += '  } else if(ps2x_error == 1){\n';
  initCode += '    Serial.println("No controller found, check wiring");\n';
  initCode += '  } else if(ps2x_error == 2){\n';
  initCode += '    Serial.println("Controller found but not accepting commands");\n';
  initCode += '  } else if(ps2x_error == 3){\n';
  initCode += '    Serial.println("Controller refusing to enter Pressures mode");\n';
  initCode += '  }\n';
  initCode += '  ps2x_type = ps2x.readType();';
  
  generator.addSetupBegin('ps2x_setup', initCode);
  
  return '';
};

Arduino.forBlock['ps2x_read'] = function(block, generator) {
  var vibrate = generator.valueToCode(block, 'VIBRATE', Arduino.ORDER_ATOMIC) || '0';
  var code = 'if(ps2x_error != 1) {\n';
  code += '    ps2x.read_gamepad(false, ' + vibrate + ');\n';
  code += '  }';
  return code;
};

Arduino.forBlock['ps2x_button'] = function(block, generator) {
  var button = block.getFieldValue('BUTTON');
  var code = 'ps2x.Button(' + button + ')';
  return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['ps2x_button_pressed'] = function(block, generator) {
  var button = block.getFieldValue('BUTTON');
  var code = 'ps2x.ButtonPressed(' + button + ')';
  return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['ps2x_button_released'] = function(block, generator) {
  var button = block.getFieldValue('BUTTON');
  var code = 'ps2x.ButtonReleased(' + button + ')';
  return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['ps2x_analog'] = function(block, generator) {
  var analog = block.getFieldValue('ANALOG');
  var code = 'ps2x.Analog(' + analog + ')';
  return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['ps2x_analog_button'] = function(block, generator) {
  var button = block.getFieldValue('BUTTON');
  var code = 'ps2x.Analog(' + button + ')';
  return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['ps2x_controller_type'] = function(block, generator) {
  var code = 'ps2x_type';
  return [code, Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['ps2x_new_button_state'] = function(block, generator) {
  var code = 'ps2x.NewButtonState()';
  return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['ps2x_new_button_state_specific'] = function(block, generator) {
  var button = block.getFieldValue('BUTTON');
  var code = 'ps2x.NewButtonState(' + button + ')';
  return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['ps2x_is_connected'] = function(block, generator) {
  var code = '(ps2x_error == 0)';
  return [code, Arduino.ORDER_RELATIONAL];
};

// 简化版本的blocks
Arduino.forBlock['ps2x_simple_init'] = function(block, generator) {
  var clk = block.getFieldValue('CLK');
  var cmd = block.getFieldValue('CMD');
  var att = block.getFieldValue('ATT');
  var dat = block.getFieldValue('DAT');
  
  generator.addLibrary('PS2X', '#include <PS2X_lib.h>');
  generator.addVariable('ps2x', 'PS2X ps2x;');
  generator.addVariable('ps2x_error', 'int ps2x_error = 0;');
  
  var initCode = 'delay(300);\n';
  initCode += '  ps2x_error = ps2x.config_gamepad(' + clk + ', ' + cmd + ', ' + att + ', ' + dat + ', false, false);\n';
  initCode += '  if(ps2x_error == 0){\n';
  initCode += '    Serial.println("PS2 Controller Ready!");\n';
  initCode += '  } else {\n';
  initCode += '    Serial.println("PS2 Controller Error!");\n';
  initCode += '  }';
  
  generator.addSetupBegin('ps2x_simple_setup', initCode);
  
  return '';
};

Arduino.forBlock['ps2x_simple_read'] = function(block, generator) {
  var code = 'if(ps2x_error == 0) {\n';
  code += '    ps2x.read_gamepad();\n';
  code += '  }';
  return code;
};

Arduino.forBlock['ps2x_joystick_moved'] = function(block, generator) {
  var stick = block.getFieldValue('STICK');
  var code;
  
  if(stick === 'LEFT') {
    code = '(abs(ps2x.Analog(PSS_LX) - 128) > 30 || abs(ps2x.Analog(PSS_LY) - 128) > 30)';
  } else {
    code = '(abs(ps2x.Analog(PSS_RX) - 128) > 30 || abs(ps2x.Analog(PSS_RY) - 128) > 30)';
  }
  
  return [code, Arduino.ORDER_RELATIONAL];
};

Arduino.forBlock['ps2x_joystick_position'] = function(block, generator) {
  var stick = block.getFieldValue('STICK');
  var axis = block.getFieldValue('AXIS');
  var code;
  
  if(stick === 'LEFT') {
    code = axis === 'X' ? 'ps2x.Analog(PSS_LX)' : 'ps2x.Analog(PSS_LY)';
  } else {
    code = axis === 'X' ? 'ps2x.Analog(PSS_RX)' : 'ps2x.Analog(PSS_RY)';
  }
  
  return [code, Arduino.ORDER_FUNCTION_CALL];
};