// RadioLib LoRa Blockly 代码生成器

// ============================================
// 辅助函数
// ============================================

// 确保RadioLib库被引用
function ensureRadioLib(generator) {
  generator.addLibrary('RadioLib', '#include <RadioLib.h>');
}

// 设置变量重命名监听
function setupRadioVarMonitor(block) {
  if (!block._radioVarMonitorAttached) {
    block._radioVarMonitorAttached = true;
    block._radioVarLastName = block.getFieldValue('VAR') || 'radio';
    registerVariableToBlockly(block._radioVarLastName, 'RadioLib');
    const varField = block.getField('VAR');
    if (varField) {
      const originalFinishEditing = varField.onFinishEditing_;
      varField.onFinishEditing_ = function(newName) {
        if (typeof originalFinishEditing === 'function') {
          originalFinishEditing.call(this, newName);
        }
        const workspace = block.workspace || (typeof Blockly !== 'undefined' && Blockly.getMainWorkspace && Blockly.getMainWorkspace());
        const oldName = block._radioVarLastName;
        if (workspace && newName && newName !== oldName) {
          renameVariableInBlockly(block, oldName, newName, 'RadioLib');
          block._radioVarLastName = newName;
        }
      };
    }
  }
}

// 获取field_variable的变量名
function getRadioVarName(block) {
  const varField = block.getField('VAR');
  return varField ? varField.getText() : 'radio';
}

// ============================================
// 初始化
// ============================================

Arduino.forBlock['radiolib_lora_init'] = function(block, generator) {
  // 变量重命名监听
  setupRadioVarMonitor(block);

  const varName = block.getFieldValue('VAR') || 'radio';
  const chip = block.getFieldValue('CHIP');
  const cs = generator.valueToCode(block, 'CS', generator.ORDER_ATOMIC) || '5';
  const irq = generator.valueToCode(block, 'IRQ', generator.ORDER_ATOMIC) || '2';
  const rst = generator.valueToCode(block, 'RST', generator.ORDER_ATOMIC) || '14';
  const gpio = generator.valueToCode(block, 'GPIO', generator.ORDER_ATOMIC) || 'RADIOLIB_NC';
  const freq = generator.valueToCode(block, 'FREQ', generator.ORDER_ATOMIC) || '433.0';
  const power = generator.valueToCode(block, 'POWER', generator.ORDER_ATOMIC) || '10';

  ensureRadioLib(generator);
  ensureSerialBegin('Serial', generator);
  registerVariableToBlockly(varName, 'RadioLib');

  // 全局声明radio对象
  generator.addObject(varName, chip + ' ' + varName + ' = new Module(' + cs + ', ' + irq + ', ' + rst + ', ' + gpio + ');');

  // setup中初始化
  let code = '{\n';
  code += '  int _rl_state = ' + varName + '.begin(' + freq + ');\n';
  code += '  if (_rl_state != RADIOLIB_ERR_NONE) {\n';
  code += '    Serial.print(F("[RadioLib] Init failed, code: "));\n';
  code += '    Serial.println(_rl_state);\n';
  code += '    while (true) { delay(10); }\n';
  code += '  }\n';
  code += '  ' + varName + '.setOutputPower(' + power + ');\n';
  code += '}\n';

  return code;
};

// ============================================
// 参数设置
// ============================================

Arduino.forBlock['radiolib_set_bandwidth'] = function(block, generator) {
  const varName = getRadioVarName(block);
  const bw = block.getFieldValue('BW');
  ensureRadioLib(generator);
  return varName + '.setBandwidth(' + bw + ');\n';
};

Arduino.forBlock['radiolib_set_spreading_factor'] = function(block, generator) {
  const varName = getRadioVarName(block);
  const sf = block.getFieldValue('SF');
  ensureRadioLib(generator);
  return varName + '.setSpreadingFactor(' + sf + ');\n';
};

Arduino.forBlock['radiolib_set_coding_rate'] = function(block, generator) {
  const varName = getRadioVarName(block);
  const cr = block.getFieldValue('CR');
  ensureRadioLib(generator);
  return varName + '.setCodingRate(' + cr + ');\n';
};

Arduino.forBlock['radiolib_set_frequency'] = function(block, generator) {
  const varName = getRadioVarName(block);
  const freq = generator.valueToCode(block, 'FREQ', generator.ORDER_ATOMIC) || '433.0';
  ensureRadioLib(generator);
  return varName + '.setFrequency(' + freq + ');\n';
};

Arduino.forBlock['radiolib_set_power'] = function(block, generator) {
  const varName = getRadioVarName(block);
  const power = generator.valueToCode(block, 'POWER', generator.ORDER_ATOMIC) || '10';
  ensureRadioLib(generator);
  return varName + '.setOutputPower(' + power + ');\n';
};

Arduino.forBlock['radiolib_set_sync_word'] = function(block, generator) {
  const varName = getRadioVarName(block);
  const sync = generator.valueToCode(block, 'SYNC', generator.ORDER_ATOMIC) || '0x12';
  ensureRadioLib(generator);
  return varName + '.setSyncWord(' + sync + ');\n';
};

