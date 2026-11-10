// ESP32 I2C 通信库 Generator
// 为ESP32平台提供I2C主从模式通信支持

// 检查扩展是否已注册，避免重复加载
if (Blockly.Extensions.isRegistered('esp32_i2c_address_extension')) {
  Blockly.Extensions.unregister('esp32_i2c_address_extension');
}

// 注册地址选择扩展
Blockly.Extensions.register('esp32_i2c_address_extension', function() {
  this.getField('ADDRESS').setValidator(function(newValue) {
    if (newValue === 'CUSTOM') {
      // 如果选择自定义地址，则显示输入框
      this.getSourceBlock().getInput('ADDRESS_INPUT').setVisible(true);
    } else {
      // 否则隐藏输入框
      this.getSourceBlock().getInput('ADDRESS_INPUT').setVisible(false);
    }
    this.getSourceBlock().render();
    return newValue;
  });
});

// I2C 初始化（指定引脚和频率）
Arduino.forBlock['esp32_i2c_begin'] = function(block, generator) {
  const sdaPin = generator.valueToCode(block, 'SDA_PIN', generator.ORDER_ATOMIC) || '21';
  const sclPin = generator.valueToCode(block, 'SCL_PIN', generator.ORDER_ATOMIC) || '22';
  const frequency = block.getFieldValue('FREQUENCY');
  
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  generator.addSetupBegin('wire_begin', `Wire.begin(${sdaPin}, ${sclPin}, ${frequency});`);
  
  return '';
};

// I2C 初始化（默认引脚）
Arduino.forBlock['esp32_i2c_begin_simple'] = function(block, generator) {
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  generator.addSetupBegin('wire_begin_simple', 'Wire.begin();');
  
  return '';
};

// 扫描I2C设备
Arduino.forBlock['esp32_i2c_scan_devices'] = function(block, generator) {
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  
  const functionName = 'scanI2CDevices';
  const functionCode = `
int ${functionName}() {
  byte error, address;
  int nDevices = 0;
  
  Serial.println("扫描I2C设备...");
  for (address = 0x01; address < 0x7f; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    if (error == 0) {
      Serial.print("I2C设备发现于地址 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      nDevices++;
    } else if (error != 2) {
      Serial.print("错误 ");
      Serial.print(error);
      Serial.print(" 于地址 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
    }
  }
  if (nDevices == 0) {
    Serial.println("未发现I2C设备");
  } else {
    Serial.print("发现 ");
    Serial.print(nDevices);
    Serial.println(" 个设备");
  }
  return nDevices;
}`;
  
  generator.addFunction(functionName, functionCode);
  
  return [`${functionName}()`, generator.ORDER_FUNCTION_CALL];
};

// 开始传输
Arduino.forBlock['esp32_i2c_begin_transmission'] = function(block, generator) {
  const address = generator.valueToCode(block, 'ADDRESS', generator.ORDER_ATOMIC) || '0x00';
  
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  
  return `Wire.beginTransmission(${address});\n`;
};

// 写入字节数据
Arduino.forBlock['esp32_i2c_write_byte'] = function(block, generator) {
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '0';
  
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  
  return `Wire.write(${data});\n`;
};

// 写入字符串数据
Arduino.forBlock['esp32_i2c_write_string'] = function(block, generator) {
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';
  
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  
  return `Wire.print(${data});\n`;
};

// 结束传输
Arduino.forBlock['esp32_i2c_end_transmission'] = function(block, generator) {
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  
  return ['Wire.endTransmission()', generator.ORDER_FUNCTION_CALL];
};

// 请求数据
Arduino.forBlock['esp32_i2c_request_from'] = function(block, generator) {
  const address = generator.valueToCode(block, 'ADDRESS', generator.ORDER_ATOMIC) || '0x00';
  const quantity = generator.valueToCode(block, 'QUANTITY', generator.ORDER_ATOMIC) || '1';
  
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  
  return [`Wire.requestFrom(${address}, ${quantity})`, generator.ORDER_FUNCTION_CALL];
};

// 可读取字节数
Arduino.forBlock['esp32_i2c_available'] = function(block, generator) {
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  
  return ['Wire.available()', generator.ORDER_FUNCTION_CALL];
};

