'use strict';

// ============================================================
// ESP32 Native USB HID Library - Code Generator
// Supports: Keyboard, Mouse, Gamepad, ConsumerControl,
//           SystemControl, MIDI
// ============================================================

// --- Shared USB initialization helpers ---

function ensureUSBLib(generator) {
  generator.addMacro('check_esp32_usb_mode',
    '#ifndef ARDUINO_USB_MODE\n#error This ESP32 SoC has no Native USB interface\n' +
    '#elif ARDUINO_USB_MODE == 1\n#warning This sketch should be used when USB is in OTG mode\n#endif\n');
  generator.addLibrary('USB', '#include "USB.h"');
}

function ensureUSBBegin(generator) {
  ensureUSBLib(generator);
  generator.addSetupEnd('usb_begin', 'USB.begin();');
}

// --- Device-specific ensure functions ---

function ensureKeyboard(generator) {
  ensureUSBBegin(generator);
  generator.addLibrary('USBHIDKeyboard', '#include "USBHIDKeyboard.h"');
  generator.addObject('Keyboard', 'USBHIDKeyboard Keyboard;');
  generator.addSetupBegin('keyboard_begin', 'Keyboard.begin();');
}

function ensureMouse(generator) {
  ensureUSBBegin(generator);
  generator.addLibrary('USBHIDMouse', '#include "USBHIDMouse.h"');
  generator.addObject('Mouse', 'USBHIDMouse Mouse;');
  generator.addSetupBegin('mouse_begin', 'Mouse.begin();');
}

function ensureGamepad(generator) {
  ensureUSBBegin(generator);
  generator.addLibrary('USBHIDGamepad', '#include "USBHIDGamepad.h"');
  generator.addObject('Gamepad', 'USBHIDGamepad Gamepad;');
  generator.addSetupBegin('gamepad_begin', 'Gamepad.begin();');
}

function ensureConsumerControl(generator) {
  ensureUSBBegin(generator);
  generator.addLibrary('USBHIDConsumerControl', '#include "USBHIDConsumerControl.h"');
  generator.addObject('ConsumerControl', 'USBHIDConsumerControl ConsumerControl;');
  generator.addSetupBegin('consumer_begin', 'ConsumerControl.begin();');
}

function ensureSystemControl(generator) {
  ensureUSBBegin(generator);
  generator.addLibrary('USBHIDSystemControl', '#include "USBHIDSystemControl.h"');
  generator.addObject('SystemControl', 'USBHIDSystemControl SystemControl;');
  generator.addSetupBegin('system_begin', 'SystemControl.begin();');
}

function ensureMIDI(generator) {
  ensureUSBBegin(generator);
  generator.addLibrary('USBMIDI', '#include "USBMIDI.h"');
  generator.addObject('MIDI', 'USBMIDI MIDI;');
  generator.addSetupBegin('midi_begin', 'MIDI.begin();');
}

// ============================================================
// Keyboard blocks
// ============================================================

Arduino.forBlock['esp32_usb_keyboard_begin'] = function(block, generator) {
  ensureKeyboard(generator);
  return '';
};

Arduino.forBlock['esp32_usb_keyboard_print'] = function(block, generator) {
  ensureKeyboard(generator);
  var text = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC) || '""';
  return 'Keyboard.print(' + text + ');\n';
};

Arduino.forBlock['esp32_usb_keyboard_println'] = function(block, generator) {
  ensureKeyboard(generator);
  var text = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC) || '""';
  return 'Keyboard.println(' + text + ');\n';
};

Arduino.forBlock['esp32_usb_keyboard_write'] = function(block, generator) {
  ensureKeyboard(generator);
  var key = generator.valueToCode(block, 'KEY', generator.ORDER_ATOMIC) || '0';
  return 'Keyboard.write(' + key + ');\n';
};

Arduino.forBlock['esp32_usb_keyboard_press'] = function(block, generator) {
  ensureKeyboard(generator);
  var key = generator.valueToCode(block, 'KEY', generator.ORDER_ATOMIC) || '0';
  return 'Keyboard.press(' + key + ');\n';
};

Arduino.forBlock['esp32_usb_keyboard_release'] = function(block, generator) {
  ensureKeyboard(generator);
  var key = generator.valueToCode(block, 'KEY', generator.ORDER_ATOMIC) || '0';
  return 'Keyboard.release(' + key + ');\n';
};

Arduino.forBlock['esp32_usb_keyboard_release_all'] = function(block, generator) {
  ensureKeyboard(generator);
  return 'Keyboard.releaseAll();\n';
};

Arduino.forBlock['esp32_usb_keyboard_special_key'] = function(block, generator) {
  generator.addLibrary('USBHIDKeyboard', '#include "USBHIDKeyboard.h"');
  var key = block.getFieldValue('KEY');
  return [key, generator.ORDER_ATOMIC];
};

// ============================================================
// Mouse blocks
// ============================================================

Arduino.forBlock['esp32_usb_mouse_begin'] = function(block, generator) {
  ensureMouse(generator);
  return '';
};

Arduino.forBlock['esp32_usb_mouse_move'] = function(block, generator) {
  ensureMouse(generator);
  var x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  var wheel = generator.valueToCode(block, 'WHEEL', generator.ORDER_ATOMIC) || '0';
  return 'Mouse.move(' + x + ', ' + y + ', ' + wheel + ');\n';
};

Arduino.forBlock['esp32_usb_mouse_click'] = function(block, generator) {
  ensureMouse(generator);
  var button = block.getFieldValue('BUTTON') || 'MOUSE_LEFT';
  var action = block.getFieldValue('ACTION') || 'click';
  return 'Mouse.' + action + '(' + button + ');\n';
};

