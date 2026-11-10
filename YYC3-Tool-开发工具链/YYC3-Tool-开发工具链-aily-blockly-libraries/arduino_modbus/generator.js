// Modbus RTU Client Begin
Arduino.forBlock['modbus_rtu_client_begin'] = function(block, generator) {
  const baudrate = block.getFieldValue('BAUDRATE');
  
  generator.addLibrary('ArduinoRS485', '#include <ArduinoRS485.h>');
  generator.addLibrary('ArduinoModbus', '#include <ArduinoModbus.h>');
  
  const code = `if (!ModbusRTUClient.begin(${baudrate})) {
    Serial.println("Failed to start Modbus RTU Client!");
    while (1);
  }\n`;
  
  return code;
};

// Modbus RTU Server Begin
Arduino.forBlock['modbus_rtu_server_begin'] = function(block, generator) {
  const slaveId = block.getFieldValue('SLAVE_ID');
  const baudrate = block.getFieldValue('BAUDRATE');
  
  generator.addLibrary('ArduinoRS485', '#include <ArduinoRS485.h>');
  generator.addLibrary('ArduinoModbus', '#include <ArduinoModbus.h>');
  
  const code = `if (!ModbusRTUServer.begin(${slaveId}, ${baudrate})) {
    Serial.println("Failed to start Modbus RTU Server!");
    while (1);
  }\n`;
  
  return code;
};

// Modbus TCP Client Begin
Arduino.forBlock['modbus_tcp_client_begin'] = function(block, generator) {
  const ip = generator.valueToCode(block, 'IP', Arduino.ORDER_ATOMIC) || '""';
  const port = block.getFieldValue('PORT');
  
  generator.addLibrary('ArduinoRS485', '#include <ArduinoRS485.h>');
  generator.addLibrary('ArduinoModbus', '#include <ArduinoModbus.h>');
  generator.addLibrary('WiFi', '#include <WiFi.h>');
  generator.addObject('WiFiClient', 'WiFiClient wifiClient;');
  generator.addObject('ModbusTCPClient', 'ModbusTCPClient modbusTCPClient(wifiClient);');
  
  const code = `IPAddress serverIP;
  serverIP.fromString(${ip});
  if (!modbusTCPClient.begin(serverIP, ${port})) {
    Serial.println("Failed to start Modbus TCP Client!");
    while (1);
  }\n`;
  
  return code;
};

// Modbus TCP Server Begin
Arduino.forBlock['modbus_tcp_server_begin'] = function(block, generator) {
  const slaveId = block.getFieldValue('SLAVE_ID');
  
  generator.addLibrary('ArduinoRS485', '#include <ArduinoRS485.h>');
  generator.addLibrary('ArduinoModbus', '#include <ArduinoModbus.h>');
  generator.addLibrary('WiFi', '#include <WiFi.h>');
  generator.addObject('WiFiServer', 'WiFiServer wifiServer(502);');
  generator.addObject('ModbusTCPServer', 'ModbusTCPServer modbusTCPServer;');
  
  generator.addSetupBegin('wifiServer_begin', 'wifiServer.begin();');
  
  const code = `if (!modbusTCPServer.begin(${slaveId})) {
    Serial.println("Failed to start Modbus TCP Server!");
    while (1);
  }\n`;
  
  return code;
};

// Coil Read
Arduino.forBlock['modbus_coil_read'] = function(block, generator) {
  const slaveId = block.getFieldValue('SLAVE_ID');
  const address = block.getFieldValue('ADDRESS');
  
  // 检测是否使用TCP客户端
  const boardConfig = window['boardConfig'];
  let clientObject = 'ModbusRTUClient';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    clientObject = 'modbusTCPClient';
  }
  
  if (slaveId === 0) {
    const code = `${clientObject}.coilRead(${address})`;
    return [code, Arduino.ORDER_FUNCTION_CALL];
  } else {
    const code = `${clientObject}.coilRead(${slaveId}, ${address})`;
    return [code, Arduino.ORDER_FUNCTION_CALL];
  }
};

