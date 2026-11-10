// SerialTransfer Blockly Library - Code Generator

// 初始化 SerialTransfer 对象
Arduino.forBlock['serial_transfer_init'] = function(block, generator) {
  var varName = block.getFieldValue('VAR') || 'myTransfer';
  var serialPort = block.getFieldValue('SERIAL') || 'Serial';
  var baud = generator.valueToCode(block, 'BAUD', generator.ORDER_ATOMIC) || '115200';

  // 变量重命名监听
  if (!block._varMonitorAttached) {
    block._varMonitorAttached = true;
    var field = block.getField('VAR');
    if (field) {
      var oldVal = field.getValue();
      field.setValidator(function(newVal) {
        if (oldVal !== newVal) {
          try {
            renameVariableInBlockly(block, oldVal, newVal, 'SerialTransfer');
          } catch (e) {}
          oldVal = newVal;
        }
        return newVal;
      });
    }
  }

  // 注册变量
  try {
    registerVariableToBlockly(varName, 'SerialTransfer');
  } catch (e) {}

  // 添加库
  generator.addLibrary('SerialTransfer_include', '#include <SerialTransfer.h>');

  // 声明全局对象
  generator.addVariable('serial_transfer_' + varName, 'SerialTransfer ' + varName + ';');

  // 初始化串口和 SerialTransfer
  generator.addSetupBegin('serial_transfer_serial_' + varName, serialPort + '.begin(' + baud + ');');
  generator.addSetupBegin('serial_transfer_begin_' + varName, varName + '.begin(' + serialPort + ');');

  return '';
};

// 发送整数
Arduino.forBlock['serial_transfer_send_int'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'myTransfer';
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
  var packetID = generator.valueToCode(block, 'PACKET_ID', generator.ORDER_ATOMIC) || '0';

  generator.addLibrary('SerialTransfer_include', '#include <SerialTransfer.h>');

  var code = '{\n';
  code += '  int32_t _st_val = ' + value + ';\n';
  code += '  uint16_t _st_size = ' + varName + '.txObj(_st_val);\n';
  code += '  ' + varName + '.sendData(_st_size, ' + packetID + ');\n';
  code += '}\n';

  return code;
};

// 发送浮点数
Arduino.forBlock['serial_transfer_send_float'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'myTransfer';
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0.0';
  var packetID = generator.valueToCode(block, 'PACKET_ID', generator.ORDER_ATOMIC) || '0';

  generator.addLibrary('SerialTransfer_include', '#include <SerialTransfer.h>');

  var code = '{\n';
  code += '  float _st_val = ' + value + ';\n';
  code += '  uint16_t _st_size = ' + varName + '.txObj(_st_val);\n';
  code += '  ' + varName + '.sendData(_st_size, ' + packetID + ');\n';
  code += '}\n';

  return code;
};

// 发送字符串
Arduino.forBlock['serial_transfer_send_string'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'myTransfer';
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '""';
  var packetID = generator.valueToCode(block, 'PACKET_ID', generator.ORDER_ATOMIC) || '0';

  generator.addLibrary('SerialTransfer_include', '#include <SerialTransfer.h>');

  var funcName = '_st_sendString_' + varName;
  var funcCode = 'void ' + funcName + '(const char* str, uint8_t packetID) {\n' +
    '  uint16_t len = strlen(str) + 1;\n' +
    '  if (len > 0xFE) len = 0xFE;\n' +
    '  for (uint16_t i = 0; i < len; i++) {\n' +
    '    ' + varName + '.packet.txBuff[i] = str[i];\n' +
    '  }\n' +
    '  ' + varName + '.sendData(len, packetID);\n' +
    '}';
  generator.addFunction(funcName, funcCode);

  var code = funcName + '(String(' + value + ').c_str(), ' + packetID + ');\n';
  return code;
};

