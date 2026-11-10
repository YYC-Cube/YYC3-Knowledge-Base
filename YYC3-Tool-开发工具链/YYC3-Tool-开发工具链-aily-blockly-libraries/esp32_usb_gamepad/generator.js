// 游戏手柄库初始化函数
function initGamepadLibrary(generator) {
  // 检查ESP32 USB模式
  generator.addMacro('check_esp32_usb_mode', `#ifndef ARDUINO_USB_MODE
#error This ESP32 SoC has no Native USB interface
#elif ARDUINO_USB_MODE == 1
#warning This sketch should be used when USB is in OTG mode
#endif 
`);
  generator.addLibrary('include_USB', '#include "USB.h"');
  generator.addLibrary('include_USBHIDGamepad', '#include "USBHIDGamepad.h"');
  generator.addObject('USBHIDGamepad_Gamepad;', 'USBHIDGamepad Gamepad;');
  generator.addSetupBegin('gamepad_begin', 'Gamepad.begin();');
  generator.addSetupBegin('usb_begin', 'USB.begin();');
}

Arduino.forBlock['gamepad_begin'] = function (block, generator) {
  initGamepadLibrary(generator);
  return '';
};

Arduino.forBlock['gamepad_press_button'] = function (block, generator) {
  initGamepadLibrary(generator);
  var button = generator.valueToCode(block, 'BUTTON', generator.ORDER_ATOMIC) || '1';
  return 'Gamepad.pressButton(' + button + ');\n';
};

Arduino.forBlock['gamepad_release_button'] = function (block, generator) {
  initGamepadLibrary(generator);
  var button = generator.valueToCode(block, 'BUTTON', generator.ORDER_ATOMIC) || '1';
  return 'Gamepad.releaseButton(' + button + ');\n';
};

Arduino.forBlock['gamepad_left_stick'] = function (block, generator) {
  initGamepadLibrary(generator);
  var x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  return 'Gamepad.leftStick(' + x + ', ' + y + ');\n';
};

Arduino.forBlock['gamepad_right_stick'] = function (block, generator) {
  initGamepadLibrary(generator);
  var x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  return 'Gamepad.rightStick(' + x + ', ' + y + ');\n';
};

Arduino.forBlock['gamepad_left_trigger'] = function (block, generator) {
  initGamepadLibrary(generator);
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
  return 'Gamepad.leftTrigger(' + value + ');\n';
};

Arduino.forBlock['gamepad_right_trigger'] = function (block, generator) {
  initGamepadLibrary(generator);
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
  return 'Gamepad.rightTrigger(' + value + ');\n';
};

Arduino.forBlock['gamepad_hat'] = function (block, generator) {
  initGamepadLibrary(generator);
  var direction = block.getFieldValue('DIRECTION');
  return 'Gamepad.hat(' + direction + ');\n';
};

Arduino.forBlock['gamepad_reset'] = function (block, generator) {
  initGamepadLibrary(generator);
  return 'Gamepad.releaseButton(0);\nGamepad.leftStick(0, 0);\nGamepad.rightStick(0, 0);\nGamepad.leftTrigger(0);\nGamepad.rightTrigger(0);\nGamepad.hat(HAT_CENTER);\n';
};