// Coil Write
Arduino.forBlock['modbus_coil_write'] = function(block, generator) {
  const slaveId = block.getFieldValue('SLAVE_ID');
  const address = block.getFieldValue('ADDRESS');
  const value = generator.valueToCode(block, 'VALUE', Arduino.ORDER_ATOMIC) || '0';
  
  // 检测是否使用TCP客户端
  const boardConfig = window['boardConfig'];
  let clientObject = 'ModbusRTUClient';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    clientObject = 'modbusTCPClient';
  }
  
  let code;
  if (slaveId === 0) {
    code = `${clientObject}.coilWrite(${address}, ${value});\n`;
  } else {
    code = `${clientObject}.coilWrite(${slaveId}, ${address}, ${value});\n`;
  }
  
  return code;
};

// Discrete Input Read
Arduino.forBlock['modbus_discrete_input_read'] = function(block, generator) {
  const slaveId = block.getFieldValue('SLAVE_ID');
  const address = block.getFieldValue('ADDRESS');
  
  const boardConfig = window['boardConfig'];
  let clientObject = 'ModbusRTUClient';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    clientObject = 'modbusTCPClient';
  }
  
  if (slaveId === 0) {
    const code = `${clientObject}.discreteInputRead(${address})`;
    return [code, Arduino.ORDER_FUNCTION_CALL];
  } else {
    const code = `${clientObject}.discreteInputRead(${slaveId}, ${address})`;
    return [code, Arduino.ORDER_FUNCTION_CALL];
  }
};

// Holding Register Read
Arduino.forBlock['modbus_holding_register_read'] = function(block, generator) {
  const slaveId = block.getFieldValue('SLAVE_ID');
  const address = block.getFieldValue('ADDRESS');
  
  const boardConfig = window['boardConfig'];
  let clientObject = 'ModbusRTUClient';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    clientObject = 'modbusTCPClient';
  }
  
  if (slaveId === 0) {
    const code = `${clientObject}.holdingRegisterRead(${address})`;
    return [code, Arduino.ORDER_FUNCTION_CALL];
  } else {
    const code = `${clientObject}.holdingRegisterRead(${slaveId}, ${address})`;
    return [code, Arduino.ORDER_FUNCTION_CALL];
  }
};

// Holding Register Write
Arduino.forBlock['modbus_holding_register_write'] = function(block, generator) {
  const slaveId = block.getFieldValue('SLAVE_ID');
  const address = block.getFieldValue('ADDRESS');
  const value = generator.valueToCode(block, 'VALUE', Arduino.ORDER_ATOMIC) || '0';
  
  const boardConfig = window['boardConfig'];
  let clientObject = 'ModbusRTUClient';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    clientObject = 'modbusTCPClient';
  }
  
  let code;
  if (slaveId === 0) {
    code = `${clientObject}.holdingRegisterWrite(${address}, ${value});\n`;
  } else {
    code = `${clientObject}.holdingRegisterWrite(${slaveId}, ${address}, ${value});\n`;
  }
  
  return code;
};

// Input Register Read
Arduino.forBlock['modbus_input_register_read'] = function(block, generator) {
  const slaveId = block.getFieldValue('SLAVE_ID');
  const address = block.getFieldValue('ADDRESS');
  
  const boardConfig = window['boardConfig'];
  let clientObject = 'ModbusRTUClient';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    clientObject = 'modbusTCPClient';
  }
  
  if (slaveId === 0) {
    const code = `${clientObject}.inputRegisterRead(${address})`;
    return [code, Arduino.ORDER_FUNCTION_CALL];
  } else {
    const code = `${clientObject}.inputRegisterRead(${slaveId}, ${address})`;
    return [code, Arduino.ORDER_FUNCTION_CALL];
  }
};