// 检查是否有新数据
Arduino.forBlock['serial_transfer_available'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'myTransfer';

  generator.addLibrary('SerialTransfer_include', '#include <SerialTransfer.h>');

  return ['(' + varName + '.available() > 0)', generator.ORDER_ATOMIC];
};

// 接收整数
Arduino.forBlock['serial_transfer_receive_int'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'myTransfer';

  generator.addLibrary('SerialTransfer_include', '#include <SerialTransfer.h>');

  var funcName = '_st_recvInt_' + varName;
  var funcCode = 'int32_t ' + funcName + '() {\n' +
    '  int32_t val = 0;\n' +
    '  ' + varName + '.rxObj(val);\n' +
    '  return val;\n' +
    '}';
  generator.addFunction(funcName, funcCode);

  return [funcName + '()', generator.ORDER_ATOMIC];
};

// 接收浮点数
Arduino.forBlock['serial_transfer_receive_float'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'myTransfer';

  generator.addLibrary('SerialTransfer_include', '#include <SerialTransfer.h>');

  var funcName = '_st_recvFloat_' + varName;
  var funcCode = 'float ' + funcName + '() {\n' +
    '  float val = 0;\n' +
    '  ' + varName + '.rxObj(val);\n' +
    '  return val;\n' +
    '}';
  generator.addFunction(funcName, funcCode);

  return [funcName + '()', generator.ORDER_ATOMIC];
};

// 接收字符串
Arduino.forBlock['serial_transfer_receive_string'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'myTransfer';
  var length = generator.valueToCode(block, 'LENGTH', generator.ORDER_ATOMIC) || '32';

  generator.addLibrary('SerialTransfer_include', '#include <SerialTransfer.h>');

  var funcName = '_st_recvString_' + varName;
  var funcCode = 'String ' + funcName + '(uint16_t len) {\n' +
    '  char buf[0xFF];\n' +
    '  memset(buf, 0, sizeof(buf));\n' +
    '  if (len > 0xFE) len = 0xFE;\n' +
    '  for (uint16_t i = 0; i < len && i < ' + varName + '.bytesRead; i++) {\n' +
    '    buf[i] = ' + varName + '.packet.rxBuff[i];\n' +
    '  }\n' +
    '  buf[len] = \'\\0\';\n' +
    '  return String(buf);\n' +
    '}';
  generator.addFunction(funcName, funcCode);

  return [funcName + '(' + length + ')', generator.ORDER_ATOMIC];
};

// 获取传输状态
Arduino.forBlock['serial_transfer_status'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'myTransfer';

  generator.addLibrary('SerialTransfer_include', '#include <SerialTransfer.h>');

  return [varName + '.status', generator.ORDER_ATOMIC];
};

// 获取当前包ID
Arduino.forBlock['serial_transfer_current_packet_id'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'myTransfer';

  generator.addLibrary('SerialTransfer_include', '#include <SerialTransfer.h>');

  return [varName + '.currentPacketID()', generator.ORDER_ATOMIC];
};

// ==================== I2CTransfer ====================

// 初始化 I2CTransfer 主机
Arduino.forBlock['i2c_transfer_init_master'] = function(block, generator) {
  var varName = block.getFieldValue('VAR') || 'i2cTransfer';
  var wirePort = block.getFieldValue('WIRE') || 'Wire';

  if (!block._varMonitorAttached) {
    block._varMonitorAttached = true;
    var field = block.getField('VAR');
    if (field) {
      var oldVal = field.getValue();
      field.setValidator(function(newVal) {
        if (oldVal !== newVal) {
          try { renameVariableInBlockly(block, oldVal, newVal, 'I2CTransfer'); } catch (e) {}
          oldVal = newVal;
        }
        return newVal;
      });
    }
  }

  try { registerVariableToBlockly(varName, 'I2CTransfer'); } catch (e) {}

  generator.addLibrary('I2CTransfer_include', '#include <I2CTransfer.h>');
  generator.addVariable('i2c_transfer_' + varName, 'I2CTransfer ' + varName + ';');
  generator.addSetupBegin('i2c_wire_begin_' + varName, wirePort + '.begin();');
  generator.addSetupBegin('i2c_transfer_begin_' + varName, varName + '.begin(' + wirePort + ');');

  return '';
};

