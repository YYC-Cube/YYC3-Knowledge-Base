// 在generator.js文件开头添加扩展定义
if (Blockly.Extensions.isRegistered('ags02ma_init_extension')) {
  Blockly.Extensions.unregister('ags02ma_init_extension');
}
Blockly.Extensions.register('ags02ma_init_extension', function() {
  // 直接使用 args0 里的 options，不再动态生成
  // 如果后续需要动态变更，可以用 this.getField('WIRE').menuGenerator_ = ... 赋值
  // 但通常 blockly 会自动用 block.json 里的 options

  var boardConfig = window['boardConfig'] || {};
  var boardCore = (boardConfig.core || '').toLowerCase();
  var boardName = (boardConfig.name || '').toLowerCase();
    boardName.indexOf('arduino') > -1 ||
    boardName.indexOf('uno') > -1 ||
    boardName.indexOf('nano') > -1 ||
    boardName.indexOf('mega') > -1 ||
    boardCore.indexOf('avr') > -1;

  var wireField = this.getField('WIRE');
  if (!wireField) return;

});

Arduino.forBlock['ags02ma_init'] = function(block, generator) {
  var boardConfig = window['boardConfig'] || {};
  var boardCore = (boardConfig.core || '').toLowerCase();
  var boardName = (boardConfig.name || '').toLowerCase();

  var isArduinoCore = boardCore.indexOf('arduino') > -1 ||
    boardName.indexOf('arduino') > -1 ||
    boardName.indexOf('uno') > -1 ||
    boardName.indexOf('nano') > -1 ||
    boardName.indexOf('mega') > -1 ||
    boardCore.indexOf('avr') > -1;

  // 获取wire选项
  var wireOption = 'Wire';
  if (!isArduinoCore) {
    wireOption = block.getFieldValue('WIRE') || 'Wire';
  }

  generator.addLibrary('Wire', '#include <Wire.h>');
  generator.addLibrary('AGS02MA', '#include <AGS02MA.h>');
  generator.addVariable('ags02ma', 'AGS02MA ags02ma(0x1A, &' + wireOption + ');');

  // 动态获取I2C引脚
  let sda = null, scl = null;
  try {
    let pins = null;
    const customPins = window['customI2CPins'];
    if (customPins && customPins[wireOption]) {
      pins = customPins[wireOption];
    } else if (boardConfig && boardConfig.i2cPins && boardConfig.i2cPins[wireOption]) {
      pins = boardConfig.i2cPins[wireOption];
    }
    if (pins) {
      const sdaPin = pins.find(pin => pin[0] === 'SDA');
      const sclPin = pins.find(pin => pin[0] === 'SCL');
      if (sdaPin && sclPin) {
        sda = sdaPin[1];
        scl = sclPin[1];
      }
    }
  } catch (e) {}

  // 生成 Wire.begin 代码
  let setupCode = '// 配置I2C引脚并初始化AGS02MA TVOC传感器\n';
  setupCode += 'Serial.println("AGS02MA TVOC传感器初始化...");\n';
  if (isArduinoCore) {
    setupCode += 'Wire.begin();\n';
    setupCode += 'Serial.println("Arduino板卡使用引脚: SDA=A4, SCL=A5");\n';
  } else {
    if (sda !== null && scl !== null) {
      setupCode += `${wireOption}.begin(${sda}, ${scl});\n`;
      setupCode += `Serial.println("${wireOption}使用引脚: SDA=${sda}, SCL=${scl}");\n`;
    } else {
      setupCode += `${wireOption}.begin();\n`;
      setupCode += `Serial.println("${wireOption}使用默认引脚");\n`;
    }
  }

  // 添加AGS02MA初始化代码
  setupCode += `
if (ags02ma.begin()) {
  Serial.println("AGS02MA传感器初始化成功!");
  ags02ma.setPPBMode();
  Serial.println("传感器设置完成，开始测量!");
} else {
  Serial.println("警告: AGS02MA传感器初始化失败!");
  Serial.println("请检查:");
  Serial.println("1. 传感器地址是否为0x1A");
  Serial.println("2. I2C接线是否正确");
  Serial.println("3. 传感器供电是否正常");
}`;

  generator.addSetup('ags02ma_init', setupCode);
  return '';
};

// 读取TVOC浓度（PPB）- 简化版
Arduino.forBlock['ags02ma_read_tvoc_ppb'] = function(block, generator) {
  // 注意：需要先手动设置PPB模式
  return ['ags02ma.readPPB()', Arduino.ORDER_FUNCTION_CALL];
};

// 读取TVOC浓度（μg/m³）- 带换算的版本
Arduino.forBlock['ags02ma_read_tvoc_ugm3'] = function(block, generator) {
  // 添加换算辅助函数
  generator.addFunction('ags02ma_ugm3_convert', `
float ags02ma_read_ugm3_converted() {
  uint32_t raw_value = ags02ma.readUGM3();
  return raw_value * 3.48;  // 将PPB值转换为真正的μg/m³值
}`);
  
  return ['ags02ma_read_ugm3_converted()', Arduino.ORDER_FUNCTION_CALL];
};

// 重置传感器
Arduino.forBlock['ags02ma_reset'] = function(block, generator) {
  return 'ags02ma.reset();\n';
};