// Server Configure Coils
Arduino.forBlock['modbus_server_configure_coils'] = function(block, generator) {
  const startAddress = block.getFieldValue('START_ADDRESS');
  const count = block.getFieldValue('COUNT');
  
  // 检查当前开发板配置，决定使用哪个服务器对象
  const boardConfig = window['boardConfig'];
  let serverObject = 'ModbusRTUServer';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    // 对于支持WiFi的开发板，也可能使用TCP服务器
    serverObject = 'modbusTCPServer';
  }
  
  const code = `${serverObject}.configureCoils(${startAddress}, ${count});\n`;
  return code;
};

// Server Configure Discrete Inputs
Arduino.forBlock['modbus_server_configure_discrete_inputs'] = function(block, generator) {
  const startAddress = block.getFieldValue('START_ADDRESS');
  const count = block.getFieldValue('COUNT');
  
  const boardConfig = window['boardConfig'];
  let serverObject = 'ModbusRTUServer';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    serverObject = 'modbusTCPServer';
  }
  
  const code = `${serverObject}.configureDiscreteInputs(${startAddress}, ${count});\n`;
  return code;
};

// Server Configure Holding Registers
Arduino.forBlock['modbus_server_configure_holding_registers'] = function(block, generator) {
  const startAddress = block.getFieldValue('START_ADDRESS');
  const count = block.getFieldValue('COUNT');
  
  const boardConfig = window['boardConfig'];
  let serverObject = 'ModbusRTUServer';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    serverObject = 'modbusTCPServer';
  }
  
  const code = `${serverObject}.configureHoldingRegisters(${startAddress}, ${count});\n`;
  return code;
};

// Server Configure Input Registers
Arduino.forBlock['modbus_server_configure_input_registers'] = function(block, generator) {
  const startAddress = block.getFieldValue('START_ADDRESS');
  const count = block.getFieldValue('COUNT');
  
  const boardConfig = window['boardConfig'];
  let serverObject = 'ModbusRTUServer';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    serverObject = 'modbusTCPServer';
  }
  
  const code = `${serverObject}.configureInputRegisters(${startAddress}, ${count});\n`;
  return code;
};

// Server Poll
Arduino.forBlock['modbus_server_poll'] = function(block, generator) {
  const boardConfig = window['boardConfig'];
  let serverObject = 'ModbusRTUServer';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    serverObject = 'modbusTCPServer';
  }
  
  const code = `${serverObject}.poll()`;
  return [code, Arduino.ORDER_FUNCTION_CALL];
};

// Server Coil Read
Arduino.forBlock['modbus_server_coil_read'] = function(block, generator) {
  const address = block.getFieldValue('ADDRESS');
  
  const boardConfig = window['boardConfig'];
  let serverObject = 'ModbusRTUServer';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    serverObject = 'modbusTCPServer';
  }
  
  const code = `${serverObject}.coilRead(${address})`;
  return [code, Arduino.ORDER_FUNCTION_CALL];
};

// Server Coil Write
Arduino.forBlock['modbus_server_coil_write'] = function(block, generator) {
  const address = block.getFieldValue('ADDRESS');
  const value = generator.valueToCode(block, 'VALUE', Arduino.ORDER_ATOMIC) || '0';
  
  const boardConfig = window['boardConfig'];
  let serverObject = 'ModbusRTUServer';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    serverObject = 'modbusTCPServer';
  }
  
  const code = `${serverObject}.coilWrite(${address}, ${value});\n`;
  return code;
};

// Server Discrete Input Write
Arduino.forBlock['modbus_server_discrete_input_write'] = function(block, generator) {
  const address = block.getFieldValue('ADDRESS');
  const value = generator.valueToCode(block, 'VALUE', Arduino.ORDER_ATOMIC) || '0';
  
  const boardConfig = window['boardConfig'];
  let serverObject = 'ModbusRTUServer';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    serverObject = 'modbusTCPServer';
  }
  
  const code = `${serverObject}.discreteInputWrite(${address}, ${value});\n`;
  return code;
};