// 初始化 I2CTransfer 从机
Arduino.forBlock['i2c_transfer_init_slave'] = function(block, generator) {
  var varName = block.getFieldValue('VAR') || 'i2cTransfer';
  var wirePort = block.getFieldValue('WIRE') || 'Wire';
  var address = generator.valueToCode(block, 'ADDRESS', generator.ORDER_ATOMIC) || '0';

  if (!block._varMonitorAttached) {
    block._varMonitorAttached = true;
    var field = block.getField('VAR');
    if (field) {
      var oldVal = field.getValue();
      field.setValidator(function(newVal) {
        if (oldVal !== newVal) {
          try { renameVariableInBlockly(block, oldVal, newVal, 'I2CTransfer'); } catch (e) {}
          oldVal = newVal;
        }
        return newVal;
      });
    }
  }

  try { registerVariableToBlockly(varName, 'I2CTransfer'); } catch (e) {}

  generator.addLibrary('I2CTransfer_include', '#include <I2CTransfer.h>');
  generator.addVariable('i2c_transfer_' + varName, 'I2CTransfer ' + varName + ';');
  generator.addSetupBegin('i2c_wire_begin_' + varName, wirePort + '.begin(' + address + ');');
  generator.addSetupBegin('i2c_transfer_begin_' + varName, varName + '.begin(' + wirePort + ');');

  return '';
};

// I2CTransfer 发送整数
Arduino.forBlock['i2c_transfer_send_int'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'i2cTransfer';
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
  var address = generator.valueToCode(block, 'ADDRESS', generator.ORDER_ATOMIC) || '0';
  var packetID = generator.valueToCode(block, 'PACKET_ID', generator.ORDER_ATOMIC) || '0';

  generator.addLibrary('I2CTransfer_include', '#include <I2CTransfer.h>');

  var code = '{\n';
  code += '  int32_t _i2c_val = ' + value + ';\n';
  code += '  uint16_t _i2c_size = ' + varName + '.txObj(_i2c_val);\n';
  code += '  ' + varName + '.sendData(_i2c_size, ' + packetID + ', ' + address + ');\n';
  code += '}\n';
  return code;
};

// I2CTransfer 发送浮点数
Arduino.forBlock['i2c_transfer_send_float'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'i2cTransfer';
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0.0';
  var address = generator.valueToCode(block, 'ADDRESS', generator.ORDER_ATOMIC) || '0';
  var packetID = generator.valueToCode(block, 'PACKET_ID', generator.ORDER_ATOMIC) || '0';

  generator.addLibrary('I2CTransfer_include', '#include <I2CTransfer.h>');

  var code = '{\n';
  code += '  float _i2c_val = ' + value + ';\n';
  code += '  uint16_t _i2c_size = ' + varName + '.txObj(_i2c_val);\n';
  code += '  ' + varName + '.sendData(_i2c_size, ' + packetID + ', ' + address + ');\n';
  code += '}\n';
  return code;
};

// I2CTransfer 发送字符串
Arduino.forBlock['i2c_transfer_send_string'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'i2cTransfer';
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '""';
  var address = generator.valueToCode(block, 'ADDRESS', generator.ORDER_ATOMIC) || '0';
  var packetID = generator.valueToCode(block, 'PACKET_ID', generator.ORDER_ATOMIC) || '0';

  generator.addLibrary('I2CTransfer_include', '#include <I2CTransfer.h>');

  var funcName = '_i2c_sendString_' + varName;
  var funcCode = 'void ' + funcName + '(const char* str, uint8_t packetID, uint8_t addr) {\n' +
    '  uint16_t len = strlen(str) + 1;\n' +
    '  if (len > 0xFE) len = 0xFE;\n' +
    '  for (uint16_t i = 0; i < len; i++) {\n' +
    '    ' + varName + '.packet.txBuff[i] = str[i];\n' +
    '  }\n' +
    '  ' + varName + '.sendData(len, packetID, addr);\n' +
    '}';
  generator.addFunction(funcName, funcCode);

  return funcName + '(String(' + value + ').c_str(), ' + packetID + ', ' + address + ');\n';
};

