// Seeed BGT24LTR11 多普勒雷达传感器代码生成器

// 确保库已添加
function ensureDopplerRadarLibrary(generator) {
  generator.addLibrary('BGT24LTR11', '#include <BGT24LTR11.h>');
}

// 初始化多普勒雷达
Arduino.forBlock['doppler_radar_init'] = function(block, generator) {
  // 变量重命名监听
  if (!block._dopplerVarMonitorAttached) {
    block._dopplerVarMonitorAttached = true;
    block._dopplerVarLastName = block.getFieldValue('VAR') || 'BGT';
    registerVariableToBlockly(block._dopplerVarLastName, 'BGT24LTR11');
    const varField = block.getField('VAR');
    if (varField) {
      const originalFinishEditing = varField.onFinishEditing_;
      varField.onFinishEditing_ = function(newName) {
        if (typeof originalFinishEditing === 'function') {
          originalFinishEditing.call(this, newName);
        }
        const oldName = block._dopplerVarLastName;
        if (newName && newName !== oldName) {
          renameVariableInBlockly(block, oldName, newName, 'BGT24LTR11');
          block._dopplerVarLastName = newName;
        }
      };
    }
  }

  const varName = block.getFieldValue('VAR') || 'BGT';
  const serialPort = block.getFieldValue('SERIAL') || 'Serial1';
  const mode = block.getFieldValue('MODE') || '0';

  // 添加库
  ensureDopplerRadarLibrary(generator);

  // 根据开发板类型选择串口类型
  var serialType = 'HardwareSerial';
  try {
    const boardConfig = window['boardConfig'];
    const core = boardConfig?.core || '';
    if (core.includes('samd')) {
      serialType = 'Uart';
    } else if (core.includes('rp2040') || core.includes('rp2350')) {
      serialType = 'SerialUART';
    } else if (core.includes('nrf52')) {
      serialType = 'Uart';
    }
  } catch (e) {}

  // 声明全局对象
  generator.addObject(varName, 'BGT24LTR11<' + serialType + '> ' + varName + ';');

  // 在setup中初始化串口和传感器
  generator.addSetup('doppler_serial_' + varName, serialPort + '.begin(115200);');
  generator.addSetup('doppler_init_' + varName, varName + '.init(' + serialPort + ');');
  generator.addSetup('doppler_mode_' + varName, 'while(!' + varName + '.setMode(' + mode + '));');

  return '';
};

// 设置模式
Arduino.forBlock['doppler_radar_set_mode'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'BGT';
  const mode = block.getFieldValue('MODE') || '0';

  ensureDopplerRadarLibrary(generator);

  return varName + '.setMode(' + mode + ');\n';
};

// 检查目标状态
Arduino.forBlock['doppler_radar_target_is'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'BGT';
  const state = block.getFieldValue('STATE') || 'APPROACH';

  ensureDopplerRadarLibrary(generator);

  var stateValue;
  switch (state) {
    case 'APPROACH':
      stateValue = '0x02';
      break;
    case 'LEAVE':
      stateValue = '0x01';
      break;
    case 'NONE':
    default:
      stateValue = '0x00';
      break;
  }

  return ['(' + varName + '.getTargetState() == ' + stateValue + ')', generator.ORDER_EQUALITY];
};

// 获取目标速度
Arduino.forBlock['doppler_radar_get_speed'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'BGT';

  ensureDopplerRadarLibrary(generator);

  return [varName + '.getSpeed()', generator.ORDER_FUNCTION_CALL];
};

// 设置检测阈值
Arduino.forBlock['doppler_radar_set_threshold'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'BGT';
  const threshold = generator.valueToCode(block, 'THRESHOLD', generator.ORDER_ATOMIC) || '1024';

  ensureDopplerRadarLibrary(generator);

  return varName + '.setThreshold(' + threshold + ');\n';
};

// 获取当前阈值
Arduino.forBlock['doppler_radar_get_threshold'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'BGT';

  ensureDopplerRadarLibrary(generator);

  return [varName + '.getThreshold()', generator.ORDER_FUNCTION_CALL];
};

// 设置速度检测范围
Arduino.forBlock['doppler_radar_set_speed_scope'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'BGT';
  const maxSpeed = generator.valueToCode(block, 'MAX_SPEED', generator.ORDER_ATOMIC) || '512';
  const minSpeed = generator.valueToCode(block, 'MIN_SPEED', generator.ORDER_ATOMIC) || '0';

  ensureDopplerRadarLibrary(generator);

  return varName + '.setSpeedScope(' + maxSpeed + ', ' + minSpeed + ');\n';
};