// Server Holding Register Read
Arduino.forBlock['modbus_server_holding_register_read'] = function(block, generator) {
  const address = block.getFieldValue('ADDRESS');
  
  const boardConfig = window['boardConfig'];
  let serverObject = 'ModbusRTUServer';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    serverObject = 'modbusTCPServer';
  }
  
  const code = `${serverObject}.holdingRegisterRead(${address})`;
  return [code, Arduino.ORDER_FUNCTION_CALL];
};

// Server Holding Register Write
Arduino.forBlock['modbus_server_holding_register_write'] = function(block, generator) {
  const address = block.getFieldValue('ADDRESS');
  const value = generator.valueToCode(block, 'VALUE', Arduino.ORDER_ATOMIC) || '0';
  
  const boardConfig = window['boardConfig'];
  let serverObject = 'ModbusRTUServer';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    serverObject = 'modbusTCPServer';
  }
  
  const code = `${serverObject}.holdingRegisterWrite(${address}, ${value});\n`;
  return code;
};

// Server Input Register Write
Arduino.forBlock['modbus_server_input_register_write'] = function(block, generator) {
  const address = block.getFieldValue('ADDRESS');
  const value = generator.valueToCode(block, 'VALUE', Arduino.ORDER_ATOMIC) || '0';
  
  const boardConfig = window['boardConfig'];
  let serverObject = 'ModbusRTUServer';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    serverObject = 'modbusTCPServer';
  }
  
  const code = `${serverObject}.inputRegisterWrite(${address}, ${value});\n`;
  return code;
};

// Last Error
Arduino.forBlock['modbus_last_error'] = function(block, generator) {
  const boardConfig = window['boardConfig'];
  let clientObject = 'ModbusRTUClient';
  
  if (boardConfig && (boardConfig.core.indexOf('esp32') > -1 || boardConfig.core.indexOf('arduino:samd') > -1)) {
    clientObject = 'modbusTCPClient';
  }
  
  const code = `${clientObject}.lastError()`;
  return [code, Arduino.ORDER_FUNCTION_CALL];
};

// Quick Coil Control - 简化的线圈控制，自动处理初始化
Arduino.forBlock['modbus_quick_coil_control'] = function(block, generator) {
  const slaveId = block.getFieldValue('SLAVE_ID');
  const address = block.getFieldValue('ADDRESS');
  const value = block.getFieldValue('VALUE');
  
  generator.addLibrary('ArduinoRS485', '#include <ArduinoRS485.h>');
  generator.addLibrary('ArduinoModbus', '#include <ArduinoModbus.h>');
  
  // 自动添加初始化代码到setup
  generator.addSetupBegin('modbus_rtu_init', `if (!ModbusRTUClient.begin(9600)) {
    Serial.println("Failed to start Modbus RTU Client!");
    while (1);
  }`);
  
  const code = `ModbusRTUClient.coilWrite(${slaveId}, ${address}, ${value});\n`;
  return code;
};

// Quick Register Read - 简化的寄存器读取
Arduino.forBlock['modbus_quick_register_read'] = function(block, generator) {
  const slaveId = block.getFieldValue('SLAVE_ID');
  const address = block.getFieldValue('ADDRESS');
  
  generator.addLibrary('ArduinoRS485', '#include <ArduinoRS485.h>');
  generator.addLibrary('ArduinoModbus', '#include <ArduinoModbus.h>');
  
  // 自动添加初始化代码到setup
  generator.addSetupBegin('modbus_rtu_init', `if (!ModbusRTUClient.begin(9600)) {
    Serial.println("Failed to start Modbus RTU Client!");
    while (1);
  }`);
  
  const code = `ModbusRTUClient.holdingRegisterRead(${slaveId}, ${address})`;
  return [code, Arduino.ORDER_FUNCTION_CALL];
};