// 读取数据
Arduino.forBlock['esp32_i2c_read'] = function(block, generator) {
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  
  return ['Wire.read()', generator.ORDER_FUNCTION_CALL];
};

// I2C从模式初始化
Arduino.forBlock['esp32_i2c_slave_begin'] = function(block, generator) {
  const address = generator.valueToCode(block, 'ADDRESS', generator.ORDER_ATOMIC) || '0x55';
  const sdaPin = generator.valueToCode(block, 'SDA_PIN', generator.ORDER_ATOMIC) || '21';
  const sclPin = generator.valueToCode(block, 'SCL_PIN', generator.ORDER_ATOMIC) || '22';
  
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  generator.addSetupBegin('wire_slave_begin', `Wire.begin((uint8_t)${address}, ${sdaPin}, ${sclPin});`);
  
  return '';
};

// 从设备接收数据回调
Arduino.forBlock['esp32_i2c_on_receive'] = function(block, generator) {
  const statements = generator.statementToCode(block, 'CALLBACK');
  
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  
  const functionName = 'onI2CReceive';
  const functionCode = `
void ${functionName}(int len) {
  Serial.print("接收到数据[");
  Serial.print(len);
  Serial.print("]: ");
  while (Wire.available()) {
    Serial.write(Wire.read());
  }
  Serial.println();
${statements}}`;
  
  generator.addFunction(functionName, functionCode);
  generator.addSetupBegin('wire_on_receive', `Wire.onReceive(${functionName});`);
  
  return '';
};

// 从设备响应请求回调
Arduino.forBlock['esp32_i2c_on_request'] = function(block, generator) {
  const statements = generator.statementToCode(block, 'CALLBACK');
  
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  generator.addVariable('i2c_counter', 'uint32_t i2c_counter = 0;');
  
  const functionName = 'onI2CRequest';
  const functionCode = `
void ${functionName}() {
  Serial.println("主设备请求数据");
${statements}}`;
  
  generator.addFunction(functionName, functionCode);
  generator.addSetupBegin('wire_on_request', `Wire.onRequest(${functionName});`);
  
  return '';
};

// 从设备发送数据
Arduino.forBlock['esp32_i2c_slave_print'] = function(block, generator) {
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';
  
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  
  return `Wire.print(${data});\n`;
};

// 简化版写入设备
Arduino.forBlock['esp32_i2c_write_to_device'] = function(block, generator) {
  let address = block.getFieldValue('ADDRESS');
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';
  
  if (address === 'CUSTOM') {
    address = generator.valueToCode(block, 'CUSTOM_ADDRESS', generator.ORDER_ATOMIC) || '0x00';
  }
  
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  
  const code = `Wire.beginTransmission(${address});
Wire.print(${data});
Wire.endTransmission();
`;
  
  return code;
};

// 简化版从设备读取
Arduino.forBlock['esp32_i2c_read_from_device'] = function(block, generator) {
  let address = block.getFieldValue('ADDRESS');
  const quantity = generator.valueToCode(block, 'QUANTITY', generator.ORDER_ATOMIC) || '1';
  
  if (address === 'CUSTOM') {
    address = generator.valueToCode(block, 'CUSTOM_ADDRESS', generator.ORDER_ATOMIC) || '0x00';
  }
  
  generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
  
  const functionName = 'readFromI2CDevice';
  const functionCode = `
uint8_t* ${functionName}(uint8_t address, size_t quantity) {
  static uint8_t buffer[128];
  uint8_t bytesReceived = Wire.requestFrom(address, quantity);
  
  if (bytesReceived > 0) {
    for (int i = 0; i < bytesReceived && i < 128; i++) {
      buffer[i] = Wire.read();
    }
  }
  
  return buffer;
}`;
  
  generator.addFunction(functionName, functionCode);
  
  return [`${functionName}(${address}, ${quantity})`, generator.ORDER_FUNCTION_CALL];
};

// 添加通用工具函数
Arduino.addReservedWords('Wire,wire_begin,wire_begin_simple,scanI2CDevices,onI2CReceive,onI2CRequest,readFromI2CDevice,i2c_counter');
