// 键盘库初始化函数
function initKeyboardLibrary(generator) {
  // 如果是ESP32，则调用USB库和USBHIDKeyboard库
  if (window['boardConfig'].core.indexOf('esp32') > -1) {
    generator.addMacro('check_esp32_usb_mode', `#ifndef ARDUINO_USB_MODE
#error This ESP32 SoC has no Native USB interface
#elif ARDUINO_USB_MODE == 1
#warning This sketch should be used when USB is in OTG mode
#endif 
`);
    generator.addLibrary('include_USB', '#include "USB.h"');
    generator.addLibrary('include_USBHIDKeyboard', '#include "USBHIDKeyboard.h"');
    generator.addObject('USBHIDKeyboard_Keyboard;', 'USBHIDKeyboard Keyboard;');
    generator.addSetupBegin('keyboard_begin', 'Keyboard.begin();');
    generator.addSetupBegin('usb_begin', 'USB.begin();');
  } else {
    generator.addLibrary('#include <Keyboard.h>', '#include <Keyboard.h>');
    generator.addSetupBegin('keyboard_begin', 'Keyboard.begin();');
  }
}

Arduino.forBlock['keyboard_begin'] = function (block, generator) {
  initKeyboardLibrary(generator);
  return '';
};

Arduino.forBlock['keyboard_end'] = function (block, generator) {
  initKeyboardLibrary(generator);
  return 'Keyboard.end();\n';
};

Arduino.forBlock['keyboard_print'] = function (block, generator) {
  initKeyboardLibrary(generator);
  var text = generator.valueToCode(block, 'TEXT', Arduino.ORDER_ATOMIC) || '\'\\0\'';
  return 'Keyboard.print(' + text + ');\n';
};

Arduino.forBlock['keyboard_press'] = function (block, generator) {
  initKeyboardLibrary(generator);
  var key = generator.valueToCode(block, 'KEY', Arduino.ORDER_ATOMIC) || '\'\\0\'';
  return 'Keyboard.press(' + processKey(key) + ');\n';
};

Arduino.forBlock['keyboard_special_key'] = function (block, generator) {
  initKeyboardLibrary(generator);
  var key = block.getFieldValue('KEY');
  return [key, Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['keyboard_release'] = function (block, generator) {
  initKeyboardLibrary(generator);
  var key = generator.valueToCode(block, 'KEY', Arduino.ORDER_ATOMIC) || '\'\\0\'';
  return 'Keyboard.release(' + processKey(key) + ');\n';
};

Arduino.forBlock['keyboard_release_all'] = function (block, generator) {
  initKeyboardLibrary(generator);
  return 'Keyboard.releaseAll();\n';
};

function processKey(key) {
  // 使用正则表达式匹配双引号内的内容
  var match = key.match(/"([^"]*)"/);
  if (match && match[1].length > 0) {
    // 取第一个字符并用单引号包围
    return "'" + match[1].charAt(0) + "'";
  }
  return "'\\0'"; // 默认返回空字符
}