// ============================================
// 阻塞式通信
// ============================================

Arduino.forBlock['radiolib_transmit'] = function(block, generator) {
  const varName = getRadioVarName(block);
  const message = generator.valueToCode(block, 'MESSAGE', generator.ORDER_ATOMIC) || '""';
  ensureRadioLib(generator);
  return varName + '.transmit(' + message + ');\n';
};

Arduino.forBlock['radiolib_receive'] = function(block, generator) {
  const varName = getRadioVarName(block);
  ensureRadioLib(generator);

  const funcName = '_rl_recv_' + varName;
  const funcDef =
    'String ' + funcName + '() {\n' +
    '  String _str;\n' +
    '  int _state = ' + varName + '.receive(_str);\n' +
    '  if (_state == RADIOLIB_ERR_NONE) {\n' +
    '    return _str;\n' +
    '  }\n' +
    '  return "";\n' +
    '}\n';

  generator.addFunction(funcName, funcDef);
  return [funcName + '()', generator.ORDER_ATOMIC];
};

// ============================================
// 中断式通信
// ============================================

Arduino.forBlock['radiolib_on_receive'] = function(block, generator) {
  const varName = getRadioVarName(block);
  const handlerCode = generator.statementToCode(block, 'HANDLER') || '';

  ensureRadioLib(generator);

  const flagName = '_rl_rxFlag_' + varName;
  const isrName = '_rl_isr_' + varName;
  const dataName = '_rl_data_' + varName;
  const rssiName = '_rl_rssi_' + varName;
  const snrName = '_rl_snr_' + varName;

  // 全局变量
  generator.addVariable(flagName, 'volatile bool ' + flagName + ' = false;');
  generator.addVariable(dataName, 'String ' + dataName + ';');
  generator.addVariable(rssiName, 'float ' + rssiName + ' = 0;');
  generator.addVariable(snrName, 'float ' + snrName + ' = 0;');

  // 中断服务函数
  const isrDef =
    '#if defined(ESP8266) || defined(ESP32)\n' +
    '  ICACHE_RAM_ATTR\n' +
    '#endif\n' +
    'void ' + isrName + '(void) {\n' +
    '  ' + flagName + ' = true;\n' +
    '}\n';
  generator.addFunction(isrName, isrDef);

  // 在setup末尾注册回调并启动接收
  const setupCode =
    varName + '.setPacketReceivedAction(' + isrName + ');\n' +
    varName + '.startReceive();\n';
  generator.addSetup('radiolib_rx_setup_' + varName, setupCode);

  // 在loop开头检查接收标志并处理
  const loopCode =
    'if (' + flagName + ') {\n' +
    '  ' + flagName + ' = false;\n' +
    '  String _rl_str;\n' +
    '  int _rl_state = ' + varName + '.readData(_rl_str);\n' +
    '  if (_rl_state == RADIOLIB_ERR_NONE) {\n' +
    '    ' + dataName + ' = _rl_str;\n' +
    '    ' + rssiName + ' = ' + varName + '.getRSSI();\n' +
    '    ' + snrName + ' = ' + varName + '.getSNR();\n' +
    handlerCode +
    '  }\n' +
    '  ' + varName + '.startReceive();\n' +
    '}\n';
  generator.addLoopBegin('radiolib_rx_loop_' + varName, loopCode);

  return ''; // hat block
};

Arduino.forBlock['radiolib_start_receive'] = function(block, generator) {
  const varName = getRadioVarName(block);
  ensureRadioLib(generator);
  return varName + '.startReceive();\n';
};

Arduino.forBlock['radiolib_received_data'] = function(block, generator) {
  const varName = getRadioVarName(block);
  return ['_rl_data_' + varName, generator.ORDER_ATOMIC];
};

Arduino.forBlock['radiolib_received_rssi'] = function(block, generator) {
  const varName = getRadioVarName(block);
  return ['_rl_rssi_' + varName, generator.ORDER_ATOMIC];
};

Arduino.forBlock['radiolib_received_snr'] = function(block, generator) {
  const varName = getRadioVarName(block);
  return ['_rl_snr_' + varName, generator.ORDER_ATOMIC];
};

// ============================================
// 状态查询
// ============================================

Arduino.forBlock['radiolib_get_rssi'] = function(block, generator) {
  const varName = getRadioVarName(block);
  ensureRadioLib(generator);
  return [varName + '.getRSSI()', generator.ORDER_ATOMIC];
};

Arduino.forBlock['radiolib_get_snr'] = function(block, generator) {
  const varName = getRadioVarName(block);
  ensureRadioLib(generator);
  return [varName + '.getSNR()', generator.ORDER_ATOMIC];
};

// ============================================
// 电源管理
// ============================================

Arduino.forBlock['radiolib_sleep'] = function(block, generator) {
  const varName = getRadioVarName(block);
  ensureRadioLib(generator);
  return varName + '.sleep();\n';
};

Arduino.forBlock['radiolib_standby'] = function(block, generator) {
  const varName = getRadioVarName(block);
  ensureRadioLib(generator);
  return varName + '.standby();\n';
};