// I2CTransfer 接收整数
Arduino.forBlock['i2c_transfer_receive_int'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'i2cTransfer';

  generator.addLibrary('I2CTransfer_include', '#include <I2CTransfer.h>');

  var funcName = '_i2c_recvInt_' + varName;
  var funcCode = 'int32_t ' + funcName + '() {\n' +
    '  int32_t val = 0;\n' +
    '  ' + varName + '.rxObj(val);\n' +
    '  return val;\n' +
    '}';
  generator.addFunction(funcName, funcCode);

  return [funcName + '()', generator.ORDER_ATOMIC];
};

// I2CTransfer 接收浮点数
Arduino.forBlock['i2c_transfer_receive_float'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'i2cTransfer';

  generator.addLibrary('I2CTransfer_include', '#include <I2CTransfer.h>');

  var funcName = '_i2c_recvFloat_' + varName;
  var funcCode = 'float ' + funcName + '() {\n' +
    '  float val = 0;\n' +
    '  ' + varName + '.rxObj(val);\n' +
    '  return val;\n' +
    '}';
  generator.addFunction(funcName, funcCode);

  return [funcName + '()', generator.ORDER_ATOMIC];
};

// I2CTransfer 接收字符串
Arduino.forBlock['i2c_transfer_receive_string'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'i2cTransfer';
  var length = generator.valueToCode(block, 'LENGTH', generator.ORDER_ATOMIC) || '32';

  generator.addLibrary('I2CTransfer_include', '#include <I2CTransfer.h>');

  var funcName = '_i2c_recvString_' + varName;
  var funcCode = 'String ' + funcName + '(uint16_t len) {\n' +
    '  char buf[0xFF];\n' +
    '  memset(buf, 0, sizeof(buf));\n' +
    '  if (len > 0xFE) len = 0xFE;\n' +
    '  for (uint16_t i = 0; i < len && i < ' + varName + '.bytesRead; i++) {\n' +
    '    buf[i] = ' + varName + '.packet.rxBuff[i];\n' +
    '  }\n' +
    '  buf[len] = \'\\0\';\n' +
    '  return String(buf);\n' +
    '}';
  generator.addFunction(funcName, funcCode);

  return [funcName + '(' + length + ')', generator.ORDER_ATOMIC];
};

// I2CTransfer 传输状态
Arduino.forBlock['i2c_transfer_status'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'i2cTransfer';

  generator.addLibrary('I2CTransfer_include', '#include <I2CTransfer.h>');

  return [varName + '.status', generator.ORDER_ATOMIC];
};

// ==================== SPITransfer ====================

// 初始化 SPITransfer 主机
Arduino.forBlock['spi_transfer_init_master'] = function(block, generator) {
  var varName = block.getFieldValue('VAR') || 'spiTransfer';
  var ssPin = generator.valueToCode(block, 'SS_PIN', generator.ORDER_ATOMIC) || 'SS';

  if (!block._varMonitorAttached) {
    block._varMonitorAttached = true;
    var field = block.getField('VAR');
    if (field) {
      var oldVal = field.getValue();
      field.setValidator(function(newVal) {
        if (oldVal !== newVal) {
          try { renameVariableInBlockly(block, oldVal, newVal, 'SPITransfer'); } catch (e) {}
          oldVal = newVal;
        }
        return newVal;
      });
    }
  }

  try { registerVariableToBlockly(varName, 'SPITransfer'); } catch (e) {}

  generator.addLibrary('SPITransfer_include', '#include <SPITransfer.h>');
  generator.addVariable('spi_transfer_' + varName, 'SPITransfer ' + varName + ';');
  generator.addSetupBegin('spi_ss_high_' + varName, 'digitalWrite(' + ssPin + ', HIGH);');
  generator.addSetupBegin('spi_begin_' + varName, 'SPI.begin();');
  generator.addSetupBegin('spi_clock_' + varName, 'SPI.setClockDivider(SPI_CLOCK_DIV8);');
  generator.addSetupBegin('spi_transfer_begin_' + varName, varName + '.begin(SPI);');

  return '';
};

