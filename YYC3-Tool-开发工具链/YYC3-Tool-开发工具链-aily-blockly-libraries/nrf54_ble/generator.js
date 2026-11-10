'use strict';

// ==================== 公共工具函数 ====================

function ensureNrf54BleLib(generator) {
  generator.addLibrary('nrf54l15_hal', '#include "nrf54l15_hal.h"');
}

function ensureNrf54NusLib(generator) {
  ensureNrf54BleLib(generator);
  generator.addLibrary('ble_nus', '#include "ble_nus.h"');
}

function ensureNrf54BleGlobals(generator) {
  ensureNrf54BleLib(generator);
  generator.addVariable('_nrf54_ble_namespace', 'using namespace xiao_nrf54l15;');
  generator.addVariable('_nrf54_ble_radio', 'static BleRadio _nrf54_ble;');
  generator.addVariable('_nrf54_ble_power', 'static PowerManager _nrf54_ble_power;');
}

function ensureNrf54NusGlobals(generator) {
  ensureNrf54NusLib(generator);
  generator.addVariable('_nrf54_ble_namespace', 'using namespace xiao_nrf54l15;');
  generator.addVariable('_nrf54_ble_radio', 'static BleRadio _nrf54_ble;');
  generator.addVariable('_nrf54_ble_power', 'static PowerManager _nrf54_ble_power;');
  generator.addVariable('_nrf54_nus', 'static BleNordicUart _nrf54_nus(_nrf54_ble);');
}

// ==================== 设备初始化 ====================

Arduino.forBlock['nrf54_ble_init'] = function(block, generator) {
  const txPower = block.getFieldValue('TX_POWER') || '-8';

  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble.begin(' + txPower + ');\n';
};

Arduino.forBlock['nrf54_ble_end'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble.end();\n';
};

Arduino.forBlock['nrf54_ble_set_name'] = function(block, generator) {
  const name = generator.valueToCode(block, 'NAME', generator.ORDER_ATOMIC) || '"XIAO-nRF54"';

  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble.setAdvertisingName(String(' + name + ').c_str(), true);\n';
};

Arduino.forBlock['nrf54_ble_set_address'] = function(block, generator) {
  const address = generator.valueToCode(block, 'ADDRESS', generator.ORDER_ATOMIC) || '"C0:DE:54:15:00:01"';
  const addrType = block.getFieldValue('ADDR_TYPE') || 'kRandomStatic';

  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble.setDeviceAddressString(' + address + ', BleAddressType::' + addrType + ');\n';
};

Arduino.forBlock['nrf54_ble_get_address'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);

  generator.addFunction('_nrf54_ble_get_addr_str',
    'String _nrf54_ble_get_addr_str() {\n' +
    '  char buf[18] = {0};\n' +
    '  _nrf54_ble.getDeviceAddressString(buf, sizeof(buf));\n' +
    '  return String(buf);\n' +
    '}\n');

  return ['_nrf54_ble_get_addr_str()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['nrf54_ble_set_tx_power'] = function(block, generator) {
  const txPower = block.getFieldValue('TX_POWER') || '-8';

  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble.setTxPowerDbm(' + txPower + ');\n';
};

// ==================== 广播 ====================

Arduino.forBlock['nrf54_ble_set_adv_type'] = function(block, generator) {
  const pduType = block.getFieldValue('PDU_TYPE') || 'kAdvInd';

  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble.setAdvertisingPduType(BleAdvPduType::' + pduType + ');\n';
};

Arduino.forBlock['nrf54_ble_set_adv_data_raw'] = function(block, generator) {
  const includeFlags = block.getFieldValue('FLAGS') === 'TRUE';
  const includeName = block.getFieldValue('INCLUDE_NAME') === 'TRUE';

  ensureNrf54BleGlobals(generator);

  // setAdvertisingName handles Flags + Complete Name + buildAdvertisingPacket
  // This block is a convenience that calls both name and build
  var code = '';
  if (includeName) {
    // Name is assumed to be already set by nrf54_ble_set_name
    code += '_nrf54_ble.buildAdvertisingPacket();\n';
  }
  return code;
};

