'use strict';

function ensureAsyncUDPLib(generator) {
  generator.addLibrary('AsyncUDP', '#include <AsyncUDP.h>');
}

Arduino.forBlock['esp32_asyncudp_create'] = function(block, generator) {
  const varName = block.getFieldValue('VAR') || 'udp';
  ensureAsyncUDPLib(generator);

  if (typeof registerVariableToBlockly === 'function') {
    registerVariableToBlockly(varName, 'AsyncUDP');
  }
  generator.addObject('AsyncUDP_' + varName, 'AsyncUDP ' + varName + ';');
  return '';
};

Arduino.forBlock['esp32_asyncudp_listen'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'udp';
  const port = generator.valueToCode(block, 'PORT', generator.ORDER_ATOMIC) || '1234';
  ensureAsyncUDPLib(generator);
  return varName + '.listen(' + port + ');\n';
};

Arduino.forBlock['esp32_asyncudp_on_packet'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'udp';
  const dataVar = block.getFieldValue('DATA_VAR') || 'data';
  const ipVar = block.getFieldValue('IP_VAR') || 'remoteIP';
  const portVar = block.getFieldValue('PORT_VAR') || 'remotePort';
  const handlerCode = generator.statementToCode(block, 'HANDLER') || '';
  ensureAsyncUDPLib(generator);

  let code = varName + '.onPacket([](AsyncUDPPacket packet) {\n';
  code += '  String ' + dataVar + ' = (const char*)packet.data();\n';
  code += '  String ' + ipVar + ' = packet.remoteIP().toString();\n';
  code += '  uint16_t ' + portVar + ' = packet.remotePort();\n';
  code += handlerCode;
  code += '});\n';

  return code;
};

Arduino.forBlock['esp32_asyncudp_send'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'udp';
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';
  const ip = generator.valueToCode(block, 'IP', generator.ORDER_ATOMIC) || '"255.255.255.255"';
  const port = generator.valueToCode(block, 'PORT', generator.ORDER_ATOMIC) || '1234';
  ensureAsyncUDPLib(generator);

  let code = '{\n';
  code += '  IPAddress targetIP;\n';
  code += '  targetIP.fromString(' + ip + ');\n';
  code += '  ' + varName + '.writeTo((const uint8_t*)String(' + data + ').c_str(), String(' + data + ').length(), targetIP, ' + port + ');\n';
  code += '}\n';
  return code;
};

Arduino.forBlock['esp32_asyncudp_broadcast'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'udp';
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';
  const port = generator.valueToCode(block, 'PORT', generator.ORDER_ATOMIC) || '1234';
  ensureAsyncUDPLib(generator);
  return varName + '.broadcastTo(' + data + ', ' + port + ');\n';
};

Arduino.forBlock['esp32_asyncudp_close'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'udp';
  ensureAsyncUDPLib(generator);
  return varName + '.close();\n';
};

Arduino.forBlock['esp32_asyncudp_listen_multicast'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'udp';
  const ip = generator.valueToCode(block, 'IP', generator.ORDER_ATOMIC) || '"239.1.2.3"';
  const port = generator.valueToCode(block, 'PORT', generator.ORDER_ATOMIC) || '1234';
  ensureAsyncUDPLib(generator);

  let code = '{\n';
  code += '  IPAddress multicastIP;\n';
  code += '  multicastIP.fromString(' + ip + ');\n';
  code += '  ' + varName + '.listenMulticast(multicastIP, ' + port + ');\n';
  code += '}\n';
  return code;
};