// 初始化 SPITransfer 从机
Arduino.forBlock['spi_transfer_init_slave'] = function(block, generator) {
  var varName = block.getFieldValue('VAR') || 'spiTransfer';

  if (!block._varMonitorAttached) {
    block._varMonitorAttached = true;
    var field = block.getField('VAR');
    if (field) {
      var oldVal = field.getValue();
      field.setValidator(function(newVal) {
        if (oldVal !== newVal) {
          try { renameVariableInBlockly(block, oldVal, newVal, 'SPITransfer'); } catch (e) {}
          oldVal = newVal;
        }
        return newVal;
      });
    }
  }

  try { registerVariableToBlockly(varName, 'SPITransfer'); } catch (e) {}

  generator.addLibrary('SPITransfer_include', '#include <SPITransfer.h>');
  generator.addVariable('spi_transfer_' + varName, 'SPITransfer ' + varName + ';');
  generator.addVariable('spi_new_packet_' + varName, 'volatile bool _spi_newPacket_' + varName + ' = false;');

  // SPI slave setup
  generator.addSetupBegin('spi_slave_spcr_' + varName, 'SPCR |= bit(SPE);');
  generator.addSetupBegin('spi_slave_miso_' + varName, 'pinMode(MISO, OUTPUT);');
  generator.addSetupBegin('spi_slave_int_' + varName, 'SPI.attachInterrupt();');
  generator.addSetupBegin('spi_transfer_begin_' + varName, varName + '.begin(SPI);');

  // SPI ISR
  var isrCode = 'ISR(SPI_STC_vect) {\n' +
    '  if (' + varName + '.available())\n' +
    '    _spi_newPacket_' + varName + ' = true;\n' +
    '}';
  generator.addFunction('spi_isr_' + varName, isrCode);

  return '';
};

// SPITransfer 发送整数
Arduino.forBlock['spi_transfer_send_int'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'spiTransfer';
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
  var packetID = generator.valueToCode(block, 'PACKET_ID', generator.ORDER_ATOMIC) || '0';

  generator.addLibrary('SPITransfer_include', '#include <SPITransfer.h>');

  var code = '{\n';
  code += '  int32_t _spi_val = ' + value + ';\n';
  code += '  uint16_t _spi_size = ' + varName + '.txObj(_spi_val);\n';
  code += '  ' + varName + '.sendData(_spi_size, ' + packetID + ');\n';
  code += '}\n';
  return code;
};

// SPITransfer 发送浮点数
Arduino.forBlock['spi_transfer_send_float'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'spiTransfer';
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0.0';
  var packetID = generator.valueToCode(block, 'PACKET_ID', generator.ORDER_ATOMIC) || '0';

  generator.addLibrary('SPITransfer_include', '#include <SPITransfer.h>');

  var code = '{\n';
  code += '  float _spi_val = ' + value + ';\n';
  code += '  uint16_t _spi_size = ' + varName + '.txObj(_spi_val);\n';
  code += '  ' + varName + '.sendData(_spi_size, ' + packetID + ');\n';
  code += '}\n';
  return code;
};

