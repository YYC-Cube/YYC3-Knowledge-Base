Arduino.forBlock['wifi_begin'] = function(block, generator) {
  // 添加库引用（仅添加一次）
  generator.addLibrary('UnoWiFiDevEd', '#include <UnoWiFiDevEd.h>');
  return 'Wifi.begin();\n';
};

Arduino.forBlock['wifi_connect'] = function(block, generator) {
  var ssid = generator.valueToCode(block, 'SSID', generator.ORDER_ATOMIC) || '"mySSID"';
  var pwd = generator.valueToCode(block, 'PASSWORD', generator.ORDER_ATOMIC) || '"myPassword"';
  // 确保库已经引用
  generator.addLibrary('UnoWiFiDevEd', '#include <UnoWiFiDevEd.h>');
  return 'Wifi.connect(' + ssid + ', ' + pwd + ');\n';
};

Arduino.forBlock['wifi_connected'] = function(block, generator) {
  generator.addLibrary('UnoWiFiDevEd', '#include <UnoWiFiDevEd.h>');
  var code = 'Wifi.connected()';
  return [code, generator.ORDER_ATOMIC];
};

Arduino.forBlock['ciao_begin'] = function(block, generator) {
  // 添加库引用
  generator.addLibrary('UnoWiFiDevEd', '#include <UnoWiFiDevEd.h>');
  return 'Ciao.begin();\n';
};

Arduino.forBlock['ciao_read'] = function(block, generator) {
  var connector = block.getFieldValue('CONNECTOR');
  var hostname = generator.valueToCode(block, 'HOSTNAME', generator.ORDER_ATOMIC) || '""';
  var method = block.getFieldValue('METHOD');
  // 调用 Ciao.read(connector, hostname, "", method)
  generator.addLibrary('UnoWiFiDevEd', '#include <UnoWiFiDevEd.h>');
  var code = 'Ciao.read("' + connector + '", ' + hostname + ', "", "' + method + '")';
  return [code, generator.ORDER_ATOMIC];
};

Arduino.forBlock['ciao_write'] = function(block, generator) {
  var connector = block.getFieldValue('CONNECTOR');
  var hostname = generator.valueToCode(block, 'HOSTNAME', generator.ORDER_ATOMIC) || '""';
  var data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';
  var method = block.getFieldValue('METHOD');
  // 调用 Ciao.write(connector, hostname, data, method)
  generator.addLibrary('UnoWiFiDevEd', '#include <UnoWiFiDevEd.h>');
  var code = 'Ciao.write("' + connector + '", ' + hostname + ', ' + data + ', "' + method + '");\n';
  return code;
};