Arduino.forBlock['nrf54_ble_set_scan_response_name'] = function(block, generator) {
  const name = generator.valueToCode(block, 'NAME', generator.ORDER_ATOMIC) || '"XIAO-nRF54"';

  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble.setScanResponseName(String(' + name + ').c_str());\n';
};

Arduino.forBlock['nrf54_ble_advertise_once'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble.advertiseEvent(350U, 700000UL);\n';
};

Arduino.forBlock['nrf54_ble_advertise_connectable'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);

  generator.addVariable('_nrf54_ble_adv_interaction', 'static BleAdvInteraction _nrf54_ble_adv_interaction{};');

  return '_nrf54_ble.advertiseInteractEvent(&_nrf54_ble_adv_interaction, 350U, 300000UL, 700000UL);\n';
};

// ==================== 连接管理 ====================

Arduino.forBlock['nrf54_ble_is_connected'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);

  return ['_nrf54_ble.isConnected()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['nrf54_ble_disconnect'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble.disconnect();\n';
};

Arduino.forBlock['nrf54_ble_poll_event'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);

  generator.addVariable('_nrf54_ble_conn_event', 'static BleConnectionEvent _nrf54_ble_conn_event{};');

  return '_nrf54_ble.pollConnectionEvent(&_nrf54_ble_conn_event, 450000UL);\n';
};

// ==================== 连接事件回调 ====================

Arduino.forBlock['nrf54_ble_on_connected'] = function(block, generator) {
  const handlerCode = generator.statementToCode(block, 'HANDLER') || '';

  ensureNrf54BleGlobals(generator);

  generator.addVariable('_nrf54_ble_was_connected', 'static bool _nrf54_ble_was_connected = false;');
  generator.addLoopBegin('_nrf54_ble_on_connected_loop',
    'if (_nrf54_ble.isConnected() && !_nrf54_ble_was_connected) {\n' +
    handlerCode +
    '}\n');
  generator.addLoopEnd('_nrf54_ble_conn_state_update', '_nrf54_ble_was_connected = _nrf54_ble.isConnected();');

  return '';
};

Arduino.forBlock['nrf54_ble_on_disconnected'] = function(block, generator) {
  const handlerCode = generator.statementToCode(block, 'HANDLER') || '';

  ensureNrf54BleGlobals(generator);

  generator.addVariable('_nrf54_ble_was_connected', 'static bool _nrf54_ble_was_connected = false;');
  generator.addLoopBegin('_nrf54_ble_on_disconnected_loop',
    'if (!_nrf54_ble.isConnected() && _nrf54_ble_was_connected) {\n' +
    handlerCode +
    '}\n');
  generator.addLoopEnd('_nrf54_ble_conn_state_update', '_nrf54_ble_was_connected = _nrf54_ble.isConnected();');

  return '';
};

// ==================== GATT 服务 ====================

Arduino.forBlock['nrf54_ble_set_gatt_device_name'] = function(block, generator) {
  const name = generator.valueToCode(block, 'NAME', generator.ORDER_ATOMIC) || '"XIAO-nRF54"';

  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble.setGattDeviceName(String(' + name + ').c_str());\n';
};

Arduino.forBlock['nrf54_ble_set_gatt_battery'] = function(block, generator) {
  const level = generator.valueToCode(block, 'LEVEL', generator.ORDER_ATOMIC) || '100';

  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble.setGattBatteryLevel(' + level + ');\n';
};

Arduino.forBlock['nrf54_ble_clear_gatt'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble.clearCustomGatt();\n';
};

