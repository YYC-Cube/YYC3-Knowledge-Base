'use strict';

// 板卡适配机制
function isESP32Core() {
  const boardConfig = window['boardConfig'];
  return boardConfig && boardConfig.core && boardConfig.core.indexOf('esp32') > -1;
}

Arduino.forBlock['ht16k33_init'] = function(block, generator) {
  const HT16K33_TYPE = 'HT16K33Matrix';
  // 变量重命名监听器
  if (!block._varMonitorAttached) {
    block._varMonitorAttached = true;
    block._varLastName = block.getFieldValue('VAR') || 'matrix';
    const varField = block.getField('VAR');
    if (varField) {
      const originalFinishEditing = varField.onFinishEditing_;
      varField.onFinishEditing_ = function(newName) {
        if (typeof originalFinishEditing === 'function') {
          originalFinishEditing.call(this, newName);
        }
        const workspace = block.workspace || (typeof Blockly !== 'undefined' && Blockly.getMainWorkspace && Blockly.getMainWorkspace());
        const oldName = block._varLastName;
        if (workspace && newName && newName !== oldName) {
          renameVariableInBlockly(block, oldName, newName, HT16K33_TYPE);
          block._varLastName = newName;
        }
      };
    }
  }

  const varName = block.getFieldValue('VAR') || 'matrix';
  const wire = block.getFieldValue('WIRE') || 'Wire';
  const address = block.getFieldValue('ADDRESS') || '0x70';

  // 添加库引用
  generator.addLibrary('Wire', '#include <Wire.h>');
  generator.addLibrary('HT16K33Matrix', '#include <ht16k33-matrix.h>');

  // 注册变量
  registerVariableToBlockly(varName, HT16K33_TYPE);

  // 声明对象
  generator.addObject(varName, HT16K33_TYPE + ' ' + varName + '(' + address + ');');

  // Wire 初始化
  generator.addSetup('wire_' + wire + '_begin', wire + '.begin();');

  // Serial初始化（用于错误输出）
  ensureSerialBegin("Serial", generator);

  // 初始化代码
  let setupCode = varName + '.begin(&' + wire + ');\n';
  return setupCode;
};

// 清屏
Arduino.forBlock['ht16k33_clear'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'matrix';
  return varName + '.clear();\n';
};

// 设置像素
Arduino.forBlock['ht16k33_set_pixel'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'matrix';
  const row = generator.valueToCode(block, 'ROW', generator.ORDER_ATOMIC) || '0';
  const col = generator.valueToCode(block, 'COL', generator.ORDER_ATOMIC) || '0';
  const state = block.getFieldValue('STATE') === 'true' ? 'true' : 'false';
  return varName + '.setPixel(' + row + ', ' + col + ', ' + state + ');\n';
};

// 刷新显示
Arduino.forBlock['ht16k33_display'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'matrix';
  return varName + '.display();\n';
};

// 设置亮度
Arduino.forBlock['ht16k33_set_brightness'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'matrix';
  var level = block.getFieldValue('LEVEL');
  return varName + '.setBrightness(' + level + ');\n';
};

// 设置旋转角度
Arduino.forBlock['ht16k33_set_rotation'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'matrix';
  const rotation = block.getFieldValue('ROTATION') || '0';
  return varName + '.setRotation(' + rotation + ');\n';
};

// 统一动画效果块
Arduino.forBlock['ht16k33_effect'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'matrix';
  const effect = block.getFieldValue('EFFECT') || 'rowScan';
  return varName + '.' + effect + '();\n';
};