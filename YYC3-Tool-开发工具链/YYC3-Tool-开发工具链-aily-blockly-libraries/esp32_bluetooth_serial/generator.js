'use strict';

function ensureBTSerialLib(generator) {
  generator.addLibrary('BluetoothSerial', '#include <BluetoothSerial.h>');
  generator.addObject('btSerial_obj', 'BluetoothSerial SerialBT;');
}

Arduino.forBlock['esp32_btserial_begin'] = function(block, generator) {
  const name = generator.valueToCode(block, 'NAME', generator.ORDER_ATOMIC) || '"ESP32"';
  ensureBTSerialLib(generator);
  return 'SerialBT.begin(' + name + ');\n';
};

Arduino.forBlock['esp32_btserial_end'] = function(block, generator) {
  ensureBTSerialLib(generator);
  return 'SerialBT.end();\n';
};

Arduino.forBlock['esp32_btserial_available'] = function(block, generator) {
  ensureBTSerialLib(generator);
  return ['SerialBT.available()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_btserial_read_string'] = function(block, generator) {
  ensureBTSerialLib(generator);
  return ['SerialBT.readString()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_btserial_read_byte'] = function(block, generator) {
  ensureBTSerialLib(generator);
  return ['SerialBT.read()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_btserial_println'] = function(block, generator) {
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';
  ensureBTSerialLib(generator);
  return 'SerialBT.println(' + data + ');\n';
};

Arduino.forBlock['esp32_btserial_print'] = function(block, generator) {
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';
  ensureBTSerialLib(generator);
  return 'SerialBT.print(' + data + ');\n';
};

Arduino.forBlock['esp32_btserial_write'] = function(block, generator) {
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '0';
  ensureBTSerialLib(generator);
  return 'SerialBT.write(' + data + ');\n';
};

Arduino.forBlock['esp32_btserial_connected'] = function(block, generator) {
  ensureBTSerialLib(generator);
  return ['SerialBT.connected()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_btserial_has_client'] = function(block, generator) {
  ensureBTSerialLib(generator);
  return ['SerialBT.hasClient()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_btserial_disconnect'] = function(block, generator) {
  ensureBTSerialLib(generator);
  return 'SerialBT.disconnect();\n';
};

Arduino.forBlock['esp32_btserial_set_pin'] = function(block, generator) {
  const pin = generator.valueToCode(block, 'PIN', generator.ORDER_ATOMIC) || '"1234"';
  ensureBTSerialLib(generator);
  return 'SerialBT.setPin(' + pin + ');\n';
};

Arduino.forBlock['esp32_btserial_get_address'] = function(block, generator) {
  ensureBTSerialLib(generator);
  return ['SerialBT.getBtAddressString()', generator.ORDER_FUNCTION_CALL];
};
