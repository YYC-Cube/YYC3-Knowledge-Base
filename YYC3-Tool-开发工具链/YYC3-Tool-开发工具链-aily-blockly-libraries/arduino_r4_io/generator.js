// Arduino UNO R4 I/O控制库代码生成器
// 支持ADC分辨率设置和DAC波形生成

// 设置ADC分辨率
Arduino.forBlock['r4_io_adc_resolution'] = function(block, generator) {
  const resolution = block.getFieldValue('RESOLUTION');

  return `analogReadResolution(${resolution});\n`;
};

// 初始化DAC为指定波形和频率
Arduino.forBlock['r4_io_dac_init'] = function(block, generator) {
  const waveform = block.getFieldValue('CHANNEL');
  const frequency = generator.valueToCode(block, 'FREQUENCY', Arduino.ORDER_ATOMIC) || '10';

  // 添加必要的库和对象
  generator.addLibrary('analogWave', '#include "analogWave.h"');
  generator.addObject('wave', 'analogWave wave(DAC);');

  // 根据波形类型生成不同的初始化代码
  let code;
  switch(waveform) {
    case 'sine':
      code = `wave.sin(${frequency});\n`;
      break;
    case 'square':
      code = `wave.square(${frequency});\n`;
      break;
    case 'saw':
      code = `wave.saw(${frequency});\n`;
      break;
    default:
      code = `wave.sin(${frequency});\n`;
  }

  return code;
};

// 设置DAC频率
Arduino.forBlock['r4_io_dac_set_frequency'] = function(block, generator) {
  const frequency = generator.valueToCode(block, 'FREQUENCY', Arduino.ORDER_ATOMIC) || '10';

  generator.addLibrary('analogWave', '#include "analogWave.h"');
  generator.addObject('wave', 'analogWave wave(DAC);');

  return `wave.freq(${frequency});\n`;
};

// 设置DAC幅度
Arduino.forBlock['r4_io_dac_set_amplitude'] = function(block, generator) {
  const amplitude = generator.valueToCode(block, 'AMPLITUDE', Arduino.ORDER_ATOMIC) || '0.5';

  generator.addLibrary('analogWave', '#include "analogWave.h"');
  generator.addObject('wave', 'analogWave wave(DAC);');

  return `wave.amplitude(${amplitude});\n`;
};

// 设置DAC偏移
Arduino.forBlock['r4_io_dac_set_offset'] = function(block, generator) {
  const offset = generator.valueToCode(block, 'OFFSET', Arduino.ORDER_ATOMIC) || '0';

  generator.addLibrary('analogWave', '#include "analogWave.h"');
  generator.addObject('wave', 'analogWave wave(DAC);');

  return `wave.offset(${offset});\n`;
};

// 启动DAC
Arduino.forBlock['r4_io_dac_start'] = function(block, generator) {
  generator.addLibrary('analogWave', '#include "analogWave.h"');
  generator.addObject('wave', 'analogWave wave(DAC);');

  return `wave.start();\n`;
};

// 停止DAC
Arduino.forBlock['r4_io_dac_stop'] = function(block, generator) {
  generator.addLibrary('analogWave', '#include "analogWave.h"');
  generator.addObject('wave', 'analogWave wave(DAC);');

  return `wave.stop();\n`;
};