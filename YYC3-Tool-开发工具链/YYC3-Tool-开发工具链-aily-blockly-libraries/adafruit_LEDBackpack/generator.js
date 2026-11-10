// Adafruit LED Backpack generator.js
// 使用全局单例对象 ledbp，init 块根据所选类型决定类

// 初始化
Arduino.forBlock['ledbp_init'] = function(block, generator) {
  var displayType = block.getFieldValue('DISPLAY_TYPE') || 'Adafruit_7segment';
  var addr = generator.valueToCode(block, 'ADDR', generator.ORDER_ATOMIC) || '0x70';

  generator.addLibrary('Wire', '#include <Wire.h>');
  generator.addLibrary('Adafruit_GFX', '#include <Adafruit_GFX.h>');
  generator.addLibrary('Adafruit_LEDBackpack', '#include <Adafruit_LEDBackpack.h>');

  generator.addObject('ledbp', displayType + ' ledbp = ' + displayType + '();');
  generator.addSetupBegin('ledbp_begin', 'ledbp.begin(' + addr + ');');

  return '';
};

// 刷新显示
Arduino.forBlock['ledbp_write_display'] = function(block, generator) {
  return 'ledbp.writeDisplay();\n';
};

// 清除缓冲
Arduino.forBlock['ledbp_clear'] = function(block, generator) {
  return 'ledbp.clear();\n';
};

// 设置亮度
Arduino.forBlock['ledbp_set_brightness'] = function(block, generator) {
  var brightness = generator.valueToCode(block, 'BRIGHTNESS', generator.ORDER_ATOMIC) || '15';
  return 'ledbp.setBrightness(' + brightness + ');\n';
};

// 闪烁速率
Arduino.forBlock['ledbp_blink_rate'] = function(block, generator) {
  var rate = block.getFieldValue('RATE') || 'HT16K33_BLINK_OFF';
  return 'ledbp.blinkRate(' + rate + ');\n';
};

// 设置显示开关
Arduino.forBlock['ledbp_set_display_state'] = function(block, generator) {
  var state = block.getFieldValue('STATE') || 'true';
  return 'ledbp.setDisplayState(' + state + ');\n';
};

// 7段显示数字（带自动刷新）
Arduino.forBlock['ledbp_seven_print_number'] = function(block, generator) {
  var num = generator.valueToCode(block, 'NUM', generator.ORDER_ATOMIC) || '0';
  var code = 'ledbp.print(' + num + ');\n';
  code += 'ledbp.writeDisplay();\n';
  return code;
};

// 7段显示指定进制
Arduino.forBlock['ledbp_seven_print_number_base'] = function(block, generator) {
  var num = generator.valueToCode(block, 'NUM', generator.ORDER_ATOMIC) || '0';
  var base = block.getFieldValue('BASE') || 'DEC';
  var code = 'ledbp.print(' + num + ', ' + base + ');\n';
  code += 'ledbp.writeDisplay();\n';
  return code;
};

// 7段写入单个数字
Arduino.forBlock['ledbp_seven_write_digit_num'] = function(block, generator) {
  var pos = generator.valueToCode(block, 'POS', generator.ORDER_ATOMIC) || '0';
  var num = generator.valueToCode(block, 'NUM', generator.ORDER_ATOMIC) || '0';
  var dot = block.getFieldValue('DOT') || 'false';
  return 'ledbp.writeDigitNum(' + pos + ', ' + num + ', ' + dot + ');\n';
};

// 7段冒号
Arduino.forBlock['ledbp_seven_draw_colon'] = function(block, generator) {
  var state = block.getFieldValue('STATE') || 'true';
  var code = 'ledbp.drawColon(' + state + ');\n';
  code += 'ledbp.writeDisplay();\n';
  return code;
};

// 14段字符数码管 写入ASCII
Arduino.forBlock['ledbp_alpha_write_digit_ascii'] = function(block, generator) {
  var pos = generator.valueToCode(block, 'POS', generator.ORDER_ATOMIC) || '0';
  var ch = generator.valueToCode(block, 'CHAR', generator.ORDER_ATOMIC) || "' '";
  var dot = block.getFieldValue('DOT') || 'false';
  return 'ledbp.writeDigitAscii(' + pos + ', ' + ch + ', ' + dot + ');\n';
};

// 14段字符数码管 打印文本
Arduino.forBlock['ledbp_alpha_print_text'] = function(block, generator) {
  var text = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC) || '""';
  // 生成辅助函数：按位写入ASCII字符
  var functionDef = '';
  functionDef += 'void ledbp_alpha_print(Adafruit_AlphaNum4 &disp, const char *s) {\n';
  functionDef += '  for (uint8_t i = 0; i < 4; i++) {\n';
  functionDef += '    char c = s[i];\n';
  functionDef += '    if (c == 0) { disp.writeDigitAscii(i, \' \'); }\n';
  functionDef += '    else { disp.writeDigitAscii(i, c); }\n';
  functionDef += '    if (c == 0) break;\n';
  functionDef += '  }\n';
  functionDef += '  disp.writeDisplay();\n';
  functionDef += '}\n';
  generator.addFunction('ledbp_alpha_print_function', functionDef, true);
  return 'ledbp_alpha_print(ledbp, ' + text + ');\n';
};