// SPITransfer 发送字符串
Arduino.forBlock['spi_transfer_send_string'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'spiTransfer';
  var value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '""';
  var packetID = generator.valueToCode(block, 'PACKET_ID', generator.ORDER_ATOMIC) || '0';

  generator.addLibrary('SPITransfer_include', '#include <SPITransfer.h>');

  var funcName = '_spi_sendString_' + varName;
  var funcCode = 'void ' + funcName + '(const char* str, uint8_t packetID) {\n' +
    '  uint16_t len = strlen(str) + 1;\n' +
    '  if (len > 0xFE) len = 0xFE;\n' +
    '  for (uint16_t i = 0; i < len; i++) {\n' +
    '    ' + varName + '.packet.txBuff[i] = str[i];\n' +
    '  }\n' +
    '  ' + varName + '.sendData(len, packetID);\n' +
    '}';
  generator.addFunction(funcName, funcCode);

  return funcName + '(String(' + value + ').c_str(), ' + packetID + ');\n';
};

// SPITransfer 收到新数据
Arduino.forBlock['spi_transfer_available'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'spiTransfer';

  generator.addLibrary('SPITransfer_include', '#include <SPITransfer.h>');

  return ['_spi_newPacket_' + varName, generator.ORDER_ATOMIC];
};

// SPITransfer 接收整数
Arduino.forBlock['spi_transfer_receive_int'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'spiTransfer';

  generator.addLibrary('SPITransfer_include', '#include <SPITransfer.h>');

  var funcName = '_spi_recvInt_' + varName;
  var funcCode = 'int32_t ' + funcName + '() {\n' +
    '  _spi_newPacket_' + varName + ' = false;\n' +
    '  int32_t val = 0;\n' +
    '  ' + varName + '.rxObj(val);\n' +
    '  return val;\n' +
    '}';
  generator.addFunction(funcName, funcCode);

  return [funcName + '()', generator.ORDER_ATOMIC];
};

// SPITransfer 接收浮点数
Arduino.forBlock['spi_transfer_receive_float'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'spiTransfer';

  generator.addLibrary('SPITransfer_include', '#include <SPITransfer.h>');

  var funcName = '_spi_recvFloat_' + varName;
  var funcCode = 'float ' + funcName + '() {\n' +
    '  _spi_newPacket_' + varName + ' = false;\n' +
    '  float val = 0;\n' +
    '  ' + varName + '.rxObj(val);\n' +
    '  return val;\n' +
    '}';
  generator.addFunction(funcName, funcCode);

  return [funcName + '()', generator.ORDER_ATOMIC];
};

// SPITransfer 接收字符串
Arduino.forBlock['spi_transfer_receive_string'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'spiTransfer';
  var length = generator.valueToCode(block, 'LENGTH', generator.ORDER_ATOMIC) || '32';

  generator.addLibrary('SPITransfer_include', '#include <SPITransfer.h>');

  var funcName = '_spi_recvString_' + varName;
  var funcCode = 'String ' + funcName + '(uint16_t len) {\n' +
    '  _spi_newPacket_' + varName + ' = false;\n' +
    '  char buf[0xFF];\n' +
    '  memset(buf, 0, sizeof(buf));\n' +
    '  if (len > 0xFE) len = 0xFE;\n' +
    '  for (uint16_t i = 0; i < len && i < ' + varName + '.bytesRead; i++) {\n' +
    '    buf[i] = ' + varName + '.packet.rxBuff[i];\n' +
    '  }\n' +
    '  buf[len] = \'\\0\';\n' +
    '  return String(buf);\n' +
    '}';
  generator.addFunction(funcName, funcCode);

  return [funcName + '(' + length + ')', generator.ORDER_ATOMIC];
};

// SPITransfer 传输状态
Arduino.forBlock['spi_transfer_status'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'spiTransfer';

  generator.addLibrary('SPITransfer_include', '#include <SPITransfer.h>');

  return [varName + '.status', generator.ORDER_ATOMIC];
};
