// BLE键盘库初始化函数
function initBLEKeyboardLibrary(generator) {
  generator.addLibrary('include_KeyboardDevice', '#include <KeyboardDevice.h>');
  generator.addLibrary('include_BleCompositeHID', '#include <BleCompositeHID.h>');
  generator.addLibrary('include_KeyboardConfiguration', '#include <KeyboardConfiguration.h>');
  generator.addObject('BleCompositeHID_compositeHID;', 'BleCompositeHID compositeHID;');
  generator.addObject('KeyboardDevice_keyboard;', 'KeyboardDevice* keyboard;');
}

// BLE键盘库初始化函数（带设备名称）
function initBLEKeyboardLibraryWithName(generator, deviceName) {
  generator.addLibrary('include_KeyboardDevice', '#include <KeyboardDevice.h>');
  generator.addLibrary('include_BleCompositeHID', '#include <BleCompositeHID.h>');
  generator.addLibrary('include_KeyboardConfiguration', '#include <KeyboardConfiguration.h>');
  generator.addObject('BleCompositeHID_compositeHID;', 'BleCompositeHID compositeHID("' + deviceName + '", "Espressif", 100);');
  generator.addObject('KeyboardDevice_keyboard;', 'KeyboardDevice* keyboard;');
}

Arduino.forBlock['ble_keyboard_begin'] = function (block, generator) {
  var deviceName = block.getFieldValue('DEVICE_NAME') || 'ESP32 Keyboard';
  initBLEKeyboardLibraryWithName(generator, deviceName);
  generator.addSetupBegin('ble_keyboard_setup_1', 'KeyboardConfiguration config;');
  generator.addSetupBegin('ble_keyboard_setup_2', 'config.setUseMediaKeys(true);');
  generator.addSetupBegin('ble_keyboard_setup_3', 'keyboard = new KeyboardDevice(config);');
  generator.addSetupBegin('ble_keyboard_setup_4', 'compositeHID.addDevice(keyboard);');
  generator.addSetupBegin('ble_keyboard_setup_5', 'compositeHID.begin();');
  return '';
};

Arduino.forBlock['ble_keyboard_end'] = function (block, generator) {
  initBLEKeyboardLibrary(generator);
  return 'compositeHID.end();\n';
};

