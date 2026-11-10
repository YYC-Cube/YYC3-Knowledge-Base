// 鼠标库初始化函数
function initMouseLibrary(generator) {
  // 如果是ESP32，则调用USB库和USBHIDKeyboard库
  if (window['boardConfig'].core.indexOf('esp32') > -1) {
    generator.addMacro('check_esp32_usb_mode', `#ifndef ARDUINO_USB_MODE
#error This ESP32 SoC has no Native USB interface
#elif ARDUINO_USB_MODE == 1
#warning This sketch should be used when USB is in OTG mode
#endif 
`);
    generator.addLibrary('include_USB', '#include "USB.h"');
    generator.addLibrary('include_USBHIDMouse', '#include "USBHIDMouse.h"');
    generator.addObject('USBHIDMouse_Mouse;', 'USBHIDMouse Mouse;');
    generator.addSetupBegin('mouse_begin', 'Mouse.begin();');
    generator.addSetupBegin('usb_begin', 'USB.begin();');
  } else {
    generator.addLibrary('#include <Mouse.h>', '#include <Mouse.h>');
    generator.addSetupBegin('mouse_begin', 'Mouse.begin();');
  }
}

Arduino.forBlock['mouse_begin'] = function (block, generator) {
  initMouseLibrary(generator);
  return '';
};

Arduino.forBlock['mouse_click'] = function (block, generator) {
  initMouseLibrary(generator);
  var button = block.getFieldValue('BUTTON');
  return 'Mouse.click(' + button + ');\n';
};

Arduino.forBlock['mouse_move'] = function (block, generator) {
  initMouseLibrary(generator);
  var x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  var wheel = generator.valueToCode(block, 'WHEEL', generator.ORDER_ATOMIC) || '0';
  return 'Mouse.move(' + x + ', ' + y + ', ' + wheel + ');\n';
};

Arduino.forBlock['mouse_press'] = function (block, generator) {
  initMouseLibrary(generator);
  var button = block.getFieldValue('BUTTON');
  return 'Mouse.press(' + button + ');\n';
};

Arduino.forBlock['mouse_release'] = function (block, generator) {
  initMouseLibrary(generator);
  var button = block.getFieldValue('BUTTON');
  return 'Mouse.release(' + button + ');\n';
};

Arduino.forBlock['mouse_is_pressed'] = function (block, generator) {
  initMouseLibrary(generator);
  var button = block.getFieldValue('BUTTON');
  var code = 'Mouse.isPressed(' + button + ')';
  return [code, generator.ORDER_FUNCTION_CALL];
};

