'use strict';

// 智能板卡适配：WiFi库
function ensureWiFiLib(generator) {
  const boardConfig = window['boardConfig'];

  if (boardConfig && boardConfig.core && boardConfig.core.indexOf('esp32') > -1) {
    generator.addLibrary('WiFi', '#include <WiFi.h>');
  } else if (boardConfig && boardConfig.core && boardConfig.core.indexOf('renesas_uno') > -1) {
    generator.addLibrary('WiFi', '#include <WiFiS3.h>');
  } else {
    generator.addLibrary('WiFi', '#include <WiFi.h>');
  }
}

// 确保WiFiUDP和ArduinoWOL库引用
function ensureWOLLibs(generator) {
  ensureWiFiLib(generator);
  generator.addLibrary('WiFiUDP', '#include <WiFiUdp.h>');
  generator.addLibrary('ArduinoWOL', '#include <ArduinoWOL.h>');
  generator.addObject('wolUdp', 'WiFiUDP wolUdp;');
}

// 发送WOL魔术包（语句块）
Arduino.forBlock['wol_send'] = function(block, generator) {
  const mac = generator.valueToCode(block, 'MAC', generator.ORDER_ATOMIC) || '"00:11:22:33:44:55"';
  const broadcastIP = generator.valueToCode(block, 'BROADCAST_IP', generator.ORDER_ATOMIC) || '"255.255.255.255"';
  const port = generator.valueToCode(block, 'PORT', generator.ORDER_ATOMIC) || '9';

  ensureWOLLibs(generator);

  generator.addFunction('wolSendMagicPacket', `bool wolSendMagicPacket(const char* mac, const char* broadcastIP, uint16_t port) {
  IPAddress ip;
  ip.fromString(broadcastIP);
  wolUdp.begin(port);
  bool result = ArduinoWOL::sendMagicPacket(wolUdp, mac, ip, port);
  wolUdp.stop();
  return result;
}`);

  return 'wolSendMagicPacket(' + mac + ', ' + broadcastIP + ', ' + port + ');\n';
};

// 发送WOL魔术包（值块，返回布尔值）
Arduino.forBlock['wol_send_result'] = function(block, generator) {
  const mac = generator.valueToCode(block, 'MAC', generator.ORDER_ATOMIC) || '"00:11:22:33:44:55"';
  const broadcastIP = generator.valueToCode(block, 'BROADCAST_IP', generator.ORDER_ATOMIC) || '"255.255.255.255"';
  const port = generator.valueToCode(block, 'PORT', generator.ORDER_ATOMIC) || '9';

  ensureWOLLibs(generator);

  generator.addFunction('wolSendMagicPacket', `bool wolSendMagicPacket(const char* mac, const char* broadcastIP, uint16_t port) {
  IPAddress ip;
  ip.fromString(broadcastIP);
  wolUdp.begin(port);
  bool result = ArduinoWOL::sendMagicPacket(wolUdp, mac, ip, port);
  wolUdp.stop();
  return result;
}`);

  return ['wolSendMagicPacket(' + mac + ', ' + broadcastIP + ', ' + port + ')', generator.ORDER_ATOMIC];
};
