'use strict';

function ensureETHLib(generator) {
  generator.addLibrary('ETH', '#include <ETH.h>');
}

Arduino.forBlock['esp32_eth_begin'] = function(block, generator) {
  const phyType = block.getFieldValue('PHY_TYPE') || 'ETH_PHY_LAN8720';
  const addr = generator.valueToCode(block, 'ADDR', generator.ORDER_ATOMIC) || '0';
  ensureETHLib(generator);
  return 'ETH.begin(' + phyType + ', ' + addr + ');\n';
};

Arduino.forBlock['esp32_eth_begin_spi'] = function(block, generator) {
  const phyType = block.getFieldValue('PHY_TYPE') || 'ETH_PHY_W5500';
  const cs = generator.valueToCode(block, 'CS', generator.ORDER_ATOMIC) || '5';
  const irq = generator.valueToCode(block, 'IRQ', generator.ORDER_ATOMIC) || '4';
  const rst = generator.valueToCode(block, 'RST', generator.ORDER_ATOMIC) || '-1';
  ensureETHLib(generator);
  generator.addLibrary('SPI', '#include <SPI.h>');
  return 'ETH.begin(' + phyType + ', 1, ' + cs + ', ' + irq + ', ' + rst + ', SPI);\n';
};

Arduino.forBlock['esp32_eth_connected'] = function(block, generator) {
  ensureETHLib(generator);
  return ['ETH.connected()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_eth_local_ip'] = function(block, generator) {
  ensureETHLib(generator);
  return ['ETH.localIP().toString()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_eth_mac'] = function(block, generator) {
  ensureETHLib(generator);
  return ['ETH.macAddress()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_eth_full_duplex'] = function(block, generator) {
  ensureETHLib(generator);
  return ['ETH.fullDuplex()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_eth_link_speed'] = function(block, generator) {
  ensureETHLib(generator);
  return ['ETH.linkSpeed()', generator.ORDER_FUNCTION_CALL];
};