Arduino.forBlock['esp32_usb_mouse_is_pressed'] = function(block, generator) {
  ensureMouse(generator);
  var button = block.getFieldValue('BUTTON') || 'MOUSE_LEFT';
  return ['Mouse.isPressed(' + button + ')', generator.ORDER_ATOMIC];
};

// ============================================================
// Gamepad blocks
// ============================================================

Arduino.forBlock['esp32_usb_gamepad_begin'] = function(block, generator) {
  ensureGamepad(generator);
  return '';
};

Arduino.forBlock['esp32_usb_gamepad_press_button'] = function(block, generator) {
  ensureGamepad(generator);
  var button = block.getFieldValue('BUTTON') || 'BUTTON_A';
  return 'Gamepad.pressButton(' + button + ');\n';
};

Arduino.forBlock['esp32_usb_gamepad_release_button'] = function(block, generator) {
  ensureGamepad(generator);
  var button = block.getFieldValue('BUTTON') || 'BUTTON_A';
  return 'Gamepad.releaseButton(' + button + ');\n';
};

Arduino.forBlock['esp32_usb_gamepad_left_stick'] = function(block, generator) {
  ensureGamepad(generator);
  var x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  return 'Gamepad.leftStick(' + x + ', ' + y + ');\n';
};

Arduino.forBlock['esp32_usb_gamepad_right_stick'] = function(block, generator) {
  ensureGamepad(generator);
  var x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  return 'Gamepad.rightStick(' + x + ', ' + y + ');\n';
};

Arduino.forBlock['esp32_usb_gamepad_trigger'] = function(block, generator) {
  ensureGamepad(generator);
  var side = block.getFieldValue('SIDE') || 'left';
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
  if (side === 'left') {
    return 'Gamepad.leftTrigger(' + value + ');\n';
  }
  return 'Gamepad.rightTrigger(' + value + ');\n';
};

Arduino.forBlock['esp32_usb_gamepad_hat'] = function(block, generator) {
  ensureGamepad(generator);
  var direction = block.getFieldValue('DIRECTION') || 'HAT_CENTER';
  return 'Gamepad.hat(' + direction + ');\n';
};

// ============================================================
// Consumer Control (media) blocks
// ============================================================

Arduino.forBlock['esp32_usb_consumer_press'] = function(block, generator) {
  ensureConsumerControl(generator);
  var key = block.getFieldValue('KEY') || 'CONSUMER_CONTROL_PLAY_PAUSE';
  return 'ConsumerControl.press(' + key + ');\n';
};

Arduino.forBlock['esp32_usb_consumer_release'] = function(block, generator) {
  ensureConsumerControl(generator);
  return 'ConsumerControl.release();\n';
};

// ============================================================
// System Control blocks
// ============================================================

Arduino.forBlock['esp32_usb_system_press'] = function(block, generator) {
  ensureSystemControl(generator);
  var action = block.getFieldValue('ACTION') || 'SYSTEM_CONTROL_POWER_OFF';
  return 'SystemControl.press(' + action + ');\n';
};

Arduino.forBlock['esp32_usb_system_release'] = function(block, generator) {
  ensureSystemControl(generator);
  return 'SystemControl.release();\n';
};

// ============================================================
// MIDI blocks
// ============================================================

Arduino.forBlock['esp32_usb_midi_begin'] = function(block, generator) {
  ensureMIDI(generator);
  return '';
};

Arduino.forBlock['esp32_usb_midi_note_on'] = function(block, generator) {
  ensureMIDI(generator);
  var note = generator.valueToCode(block, 'NOTE', generator.ORDER_ATOMIC) || '60';
  var velocity = generator.valueToCode(block, 'VELOCITY', generator.ORDER_ATOMIC) || '127';
  var channel = generator.valueToCode(block, 'CHANNEL', generator.ORDER_ATOMIC) || '1';
  return 'MIDI.noteOn(' + note + ', ' + velocity + ', ' + channel + ');\n';
};

Arduino.forBlock['esp32_usb_midi_note_off'] = function(block, generator) {
  ensureMIDI(generator);
  var note = generator.valueToCode(block, 'NOTE', generator.ORDER_ATOMIC) || '60';
  var velocity = generator.valueToCode(block, 'VELOCITY', generator.ORDER_ATOMIC) || '0';
  var channel = generator.valueToCode(block, 'CHANNEL', generator.ORDER_ATOMIC) || '1';
  return 'MIDI.noteOff(' + note + ', ' + velocity + ', ' + channel + ');\n';
};

Arduino.forBlock['esp32_usb_midi_control_change'] = function(block, generator) {
  ensureMIDI(generator);
  var control = generator.valueToCode(block, 'CONTROL', generator.ORDER_ATOMIC) || '0';
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
  var channel = generator.valueToCode(block, 'CHANNEL', generator.ORDER_ATOMIC) || '1';
  return 'MIDI.controlChange(' + control + ', ' + value + ', ' + channel + ');\n';
};

Arduino.forBlock['esp32_usb_midi_program_change'] = function(block, generator) {
  ensureMIDI(generator);
  var program = generator.valueToCode(block, 'PROGRAM', generator.ORDER_ATOMIC) || '0';
  var channel = generator.valueToCode(block, 'CHANNEL', generator.ORDER_ATOMIC) || '1';
  return 'MIDI.programChange(' + program + ', ' + channel + ');\n';
};

Arduino.forBlock['esp32_usb_midi_pitch_bend'] = function(block, generator) {
  ensureMIDI(generator);
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
  var channel = generator.valueToCode(block, 'CHANNEL', generator.ORDER_ATOMIC) || '1';
  return 'MIDI.pitchBend((int16_t)' + value + ', ' + channel + ');\n';
};