// 颜色值
Arduino.forBlock['ledbp_matrix_color'] = function(block, generator) {
  var color = block.getFieldValue('COLOR') || 'LED_ON';
  return [color, generator.ORDER_ATOMIC];
};

// 点阵 画点
Arduino.forBlock['ledbp_matrix_draw_pixel'] = function(block, generator) {
  var x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  var color = generator.valueToCode(block, 'COLOR', generator.ORDER_ATOMIC) || 'LED_ON';
  return 'ledbp.drawPixel(' + x + ', ' + y + ', ' + color + ');\n';
};

// 点阵 画线
Arduino.forBlock['ledbp_matrix_draw_line'] = function(block, generator) {
  var x0 = generator.valueToCode(block, 'X0', generator.ORDER_ATOMIC) || '0';
  var y0 = generator.valueToCode(block, 'Y0', generator.ORDER_ATOMIC) || '0';
  var x1 = generator.valueToCode(block, 'X1', generator.ORDER_ATOMIC) || '0';
  var y1 = generator.valueToCode(block, 'Y1', generator.ORDER_ATOMIC) || '0';
  var color = generator.valueToCode(block, 'COLOR', generator.ORDER_ATOMIC) || 'LED_ON';
  return 'ledbp.drawLine(' + x0 + ', ' + y0 + ', ' + x1 + ', ' + y1 + ', ' + color + ');\n';
};

// 点阵 画矩形
Arduino.forBlock['ledbp_matrix_draw_rect'] = function(block, generator) {
  var x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  var w = generator.valueToCode(block, 'W', generator.ORDER_ATOMIC) || '0';
  var h = generator.valueToCode(block, 'H', generator.ORDER_ATOMIC) || '0';
  var color = generator.valueToCode(block, 'COLOR', generator.ORDER_ATOMIC) || 'LED_ON';
  return 'ledbp.drawRect(' + x + ', ' + y + ', ' + w + ', ' + h + ', ' + color + ');\n';
};

// 点阵 填充矩形
Arduino.forBlock['ledbp_matrix_fill_rect'] = function(block, generator) {
  var x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  var w = generator.valueToCode(block, 'W', generator.ORDER_ATOMIC) || '0';
  var h = generator.valueToCode(block, 'H', generator.ORDER_ATOMIC) || '0';
  var color = generator.valueToCode(block, 'COLOR', generator.ORDER_ATOMIC) || 'LED_ON';
  return 'ledbp.fillRect(' + x + ', ' + y + ', ' + w + ', ' + h + ', ' + color + ');\n';
};

// 点阵 画圆
Arduino.forBlock['ledbp_matrix_draw_circle'] = function(block, generator) {
  var x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  var r = generator.valueToCode(block, 'R', generator.ORDER_ATOMIC) || '0';
  var color = generator.valueToCode(block, 'COLOR', generator.ORDER_ATOMIC) || 'LED_ON';
  return 'ledbp.drawCircle(' + x + ', ' + y + ', ' + r + ', ' + color + ');\n';
};

// 点阵 文字大小
Arduino.forBlock['ledbp_matrix_set_text_size'] = function(block, generator) {
  var size = generator.valueToCode(block, 'SIZE', generator.ORDER_ATOMIC) || '1';
  return 'ledbp.setTextSize(' + size + ');\n';
};

// 点阵 文字颜色
Arduino.forBlock['ledbp_matrix_set_text_color'] = function(block, generator) {
  var color = generator.valueToCode(block, 'COLOR', generator.ORDER_ATOMIC) || 'LED_ON';
  return 'ledbp.setTextColor(' + color + ');\n';
};

// 点阵 光标
Arduino.forBlock['ledbp_matrix_set_cursor'] = function(block, generator) {
  var x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  return 'ledbp.setCursor(' + x + ', ' + y + ');\n';
};

// 点阵 打印
Arduino.forBlock['ledbp_matrix_print'] = function(block, generator) {
  var text = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC) || '""';
  return 'ledbp.print(' + text + ');\n';
};

// 点阵 旋转
Arduino.forBlock['ledbp_matrix_set_rotation'] = function(block, generator) {
  var rot = block.getFieldValue('ROTATION') || '0';
  return 'ledbp.setRotation(' + rot + ');\n';
};

// 点阵 文字换行
Arduino.forBlock['ledbp_matrix_set_text_wrap'] = function(block, generator) {
  var wrap = block.getFieldValue('WRAP') || 'true';
  return 'ledbp.setTextWrap(' + wrap + ');\n';
};

// 条形图 设置某段颜色
Arduino.forBlock['ledbp_bar_set_bar'] = function(block, generator) {
  var bar = generator.valueToCode(block, 'BAR', generator.ORDER_ATOMIC) || '0';
  var color = generator.valueToCode(block, 'COLOR', generator.ORDER_ATOMIC) || 'LED_OFF';
  return 'ledbp.setBar(' + bar + ', ' + color + ');\n';
};
