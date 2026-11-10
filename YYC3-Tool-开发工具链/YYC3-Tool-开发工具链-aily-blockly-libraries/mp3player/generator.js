
// MP3初始化块
Arduino.forBlock['gd3800_init'] = function(block, generator) {
  // 添加库文件，并添加预处理指令来区分ESP32和Arduino平台
  generator.addMacro('PLATFORM_CHECK', '#if defined(ESP32)\n  // ESP32平台\n  #define USE_ESP32_HARDWARE_SERIAL\n#else\n  // Arduino平台\n  #define USE_SOFTWARE_SERIAL\n#endif');
  generator.addLibrary('GD3800_Serial', '#include <GD3800_Serial.h>');
  
  // 获取用户指定的TX和RX引脚
  const pinTx = generator.valueToCode(block, 'PIN_TX', Arduino.ORDER_ATOMIC);
  const pinRx = generator.valueToCode(block, 'PIN_RX', Arduino.ORDER_ATOMIC);
  
  // 获取开发板配置信息
  var boardConfig = window['boardConfig'] || {};
  var boardCore = (boardConfig.core || '').toLowerCase();
  var boardName = (boardConfig.name || '').toLowerCase();
  
  // 判断开发板类型
  var isArduinoCore = boardCore.indexOf('arduino') > -1 || 
                     boardName.indexOf('arduino') > -1 || 
                     boardName.indexOf('uno') > -1 || 
                     boardName.indexOf('nano') > -1 || 
                     boardName.indexOf('mega') > -1;
                     
  var isESP32Core = boardCore.indexOf('esp32') > -1 || 
                   boardName.indexOf('esp32') > -1 || 
                   boardName.indexOf('esp') > -1;
  
  // 调试信息
  console.log('MP3Player Config: 开发板信息:', boardConfig);
  console.log('MP3Player Config: 核心类型:', boardCore);
  console.log('MP3Player Config: 板名:', boardName);
  console.log('MP3Player Config: isArduinoCore:', isArduinoCore);
  console.log('MP3Player Config: isESP32Core:', isESP32Core);
  
  // 根据开发板类型选择不同的串口实现
  if (isESP32Core) {
    // ESP32平台使用HardwareSerial，默认使用UART2
    generator.addVariable('MP3INIT', `GD3800_Serial mp3(${pinRx},${pinTx}, 2);  // ESP32: RX, TX, UART2`);
    generator.addSetupBegin('mp3being', 'mp3.begin(9600, SERIAL_8N1, ' + pinRx + ', ' + pinTx + ');  // ESP32串口初始化与引脚指定');
  } else {
    // Arduino平台使用SoftwareSerial
    generator.addVariable('MP3INIT', `GD3800_Serial mp3(${pinTx}, ${pinRx});  // Arduino: TX, RX`);
    generator.addSetupBegin('mp3being', 'mp3.begin(9600);  // Arduino串口初始化');
  }
  
  return '';
};

// MP3设置
Arduino.forBlock['gd3800_set'] = function(block, generator) {
  const gd3800_state = block.getFieldValue("GD3800_SETSTATE");
  
  const code = `mp3.${gd3800_state}();\n`;
  return code;
};

// MP3播放
Arduino.forBlock['gd3800_play'] = function(block, generator) {
  const mnum = generator.valueToCode(block, "MUSICNUM", Arduino.ORDER_ATOMIC);
  return `mp3.playFileByIndexNumber(${mnum});\n`;
};

// MP3模块设定播放循环模式
Arduino.forBlock['gd3800_cyclemode'] = function(block, generator) {
  const gd3800_emode = block.getFieldValue("GD3800_CYMODE");
  
  const code = `mp3.setLoopMode(${gd3800_emode});\n`;
  return code;
};

// MP3模块设定播放音效
Arduino.forBlock['gd3800_equalizer'] = function(block, generator) {
  const gd3800_emode = block.getFieldValue("GD3800_EQMODE");
  
  const code = `mp3.setEqualizer(${gd3800_emode});\n`;
  return code;
};

// MP3模块设置音量
Arduino.forBlock['gd3800_setvolume'] = function(block, generator) {
  const svol = generator.valueToCode(block, "SETVOLUME", Arduino.ORDER_ATOMIC);
  return `mp3.setVolume(${svol});\n`;
};