Arduino.forBlock['nrf54_ble_add_service_16'] = function(block, generator) {
  const svcVar = block.getFieldValue('SVC_VAR') || 'svcHandle';
  const uuid = generator.valueToCode(block, 'UUID', generator.ORDER_ATOMIC) || '"0xFFF0"';

  ensureNrf54BleGlobals(generator);
  registerVariableToBlockly(svcVar, 'uint16_t');
  generator.addVariable('uint16_t ' + svcVar, 'static uint16_t ' + svcVar + ' = 0U;');

  // Parse hex UUID string to uint16_t
  return '_nrf54_ble.addCustomGattService(strtoul(' + uuid + ', NULL, 16), &' + svcVar + ');\n';
};

Arduino.forBlock['nrf54_ble_add_service_128'] = function(block, generator) {
  const svcVar = block.getFieldValue('SVC_VAR') || 'svcHandle';
  const uuid = generator.valueToCode(block, 'UUID', generator.ORDER_ATOMIC) || '"12345678-9ABC-4DEF-8ABC-DEF012345678"';

  ensureNrf54BleGlobals(generator);
  registerVariableToBlockly(svcVar, 'uint16_t');
  generator.addVariable('uint16_t ' + svcVar, 'static uint16_t ' + svcVar + ' = 0U;');

  // We need a helper to parse UUID128 string to byte array
  generator.addFunction('_nrf54_ble_parse_uuid128',
    'bool _nrf54_ble_parse_uuid128(const char* str, uint8_t out[16]) {\n' +
    '  uint8_t tmp[16];\n' +
    '  int idx = 0;\n' +
    '  for (int i = 0; str[i] && idx < 16; ++i) {\n' +
    '    if (str[i] == \'-\') continue;\n' +
    '    uint8_t hi = 0, lo = 0;\n' +
    '    if (str[i] >= \'0\' && str[i] <= \'9\') hi = str[i] - \'0\';\n' +
    '    else if (str[i] >= \'a\' && str[i] <= \'f\') hi = str[i] - \'a\' + 10;\n' +
    '    else if (str[i] >= \'A\' && str[i] <= \'F\') hi = str[i] - \'A\' + 10;\n' +
    '    else return false;\n' +
    '    ++i;\n' +
    '    if (!str[i]) return false;\n' +
    '    if (str[i] >= \'0\' && str[i] <= \'9\') lo = str[i] - \'0\';\n' +
    '    else if (str[i] >= \'a\' && str[i] <= \'f\') lo = str[i] - \'a\' + 10;\n' +
    '    else if (str[i] >= \'A\' && str[i] <= \'F\') lo = str[i] - \'A\' + 10;\n' +
    '    else return false;\n' +
    '    tmp[idx++] = (hi << 4) | lo;\n' +
    '  }\n' +
    '  if (idx != 16) return false;\n' +
    '  // Reverse to little-endian for BLE\n' +
    '  for (int i = 0; i < 16; ++i) out[i] = tmp[15 - i];\n' +
    '  return true;\n' +
    '}\n');

  var code = '{\n';
  code += '  uint8_t _uuid128[16];\n';
  code += '  _nrf54_ble_parse_uuid128(' + uuid + ', _uuid128);\n';
  code += '  _nrf54_ble.addCustomGattService128(_uuid128, &' + svcVar + ');\n';
  code += '}\n';
  return code;
};