Arduino.forBlock['ble_keyboard_is_connected'] = function (block, generator) {
  initBLEKeyboardLibrary(generator);
  return ['compositeHID.isConnected()', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['ble_keyboard_print'] = function (block, generator) {
  initBLEKeyboardLibrary(generator);
  var text = generator.valueToCode(block, 'TEXT', Arduino.ORDER_ATOMIC) || '""';
  var code = 'if (compositeHID.isConnected()) {\n';
  code += '  String str = ' + text + ';\n';
  code += '  for (int i = 0; i < str.length(); i++) {\n';
  code += '    char c = str.charAt(i);\n';
  code += '    if (c >= \'a\' && c <= \'z\') {\n';
  code += '      keyboard->keyPress(KEY_A + (c - \'a\'));\n';
  code += '      delay(10);\n';
  code += '      keyboard->keyRelease(KEY_A + (c - \'a\'));\n';
  code += '    } else if (c >= \'A\' && c <= \'Z\') {\n';
  code += '      keyboard->modifierKeyPress(KEY_MOD_LSHIFT);\n';
  code += '      keyboard->keyPress(KEY_A + (c - \'A\'));\n';
  code += '      delay(10);\n';
  code += '      keyboard->keyRelease(KEY_A + (c - \'A\'));\n';
  code += '      keyboard->modifierKeyRelease(KEY_MOD_LSHIFT);\n';
  code += '    } else if (c >= \'0\' && c <= \'9\') {\n';
  code += '      keyboard->keyPress(KEY_0 + (c - \'0\'));\n';
  code += '      delay(10);\n';
  code += '      keyboard->keyRelease(KEY_0 + (c - \'0\'));\n';
  code += '    } else if (c == \' \') {\n';
  code += '      keyboard->keyPress(KEY_SPACE);\n';
  code += '      delay(10);\n';
  code += '      keyboard->keyRelease(KEY_SPACE);\n';
  code += '    }\n';
  code += '    delay(50);\n';
  code += '  }\n';
  code += '}\n';
  return code;
};

Arduino.forBlock['ble_keyboard_press'] = function (block, generator) {
  initBLEKeyboardLibrary(generator);
  var key = generator.valueToCode(block, 'KEY', Arduino.ORDER_ATOMIC) || '""';
  var keyCode = processKeyCode(key);
  
  // 检查是否是修饰键
  if (isModifierKey(keyCode)) {
    var modifierMask = getModifierMask(keyCode);
    return 'if (compositeHID.isConnected()) {\n  keyboard->modifierKeyPress(' + modifierMask + ');\n}\n';
  } else {
    return 'if (compositeHID.isConnected()) {\n  keyboard->keyPress(' + keyCode + ');\n}\n';
  }
};

Arduino.forBlock['ble_keyboard_release'] = function (block, generator) {
  initBLEKeyboardLibrary(generator);
  var key = generator.valueToCode(block, 'KEY', Arduino.ORDER_ATOMIC) || '""';
  var keyCode = processKeyCode(key);
  
  // 检查是否是修饰键
  if (isModifierKey(keyCode)) {
    var modifierMask = getModifierMask(keyCode);
    return 'if (compositeHID.isConnected()) {\n  keyboard->modifierKeyRelease(' + modifierMask + ');\n}\n';
  } else {
    return 'if (compositeHID.isConnected()) {\n  keyboard->keyRelease(' + keyCode + ');\n}\n';
  }
};

Arduino.forBlock['ble_keyboard_release_all'] = function (block, generator) {
  initBLEKeyboardLibrary(generator);
  return 'if (compositeHID.isConnected()) {\n  keyboard->resetKeys();\n}\n';
};

Arduino.forBlock['ble_keyboard_special_key'] = function (block, generator) {
  var key = block.getFieldValue('KEY');
  return [key, Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['ble_keyboard_write'] = function (block, generator) {
  initBLEKeyboardLibrary(generator);
  var key = generator.valueToCode(block, 'KEY', Arduino.ORDER_ATOMIC) || '""';
  var keyCode = processKeyCode(key);
  
  // 检查是否是修饰键
  if (isModifierKey(keyCode)) {
    var modifierMask = getModifierMask(keyCode);
    return 'if (compositeHID.isConnected()) {\n  keyboard->modifierKeyPress(' + modifierMask + ');\n  delay(10);\n  keyboard->modifierKeyRelease(' + modifierMask + ');\n}\n';
  } else {
    return 'if (compositeHID.isConnected()) {\n  keyboard->keyPress(' + keyCode + ');\n  delay(10);\n  keyboard->keyRelease(' + keyCode + ');\n}\n';
  }
};

Arduino.forBlock['ble_keyboard_media_key'] = function (block, generator) {
  initBLEKeyboardLibrary(generator);
  var mediaKey = block.getFieldValue('MEDIA_KEY');
  return 'if (compositeHID.isConnected()) {\n  keyboard->mediaKeyPress(' + mediaKey + ');\n  delay(10);\n  keyboard->mediaKeyRelease(' + mediaKey + ');\n}\n';
};

Arduino.forBlock['ble_keyboard_consumer_key'] = function (block, generator) {
  initBLEKeyboardLibrary(generator);
  var consumerKey = block.getFieldValue('CONSUMER_KEY');
  return 'if (compositeHID.isConnected()) {\n  keyboard->mediaKeyPress(' + consumerKey + ');\n  delay(10);\n  keyboard->mediaKeyRelease(' + consumerKey + ');\n}\n';
};

Arduino.forBlock['ble_keyboard_set_battery_level'] = function (block, generator) {
  initBLEKeyboardLibrary(generator);
  var level = block.getFieldValue('LEVEL') || 100;
  return 'compositeHID.setBatteryLevel(' + level + ');\n';
};

// 添加修饰键处理函数
Arduino.forBlock['ble_keyboard_modifier_press'] = function (block, generator) {
  initBLEKeyboardLibrary(generator);
  var modifier = block.getFieldValue('MODIFIER');
  return 'if (compositeHID.isConnected()) {\n  keyboard->modifierKeyPress(' + modifier + ');\n}\n';
};

Arduino.forBlock['ble_keyboard_modifier_release'] = function (block, generator) {
  initBLEKeyboardLibrary(generator);
  var modifier = block.getFieldValue('MODIFIER');
  return 'if (compositeHID.isConnected()) {\n  keyboard->modifierKeyRelease(' + modifier + ');\n}\n';
};

// 处理按键输入的辅助函数
function processKeyCode(key) {
  // 移除引号并获取内容
  var cleanKey = key.replace(/^["']|["']$/g, '');
  
  // 如果是单个字符，转换为对应的键码
  if (cleanKey.length === 1) {
    var c = cleanKey.charAt(0);
    if (c >= 'a' && c <= 'z') {
      return 'KEY_' + c.toUpperCase();
    } else if (c >= 'A' && c <= 'Z') {
      return 'KEY_' + c;
    } else if (c >= '0' && c <= '9') {
      return 'KEY_' + c;
    } else if (c === ' ') {
      return 'KEY_SPACE';
    }
  }
  
  // 如果是特殊键码（不带引号），直接返回
  if (key.indexOf('KEY_') === 0 || key.indexOf('"') === -1) {
    return key;
  }
  
  // 默认返回空键
  return 'KEY_NONE';
}

// 检查是否为修饰键
function isModifierKey(keyCode) {
  var modifierKeys = [
    'KEY_LEFTCTRL', 'KEY_LEFTSHIFT', 'KEY_LEFTALT', 'KEY_LEFTMETA',
    'KEY_RIGHTCTRL', 'KEY_RIGHTSHIFT', 'KEY_RIGHTALT', 'KEY_RIGHTMETA'
  ];
  return modifierKeys.indexOf(keyCode) !== -1;
}

// 将修饰键转换为对应的bit mask
function getModifierMask(keyCode) {
  var modifierMap = {
    'KEY_LEFTCTRL': 'KEY_MOD_LCTRL',
    'KEY_LEFTSHIFT': 'KEY_MOD_LSHIFT', 
    'KEY_LEFTALT': 'KEY_MOD_LALT',
    'KEY_LEFTMETA': 'KEY_MOD_LMETA',
    'KEY_RIGHTCTRL': 'KEY_MOD_RCTRL',
    'KEY_RIGHTSHIFT': 'KEY_MOD_RSHIFT',
    'KEY_RIGHTALT': 'KEY_MOD_RALT',
    'KEY_RIGHTMETA': 'KEY_MOD_RMETA'
  };
  return modifierMap[keyCode] || keyCode;
}
