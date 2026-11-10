// Seeed PCA9685 Blockly Generator for Aily Platform

// ==================== PCA9685 PWM 控制块 ====================

// 初始化 PCA9685 PWM 控制器（创建+初始化合并）
Arduino.forBlock['seeed_pca9685_init'] = function(block, generator) {
  // 变量重命名监听
  if (!block._pca9685VarMonitorAttached) {
    block._pca9685VarMonitorAttached = true;
    block._pca9685VarLastName = block.getFieldValue('VAR') || 'pwm';
    registerVariableToBlockly(block._pca9685VarLastName, 'PCA9685');
    const varField = block.getField('VAR');
    if (varField) {
      const originalFinishEditing = varField.onFinishEditing_;
      varField.onFinishEditing_ = function(newName) {
        if (typeof originalFinishEditing === 'function') {
          originalFinishEditing.call(this, newName);
        }
        const workspace = block.workspace || (typeof Blockly !== 'undefined' && Blockly.getMainWorkspace && Blockly.getMainWorkspace());
        const oldName = block._pca9685VarLastName;
        if (workspace && newName && newName !== oldName) {
          renameVariableInBlockly(block, oldName, newName, 'PCA9685');
          block._pca9685VarLastName = newName;
        }
      };
    }
  }

  const varName = block.getFieldValue('VAR') || 'pwm';
  const address = block.getFieldValue('ADDRESS') || '0x7f';

  generator.addLibrary('Wire', '#include <Wire.h>');
  generator.addLibrary('PCA9685', '#include <PCA9685.h>');
  registerVariableToBlockly(varName, 'PCA9685');
  generator.addVariable(varName, 'PCA9685 ' + varName + ';');
  generator.addSetupBegin('Wire.begin', 'Wire.begin();');

  return varName + '.init(' + address + ');\n';
};

// 设置 PWM 频率
Arduino.forBlock['seeed_pca9685_set_frequency'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'pwm';
  const freq = generator.valueToCode(block, 'FREQ', generator.ORDER_ATOMIC) || '1000';

  return varName + '.setFrequency(' + freq + ');\n';
};

// 设置 PWM 值
Arduino.forBlock['seeed_pca9685_set_pwm'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'pwm';
  const pin = generator.valueToCode(block, 'PIN', generator.ORDER_ATOMIC) || '1';
  const on = generator.valueToCode(block, 'ON', generator.ORDER_ATOMIC) || '0';
  const off = generator.valueToCode(block, 'OFF', generator.ORDER_ATOMIC) || '1024';

  return varName + '.setPwm(' + pin + ', ' + on + ', ' + off + ');\n';
};

// ==================== ServoDriver 舵机控制块 ====================

// 初始化 ServoDriver 舵机驱动器（创建+初始化合并）
Arduino.forBlock['seeed_pca9685_servo_init'] = function(block, generator) {
  // 变量重命名监听
  if (!block._servoVarMonitorAttached) {
    block._servoVarMonitorAttached = true;
    block._servoVarLastName = block.getFieldValue('VAR') || 'servo';
    registerVariableToBlockly(block._servoVarLastName, 'ServoDriver');
    const varField = block.getField('VAR');
    if (varField) {
      const originalFinishEditing = varField.onFinishEditing_;
      varField.onFinishEditing_ = function(newName) {
        if (typeof originalFinishEditing === 'function') {
          originalFinishEditing.call(this, newName);
        }
        const workspace = block.workspace || (typeof Blockly !== 'undefined' && Blockly.getMainWorkspace && Blockly.getMainWorkspace());
        const oldName = block._servoVarLastName;
        if (workspace && newName && newName !== oldName) {
          renameVariableInBlockly(block, oldName, newName, 'ServoDriver');
          block._servoVarLastName = newName;
        }
      };
    }
  }

  const varName = block.getFieldValue('VAR') || 'servo';
  const address = block.getFieldValue('ADDRESS') || '0x7f';

  generator.addLibrary('Wire', '#include <Wire.h>');
  generator.addLibrary('PCA9685', '#include <PCA9685.h>');
  registerVariableToBlockly(varName, 'ServoDriver');
  generator.addVariable(varName, 'ServoDriver ' + varName + ';');
  generator.addSetupBegin('Wire.begin', 'Wire.begin();');

  return varName + '.init(' + address + ');\n';
};

// 设置舵机脉冲范围
Arduino.forBlock['seeed_pca9685_servo_set_pulse_range'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'servo';
  const min = generator.valueToCode(block, 'MIN', generator.ORDER_ATOMIC) || '500';
  const max = generator.valueToCode(block, 'MAX', generator.ORDER_ATOMIC) || '2500';
  const degree = generator.valueToCode(block, 'DEGREE', generator.ORDER_ATOMIC) || '180';

  return varName + '.setServoPulseRange(' + min + ', ' + max + ', ' + degree + ');\n';
};

// 设置舵机角度
Arduino.forBlock['seeed_pca9685_servo_set_angle'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'servo';
  const pin = generator.valueToCode(block, 'PIN', generator.ORDER_ATOMIC) || '1';
  const angle = generator.valueToCode(block, 'ANGLE', generator.ORDER_ATOMIC) || '90';

  return varName + '.setAngle(' + pin + ', ' + angle + ');\n';
};