Arduino.forBlock['nrf54_ble_add_characteristic'] = function(block, generator) {
  const svcField = block.getField('SVC_VAR');
  const svcVar = svcField ? svcField.getText() : 'svcHandle';
  const charVar = block.getFieldValue('CHAR_VAR') || 'charHandle';
  const uuid = generator.valueToCode(block, 'UUID', generator.ORDER_ATOMIC) || '"0xFFF1"';
  const propsStr = block.getFieldValue('PROPS') || 'READ_NOTIFY';

  ensureNrf54BleGlobals(generator);
  registerVariableToBlockly(charVar, 'uint16_t');
  generator.addVariable('uint16_t ' + charVar, 'static uint16_t ' + charVar + ' = 0U;');
  generator.addVariable('uint16_t ' + charVar + '_cccd', 'static uint16_t ' + charVar + '_cccd = 0U;');

  // Map properties
  var props = '';
  switch (propsStr) {
    case 'READ':
      props = 'kBleGattPropRead';
      break;
    case 'WRITE':
      props = 'kBleGattPropWrite';
      break;
    case 'WRITE_NR':
      props = 'kBleGattPropWriteNoRsp';
      break;
    case 'NOTIFY':
      props = 'kBleGattPropNotify';
      break;
    case 'INDICATE':
      props = 'kBleGattPropIndicate';
      break;
    case 'READ_NOTIFY':
      props = 'kBleGattPropRead | kBleGattPropNotify';
      break;
    case 'READ_WRITE':
      props = 'kBleGattPropRead | kBleGattPropWrite';
      break;
    case 'READ_WRITE_NOTIFY':
      props = 'kBleGattPropRead | kBleGattPropWrite | kBleGattPropNotify';
      break;
    default:
      props = 'kBleGattPropRead | kBleGattPropNotify';
  }

  return '_nrf54_ble.addCustomGattCharacteristic(' + svcVar + ', strtoul(' + uuid +
    ', NULL, 16), static_cast<uint8_t>(' + props +
    '), nullptr, 0U, &' + charVar + ', &' + charVar + '_cccd);\n';
};

Arduino.forBlock['nrf54_ble_set_char_value'] = function(block, generator) {
  const charField = block.getField('CHAR_VAR');
  const charVar = charField ? charField.getText() : 'charHandle';
  const value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '""';

  ensureNrf54BleGlobals(generator);

  var code = '{\n';
  code += '  String _val = String(' + value + ');\n';
  code += '  _nrf54_ble.setCustomGattCharacteristicValue(' + charVar +
    ', reinterpret_cast<const uint8_t*>(_val.c_str()), _val.length());\n';
  code += '}\n';
  return code;
};

Arduino.forBlock['nrf54_ble_notify_char'] = function(block, generator) {
  const charField = block.getField('CHAR_VAR');
  const charVar = charField ? charField.getText() : 'charHandle';

  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble.notifyCustomGattCharacteristic(' + charVar + ', false);\n';
};

Arduino.forBlock['nrf54_ble_is_cccd_enabled'] = function(block, generator) {
  const charField = block.getField('CHAR_VAR');
  const charVar = charField ? charField.getText() : 'charHandle';

  ensureNrf54BleGlobals(generator);

  return ['_nrf54_ble.isCustomGattCccdEnabled(' + charVar + ', false)', generator.ORDER_FUNCTION_CALL];
};

// ==================== GATT 写入回调 ====================

Arduino.forBlock['nrf54_ble_on_char_write'] = function(block, generator) {
  const charField = block.getField('CHAR_VAR');
  const charVar = charField ? charField.getText() : 'charHandle';
  const handlerCode = generator.statementToCode(block, 'HANDLER') || '';

  ensureNrf54BleGlobals(generator);

  generator.addVariable('_nrf54_ble_last_write_value', 'static String _nrf54_ble_last_write_value = "";');

  const callbackName = '_nrf54_ble_write_cb_' + charVar;

  generator.addFunction(callbackName,
    'void ' + callbackName + '(uint16_t valueHandle, const uint8_t* value, uint8_t valueLength, bool withResponse, void* context) {\n' +
    '  _nrf54_ble_last_write_value = "";\n' +
    '  for (uint8_t i = 0; i < valueLength; ++i) {\n' +
    '    _nrf54_ble_last_write_value += (char)value[i];\n' +
    '  }\n' +
    handlerCode +
    '}\n');

  const setupCode = '_nrf54_ble.setCustomGattWriteHandler(' + charVar + ', ' + callbackName + ', nullptr);';
  generator.addSetupEnd(callbackName + '_setup', setupCode);

  return '';
};

Arduino.forBlock['nrf54_ble_char_write_value'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);
  generator.addVariable('_nrf54_ble_last_write_value', 'static String _nrf54_ble_last_write_value = "";');

  return ['_nrf54_ble_last_write_value', generator.ORDER_ATOMIC];
};

// ==================== Nordic UART 服务 (NUS) ====================

