Arduino.forBlock['ble_begin'] = function(block, generator) {
  generator.addLibrary('ArduinoBLE', '#include <ArduinoBLE.h>');
  return "BLE.begin();\n";
};

Arduino.forBlock['ble_scan'] = function(block, generator) {
  return "BLE.scan();\n";
};

Arduino.forBlock['ble_connect'] = function(block, generator) {
  var device = generator.valueToCode(block, 'DEVICE', generator.ORDER_NONE) || "";
  return "BLEDevice.connect(" + device + ");\n";
};

Arduino.forBlock['ble_disconnect'] = function(block, generator) {
  return "BLEDevice.disconnect();\n";
};

Arduino.forBlock['ble_read_characteristic'] = function(block, generator) {
  var characteristic = generator.valueToCode(block, 'CHARACTERISTIC', generator.ORDER_NONE) || "";
  var code = characteristic + ".read()";
  return [code, generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['ble_write_characteristic'] = function(block, generator) {
  var characteristic = generator.valueToCode(block, 'CHARACTERISTIC', generator.ORDER_NONE) || "";
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_NONE) || "";
  return characteristic + ".writeValue(" + value + ");\n";
};