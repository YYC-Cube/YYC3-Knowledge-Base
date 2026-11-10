// // 确保Serial已初始化，兼容core-serial的去重机制
// function ensureSerialBegin(serialPort, generator) {
//   // 初始化Arduino的Serial相关全局变量，兼容core-serial
//   if (!Arduino.addedSerialInitCode) {
//     Arduino.addedSerialInitCode = new Set();
//   }
  
//   // 检查这个串口是否已经添加过初始化代码（无论是用户设置的还是默认的）
//   if (!Arduino.addedSerialInitCode.has(serialPort)) {
//     // 只有在没有添加过任何初始化代码时才添加默认初始化
//     generator.addSetupBegin(`serial_${serialPort}_begin`, `${serialPort}.begin(9600);`);
//     // 标记为已添加初始化代码
//     Arduino.addedSerialInitCode.add(serialPort);
//   }
// }

Arduino.forBlock['wifimanager_init'] = function(block, generator) {
  generator.addLibrary('#include <WiFiManager.h>', '#include <WiFiManager.h>');
  generator.addObject('WiFiManager wm', 'WiFiManager wm;');
  return '';
};

Arduino.forBlock['wifimanager_autoconnect'] = function(block, generator) {
  generator.addLibrary('#include <WiFiManager.h>', '#include <WiFiManager.h>');
  generator.addObject('WiFiManager wm', 'WiFiManager wm;');
  
  var ssid = generator.valueToCode(block, 'SSID', generator.ORDER_ATOMIC) || '""';
  var password = generator.valueToCode(block, 'PASSWORD', generator.ORDER_ATOMIC) || '""';
  
  var code = 'wm.autoConnect(' + ssid + ', ' + password + ')';
  return [code, generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['wifimanager_autoconnect_simple'] = function(block, generator) {
  generator.addLibrary('#include <WiFiManager.h>', '#include <WiFiManager.h>');
  generator.addObject('WiFiManager wm', 'WiFiManager wm;');
  
  var code = 'wm.autoConnect()';
  return [code, generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['wifimanager_simple_setup'] = function(block, generator) {
  generator.addLibrary('#include <WiFiManager.h>', '#include <WiFiManager.h>');
  generator.addObject('WiFiManager wm', 'WiFiManager wm;');
  
  var ssid = generator.valueToCode(block, 'SSID', generator.ORDER_ATOMIC) || '"AutoConnectAP"';
  var password = generator.valueToCode(block, 'PASSWORD', generator.ORDER_ATOMIC) || '"password"';
  
  // 确保Serial已初始化（兼容core-serial的去重机制）
  ensureSerialBegin('Serial', generator);
  
  generator.addSetupBegin('wifi_mode', 'WiFi.mode(WIFI_STA);');
  
  var code = 'if (!wm.autoConnect(' + ssid + ', ' + password + ')) {\n' +
             '  Serial.println("WiFi连接失败，已启动配置门户");\n' +
             '} else {\n' +
             '  Serial.println("WiFi连接成功！");\n' +
             '}\n';
  return code;
};

Arduino.forBlock['wifimanager_set_timeout'] = function(block, generator) {
  generator.addLibrary('#include <WiFiManager.h>', '#include <WiFiManager.h>');
  generator.addObject('WiFiManager wm', 'WiFiManager wm;');
  
  var timeout = generator.valueToCode(block, 'TIMEOUT', generator.ORDER_ATOMIC) || '30';
  
  var code = 'wm.setConfigPortalTimeout(' + timeout + ');\n';
  return code;
};

Arduino.forBlock['wifimanager_reset_settings'] = function(block, generator) {
  generator.addLibrary('#include <WiFiManager.h>', '#include <WiFiManager.h>');
  generator.addObject('WiFiManager wm', 'WiFiManager wm;');
  
  var code = 'wm.resetSettings();\n';
  return code;
};

Arduino.forBlock['wifimanager_start_config_portal'] = function(block, generator) {
  generator.addLibrary('#include <WiFiManager.h>', '#include <WiFiManager.h>');
  generator.addObject('WiFiManager wm', 'WiFiManager wm;');
  
  var ssid = generator.valueToCode(block, 'SSID', generator.ORDER_ATOMIC) || '"ConfigPortal"';
  var password = generator.valueToCode(block, 'PASSWORD', generator.ORDER_ATOMIC) || '"password"';
  
  var code = 'wm.startConfigPortal(' + ssid + ', ' + password + ')';
  return [code, generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['wifimanager_set_blocking'] = function(block, generator) {
  generator.addLibrary('#include <WiFiManager.h>', '#include <WiFiManager.h>');
  generator.addObject('WiFiManager wm', 'WiFiManager wm;');
  
  var mode = block.getFieldValue('MODE');
  var blocking = mode === 'true' ? 'true' : 'false';
  
  var code = 'wm.setConfigPortalBlocking(' + blocking + ');\n';
  return code;
};

Arduino.forBlock['wifimanager_process'] = function(block, generator) {
  generator.addLibrary('#include <WiFiManager.h>', '#include <WiFiManager.h>');
  generator.addObject('WiFiManager wm', 'WiFiManager wm;');
  
  var code = 'wm.process();\n';
  return code;
};

Arduino.forBlock['wifimanager_set_static_ip'] = function(block, generator) {
  generator.addLibrary('#include <WiFiManager.h>', '#include <WiFiManager.h>');
  generator.addObject('WiFiManager wm', 'WiFiManager wm;');
  
  var ip = generator.valueToCode(block, 'IP', generator.ORDER_ATOMIC) || '"192.168.1.100"';
  var gateway = generator.valueToCode(block, 'GATEWAY', generator.ORDER_ATOMIC) || '"192.168.1.1"';
  var subnet = generator.valueToCode(block, 'SUBNET', generator.ORDER_ATOMIC) || '"255.255.255.0"';
  
  generator.addFunction('parseIP', 
    'IPAddress parseIP(String ip) {\n' +
    '  IPAddress result;\n' +
    '  result.fromString(ip);\n' +
    '  return result;\n' +
    '}'
  );
  
  var code = 'wm.setSTAStaticIPConfig(parseIP(' + ip + '), parseIP(' + gateway + '), parseIP(' + subnet + '));\n';
  return code;
};

Arduino.forBlock['wifimanager_add_parameter'] = function(block, generator) {
  generator.addLibrary('#include <WiFiManager.h>', '#include <WiFiManager.h>');
  generator.addObject('WiFiManager wm', 'WiFiManager wm;');
  
  var id = generator.valueToCode(block, 'ID', generator.ORDER_ATOMIC) || '"custom_param"';
  var label = generator.valueToCode(block, 'LABEL', generator.ORDER_ATOMIC) || '"Custom Parameter"';
  var defaultValue = generator.valueToCode(block, 'DEFAULT_VALUE', generator.ORDER_ATOMIC) || '""';
  var length = generator.valueToCode(block, 'LENGTH', generator.ORDER_ATOMIC) || '40';
  
  var paramVar = 'custom_param_' + id.replace(/"/g, '').replace(/[^a-zA-Z0-9]/g, '_');
  
  generator.addObject('WiFiManagerParameter ' + paramVar, 'WiFiManagerParameter ' + paramVar + '(' + id + ', ' + label + ', ' + defaultValue + ', ' + length + ');');
  
  var code = 'wm.addParameter(&' + paramVar + ');\n';
  return code;
};

Arduino.forBlock['wifimanager_get_parameter'] = function(block, generator) {
  generator.addLibrary('#include <WiFiManager.h>', '#include <WiFiManager.h>');
  generator.addObject('WiFiManager wm', 'WiFiManager wm;');
  
  var paramId = generator.valueToCode(block, 'PARAM_ID', generator.ORDER_ATOMIC) || '"custom_param"';
  
  var functionName = 'getWiFiManagerParam';
  generator.addFunction(functionName, 
    'String ' + functionName + '(String name) {\n' +
    '  String value;\n' +
    '  if(wm.server->hasArg(name)) {\n' +
    '    value = wm.server->arg(name);\n' +
    '  }\n' +
    '  return value;\n' +
    '}'
  );
  
  var code = functionName + '(' + paramId + ')';
  return [code, generator.ORDER_FUNCTION_CALL];
};

if (window['boardConfig'] && window['boardConfig'].core) {
  if (window['boardConfig'].core.indexOf('esp32') === -1 && 
      window['boardConfig'].core.indexOf('esp8266') === -1) {
    console.warn('WiFiManager库主要支持ESP32和ESP8266开发板');
  }
}