Arduino.forBlock['nrf54_ble_nus_init'] = function(block, generator) {
  const name = generator.valueToCode(block, 'NAME', generator.ORDER_ATOMIC) || '"X54-NUS"';

  ensureNrf54NusGlobals(generator);
  generator.addVariable('_nrf54_nus_was_connected', 'static bool _nrf54_nus_was_connected = false;');
  generator.addVariable('_nrf54_ble_adv_interaction', 'static BleAdvInteraction _nrf54_ble_adv_interaction{};');

  var code = '_nrf54_ble.begin(0);\n';
  code += '_nrf54_ble_power.setLatencyMode(PowerLatencyMode::kLowPower);\n';
  code += '_nrf54_ble.setAdvertisingPduType(BleAdvPduType::kAdvInd);\n';
  code += '_nrf54_ble.setAdvertisingName(String(' + name + ').c_str(), true);\n';
  code += '_nrf54_ble.setScanResponseName(String(' + name + ').c_str());\n';
  code += '_nrf54_ble.setGattDeviceName(String(' + name + ').c_str());\n';
  code += '_nrf54_nus.begin();\n';
  code += '_nrf54_ble.setBackgroundConnectionServiceEnabled(true);\n';

  return code;
};

Arduino.forBlock['nrf54_ble_nus_available'] = function(block, generator) {
  ensureNrf54NusGlobals(generator);

  return ['_nrf54_nus.available()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['nrf54_ble_nus_read_string'] = function(block, generator) {
  ensureNrf54NusGlobals(generator);

  generator.addFunction('_nrf54_nus_read_string',
    'String _nrf54_nus_read_string() {\n' +
    '  String result = "";\n' +
    '  while (_nrf54_nus.available()) {\n' +
    '    result += (char)_nrf54_nus.read();\n' +
    '  }\n' +
    '  return result;\n' +
    '}\n');

  return ['_nrf54_nus_read_string()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['nrf54_ble_nus_write'] = function(block, generator) {
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';

  ensureNrf54NusGlobals(generator);

  var code = '{\n';
  code += '  String _d = String(' + data + ');\n';
  code += '  _nrf54_nus.write(reinterpret_cast<const uint8_t*>(_d.c_str()), _d.length());\n';
  code += '}\n';
  return code;
};

Arduino.forBlock['nrf54_ble_nus_println'] = function(block, generator) {
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';

  ensureNrf54NusGlobals(generator);

  var code = '{\n';
  code += '  String _d = String(' + data + ') + "\\r\\n";\n';
  code += '  _nrf54_nus.write(reinterpret_cast<const uint8_t*>(_d.c_str()), _d.length());\n';
  code += '}\n';
  return code;
};

Arduino.forBlock['nrf54_ble_nus_connected'] = function(block, generator) {
  ensureNrf54NusGlobals(generator);

  return ['_nrf54_nus.isConnected()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['nrf54_ble_nus_service'] = function(block, generator) {
  ensureNrf54NusGlobals(generator);
  generator.addVariable('_nrf54_ble_adv_interaction', 'static BleAdvInteraction _nrf54_ble_adv_interaction{};');

  generator.addFunction('_nrf54_nus_service_loop',
    'void _nrf54_nus_service_loop() {\n' +
    '  if (!_nrf54_ble.isConnected()) {\n' +
    '    _nrf54_ble.advertiseInteractEvent(&_nrf54_ble_adv_interaction, 350U, 300000UL, 700000UL);\n' +
    '    if (!_nrf54_ble.isConnected()) {\n' +
    '      delay(20);\n' +
    '    }\n' +
    '    return;\n' +
    '  }\n' +
    '  BleConnectionEvent evt{};\n' +
    '  _nrf54_ble.pollConnectionEvent(&evt, 450000UL);\n' +
    '  _nrf54_nus.service(&evt);\n' +
    '}\n');

  return '_nrf54_nus_service_loop();\n';
};

// ==================== 扫描 ====================

Arduino.forBlock['nrf54_ble_scan_passive'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);

  generator.addVariable('_nrf54_ble_scan_pkt', 'static BleScanPacket _nrf54_ble_scan_pkt{};');

  return ['_nrf54_ble.scanCycle(&_nrf54_ble_scan_pkt, 2000000UL)', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['nrf54_ble_scan_active'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);

  generator.addVariable('_nrf54_ble_active_scan_result', 'static BleActiveScanResult _nrf54_ble_active_scan_result{};');

  return ['_nrf54_ble.scanActiveCycle(&_nrf54_ble_active_scan_result, 300000UL, 300000UL)', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['nrf54_ble_scan_get_address'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);

  generator.addFunction('_nrf54_ble_scan_addr_str',
    'String _nrf54_ble_scan_addr_str() {\n' +
    '  char buf[18] = {0};\n' +
    '  const uint8_t* addr = _nrf54_ble_active_scan_result.advertiserAddress;\n' +
    '  snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X",\n' +
    '    addr[5], addr[4], addr[3], addr[2], addr[1], addr[0]);\n' +
    '  return String(buf);\n' +
    '}\n');
  generator.addVariable('_nrf54_ble_active_scan_result', 'static BleActiveScanResult _nrf54_ble_active_scan_result{};');

  return ['_nrf54_ble_scan_addr_str()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['nrf54_ble_scan_get_rssi'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);
  generator.addVariable('_nrf54_ble_active_scan_result', 'static BleActiveScanResult _nrf54_ble_active_scan_result{};');

  return ['_nrf54_ble_active_scan_result.advRssiDbm', generator.ORDER_MEMBER];
};

Arduino.forBlock['nrf54_ble_scan_get_name'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);
  generator.addVariable('_nrf54_ble_active_scan_result', 'static BleActiveScanResult _nrf54_ble_active_scan_result{};');

  generator.addFunction('_nrf54_ble_scan_parse_name',
    'String _nrf54_ble_scan_parse_name() {\n' +
    '  const uint8_t* data = _nrf54_ble_active_scan_result.advData();\n' +
    '  uint8_t len = _nrf54_ble_active_scan_result.advDataLength();\n' +
    '  if (!data || len == 0) return "";\n' +
    '  uint8_t pos = 0;\n' +
    '  while (pos < len) {\n' +
    '    uint8_t fieldLen = data[pos];\n' +
    '    if (fieldLen == 0 || pos + fieldLen >= len) break;\n' +
    '    uint8_t fieldType = data[pos + 1];\n' +
    '    if (fieldType == 0x09 || fieldType == 0x08) {\n' +
    '      String name = "";\n' +
    '      for (uint8_t i = 0; i < fieldLen - 1; ++i) {\n' +
    '        name += (char)data[pos + 2 + i];\n' +
    '      }\n' +
    '      return name;\n' +
    '    }\n' +
    '    pos += fieldLen + 1;\n' +
    '  }\n' +
    '  return "";\n' +
    '}\n');

  return ['_nrf54_ble_scan_parse_name()', generator.ORDER_FUNCTION_CALL];
};

// ==================== 快速外设模式 ====================

Arduino.forBlock['nrf54_ble_peripheral_quick'] = function(block, generator) {
  const name = generator.valueToCode(block, 'NAME', generator.ORDER_ATOMIC) || '"XIAO-nRF54"';
  const onReceiveCode = generator.statementToCode(block, 'ON_RECEIVE') || '';

  ensureNrf54NusGlobals(generator);

  generator.addVariable('_nrf54_ble_adv_interaction', 'static BleAdvInteraction _nrf54_ble_adv_interaction{};');
  generator.addVariable('_nrf54_nus_was_connected', 'static bool _nrf54_nus_was_connected = false;');
  generator.addVariable('_nrf54_ble_rx_data', 'static String _nrf54_ble_rx_data = "";');

  generator.addFunction('_nrf54_ble_quick_on_receive',
    'void _nrf54_ble_quick_on_receive() {\n' +
    onReceiveCode +
    '}\n');

  generator.addFunction('_nrf54_ble_quick_loop',
    'void _nrf54_ble_quick_loop() {\n' +
    '  if (!_nrf54_ble.isConnected()) {\n' +
    '    _nrf54_nus_was_connected = false;\n' +
    '    _nrf54_ble.advertiseInteractEvent(&_nrf54_ble_adv_interaction, 350U, 300000UL, 700000UL);\n' +
    '    if (!_nrf54_ble.isConnected()) {\n' +
    '      delay(20);\n' +
    '    }\n' +
    '    return;\n' +
    '  }\n' +
    '  BleConnectionEvent evt{};\n' +
    '  _nrf54_ble.pollConnectionEvent(&evt, 450000UL);\n' +
    '  _nrf54_nus.service(&evt);\n' +
    '  if (_nrf54_nus.available()) {\n' +
    '    _nrf54_ble_rx_data = "";\n' +
    '    while (_nrf54_nus.available()) {\n' +
    '      _nrf54_ble_rx_data += (char)_nrf54_nus.read();\n' +
    '    }\n' +
    '    _nrf54_ble_quick_on_receive();\n' +
    '  }\n' +
    '}\n');

  // Setup code
  var setupCode = '_nrf54_ble.begin(0);\n';
  setupCode += '  _nrf54_ble_power.setLatencyMode(PowerLatencyMode::kLowPower);\n';
  setupCode += '  _nrf54_ble.setAdvertisingPduType(BleAdvPduType::kAdvInd);\n';
  setupCode += '  _nrf54_ble.setAdvertisingName(String(' + name + ').c_str(), true);\n';
  setupCode += '  _nrf54_ble.setScanResponseName(String(' + name + ').c_str());\n';
  setupCode += '  _nrf54_ble.setGattDeviceName(String(' + name + ').c_str());\n';
  setupCode += '  _nrf54_nus.begin();\n';
  setupCode += '  _nrf54_ble.setBackgroundConnectionServiceEnabled(true);';
  generator.addSetupEnd('_nrf54_ble_quick_setup', setupCode);

  // Loop code
  generator.addLoopEnd('_nrf54_ble_quick_loop_call', '_nrf54_ble_quick_loop();');

  return '';
};

Arduino.forBlock['nrf54_ble_peripheral_received_data'] = function(block, generator) {
  ensureNrf54NusGlobals(generator);
  generator.addVariable('_nrf54_ble_rx_data', 'static String _nrf54_ble_rx_data = "";');

  return ['_nrf54_ble_rx_data', generator.ORDER_ATOMIC];
};

Arduino.forBlock['nrf54_ble_peripheral_send'] = function(block, generator) {
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';

  ensureNrf54NusGlobals(generator);

  var code = '{\n';
  code += '  String _d = String(' + data + ');\n';
  code += '  _nrf54_nus.write(reinterpret_cast<const uint8_t*>(_d.c_str()), _d.length());\n';
  code += '}\n';
  return code;
};

Arduino.forBlock['nrf54_ble_peripheral_connected'] = function(block, generator) {
  ensureNrf54NusGlobals(generator);

  return ['_nrf54_nus.isConnected()', generator.ORDER_FUNCTION_CALL];
};

// ==================== 电源管理 ====================

Arduino.forBlock['nrf54_ble_power_low_power_mode'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);

  return '_nrf54_ble_power.setLatencyMode(PowerLatencyMode::kLowPower);\n';
};

Arduino.forBlock['nrf54_ble_battery_percent'] = function(block, generator) {
  ensureNrf54BleGlobals(generator);

  generator.addFunction('_nrf54_ble_read_battery',
    'uint8_t _nrf54_ble_read_battery() {\n' +
    '  uint8_t percent = 0;\n' +
    '  BoardControl::sampleBatteryPercent(&percent);\n' +
    '  return percent;\n' +
    '}\n');

  return ['_nrf54_ble_read_battery()', generator.ORDER_FUNCTION_CALL];
};
