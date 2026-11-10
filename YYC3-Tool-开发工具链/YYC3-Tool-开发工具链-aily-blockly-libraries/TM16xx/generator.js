// TM16xx库的代码生成器

// 避免重复加载扩展
if (Blockly.Extensions.isRegistered('tm16xx_init_extension')) {
  Blockly.Extensions.unregister('tm16xx_init_extension');
}

// 注册扩展，用于处理不同芯片类型的引脚配置
Blockly.Extensions.register('tm16xx_init_extension', function() {
  this.setOnChange(function(changeEvent) {
    if (changeEvent.type === Blockly.Events.BLOCK_CHANGE && 
        changeEvent.name === 'CHIP_TYPE') {
      var chipType = this.getFieldValue('CHIP_TYPE');
      var stbField = this.getField('STB_PIN');
      
      // TM1637、TM1640、TM1650 不需要STB引脚
      if (chipType === 'TM1637' || chipType === 'TM1640' || chipType === 'TM1650') {
        stbField.setVisible(false);
      } else {
        stbField.setVisible(true);
      }
    }
  });
});

// 初始化TM16xx模块（完整版）
Arduino.forBlock['tm16xx_init'] = function(block, generator) {
  var chipType = block.getFieldValue('CHIP_TYPE');
  var dioPin = block.getFieldValue('DIO_PIN');
  var clkPin = block.getFieldValue('CLK_PIN');
  var stbPin = block.getFieldValue('STB_PIN');
  var digits = block.getFieldValue('DIGITS');
  
  // 添加库引用
  generator.addLibrary('#include <' + chipType + '.h>', '#include <' + chipType + '.h>');
  
  // 根据芯片类型生成不同的对象声明
  var objectDeclaration;
  if (chipType === 'TM1637' || chipType === 'TM1640' || chipType === 'TM1650') {
    objectDeclaration = chipType + ' tm16xx_module(' + dioPin + ', ' + clkPin + ');';
  } else {
    objectDeclaration = chipType + ' tm16xx_module(' + dioPin + ', ' + clkPin + ', ' + stbPin + ');';
  }
  
  generator.addObject('tm16xx_module_obj', objectDeclaration);
  
  // 添加初始化代码到setup
  generator.addSetup('tm16xx_setup', 'tm16xx_module.setupDisplay(true, 7);');
  
  return '';
};

// 初始化TM16xx模块（简化版，只有DIO和CLK）
Arduino.forBlock['tm16xx_simple_init'] = function(block, generator) {
  var chipType = block.getFieldValue('CHIP_TYPE');
  var dioPin = block.getFieldValue('DIO_PIN');
  var clkPin = block.getFieldValue('CLK_PIN');
  
  // 添加库引用
  generator.addLibrary('#include <' + chipType + '.h>', '#include <' + chipType + '.h>');
  
  // 生成对象声明
  var objectDeclaration = chipType + ' tm16xx_module(' + dioPin + ', ' + clkPin + ');';
  generator.addObject('tm16xx_module_obj', objectDeclaration);
  
  // 添加初始化代码到setup
  generator.addSetup('tm16xx_setup', 'tm16xx_module.setupDisplay(true, 7);');
  
  return '';
};

// 显示文本
Arduino.forBlock['tm16xx_display_string'] = function(block, generator) {
  var text = generator.valueToCode(block, 'TEXT', Arduino.ORDER_ATOMIC) || '""';
  
  return 'tm16xx_module.setDisplayToString(' + text + ');\n';
};

// 显示数字
Arduino.forBlock['tm16xx_display_number'] = function(block, generator) {
  var number = generator.valueToCode(block, 'NUMBER', Arduino.ORDER_ATOMIC) || '0';
  var dotPosition = block.getFieldValue('DOT_POSITION');
  
  var code;
  if (dotPosition === '0') {
    code = 'tm16xx_module.setDisplayToDecNumber(' + number + ');\n';
  } else {
    code = 'tm16xx_module.setDisplayToDecNumber(' + number + ', _BV(' + dotPosition + '));\n';
  }
  
  return code;
};

// 清空显示
Arduino.forBlock['tm16xx_clear_display'] = function(block, generator) {
  return 'tm16xx_module.clearDisplay();\n';
};

// 设置亮度
Arduino.forBlock['tm16xx_set_brightness'] = function(block, generator) {
  var brightness = block.getFieldValue('BRIGHTNESS');
  
  return 'tm16xx_module.setupDisplay(true, ' + brightness + ');\n';
};

// 设置段码
Arduino.forBlock['tm16xx_set_segment'] = function(block, generator) {
  var position = block.getFieldValue('POSITION');
  var segments = generator.valueToCode(block, 'SEGMENTS', Arduino.ORDER_ATOMIC) || '0';
  
  return 'tm16xx_module.setSegments(' + segments + ', ' + position + ');\n';
};

// 获取按键状态
Arduino.forBlock['tm16xx_get_buttons'] = function(block, generator) {
  return ['tm16xx_module.getButtons()', Arduino.ORDER_ATOMIC];
};

// 判断某个按键是否被按下
Arduino.forBlock['tm16xx_is_button_pressed'] = function(block, generator) {
  var button = block.getFieldValue('BUTTON');
  var buttonMask = Math.pow(2, button - 1);
  
  return ['(tm16xx_module.getButtons() & ' + buttonMask + ') != 0', Arduino.ORDER_EQUALITY];
};

// 显示时间
Arduino.forBlock['tm16xx_display_time'] = function(block, generator) {
  var hour = generator.valueToCode(block, 'HOUR', Arduino.ORDER_ATOMIC) || '0';
  var minute = generator.valueToCode(block, 'MINUTE', Arduino.ORDER_ATOMIC) || '0';
  var showColon = block.getFieldValue('SHOW_COLON') === 'TRUE';
  
  var code = '';
  code += 'int tm16xx_time = (' + hour + ') * 100 + (' + minute + ');\n';
  
  if (showColon) {
    code += 'tm16xx_module.setDisplayToDecNumber(tm16xx_time, _BV(4));\n';
  } else {
    code += 'tm16xx_module.setDisplayToDecNumber(tm16xx_time);\n';
  }
  
  return code;
};
