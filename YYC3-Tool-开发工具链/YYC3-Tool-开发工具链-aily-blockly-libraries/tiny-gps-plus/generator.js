// TinyGPS++ Blockly 代码生成器

// 确保GPS库已添加
function ensureGPSLibrary(generator) {
  generator.addLibrary('TinyGPSPlus', '#include <TinyGPSPlus.h>');
}

// GPS初始化
Arduino.forBlock['gps_init'] = function(block, generator) {
  // 变量重命名监听
  if (!block._gpsVarMonitorAttached) {
    block._gpsVarMonitorAttached = true;
    block._gpsVarLastName = block.getFieldValue('VAR') || 'gps';
    registerVariableToBlockly(block._gpsVarLastName, 'TinyGPSPlus');
    const varField = block.getField('VAR');
    if (varField) {
      const originalFinishEditing = varField.onFinishEditing_;
      varField.onFinishEditing_ = function(newName) {
        if (typeof originalFinishEditing === 'function') {
          originalFinishEditing.call(this, newName);
        }
        const workspace = block.workspace || (typeof Blockly !== 'undefined' && Blockly.getMainWorkspace && Blockly.getMainWorkspace());
        const oldName = block._gpsVarLastName;
        if (workspace && newName && newName !== oldName) {
          renameVariableInBlockly(block, oldName, newName, 'TinyGPSPlus');
          block._gpsVarLastName = newName;
        }
      };
    }
  }

  const varName = block.getFieldValue('VAR') || 'gps';
  const serial = block.getFieldValue('SERIAL') || 'Serial1';
  const baud = block.getFieldValue('BAUD') || '9600';

  ensureGPSLibrary(generator);

  // 创建全局GPS对象
  generator.addObject(varName, 'TinyGPSPlus ' + varName + ';');

  // 存储串口映射，供update块读取
  if (!Arduino._gpsSerialMap) Arduino._gpsSerialMap = {};
  Arduino._gpsSerialMap[varName] = serial;

  // 初始化GPS串口
  generator.addSetupBegin('gps_serial_' + varName, serial + '.begin(' + baud + ');');

  return '';
};

// 读取GPS数据（在loop中调用）
Arduino.forBlock['gps_update'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'gps';

  const serial = (Arduino._gpsSerialMap && Arduino._gpsSerialMap[varName]) || 'Serial1';

  ensureGPSLibrary(generator);

  return 'while (' + serial + '.available() > 0) {\n  ' + varName + '.encode(' + serial + '.read());\n}\n';
};

// 获取经纬度
Arduino.forBlock['gps_location'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'gps';
  const coord = block.getFieldValue('COORD') || 'LAT';

  ensureGPSLibrary(generator);

  const method = coord === 'LAT' ? 'lat' : 'lng';
  return [varName + '.location.' + method + '()', generator.ORDER_FUNCTION_CALL];
};

// 获取日期
Arduino.forBlock['gps_date'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'gps';
  const part = block.getFieldValue('PART') || 'YEAR';

  ensureGPSLibrary(generator);

  const methodMap = { 'YEAR': 'year', 'MONTH': 'month', 'DAY': 'day' };
  return [varName + '.date.' + methodMap[part] + '()', generator.ORDER_FUNCTION_CALL];
};

// 获取时间
Arduino.forBlock['gps_time'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'gps';
  const part = block.getFieldValue('PART') || 'HOUR';

  ensureGPSLibrary(generator);

  const methodMap = { 'HOUR': 'hour', 'MINUTE': 'minute', 'SECOND': 'second' };
  return [varName + '.time.' + methodMap[part] + '()', generator.ORDER_FUNCTION_CALL];
};

// 获取速度
Arduino.forBlock['gps_speed'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'gps';
  const unit = block.getFieldValue('UNIT') || 'KMPH';

  ensureGPSLibrary(generator);

  const methodMap = { 'KMPH': 'kmph', 'MPH': 'mph', 'MPS': 'mps', 'KNOTS': 'knots' };
  return [varName + '.speed.' + methodMap[unit] + '()', generator.ORDER_FUNCTION_CALL];
};

// 获取海拔
Arduino.forBlock['gps_altitude'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'gps';
  const unit = block.getFieldValue('UNIT') || 'METERS';

  ensureGPSLibrary(generator);

  const methodMap = { 'METERS': 'meters', 'KM': 'kilometers', 'FEET': 'feet' };
  return [varName + '.altitude.' + methodMap[unit] + '()', generator.ORDER_FUNCTION_CALL];
};

// 获取卫星数量
Arduino.forBlock['gps_satellites'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'gps';

  ensureGPSLibrary(generator);

  return [varName + '.satellites.value()', generator.ORDER_FUNCTION_CALL];
};

// 获取航向角度
Arduino.forBlock['gps_course'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'gps';

  ensureGPSLibrary(generator);

  return [varName + '.course.deg()', generator.ORDER_FUNCTION_CALL];
};

// 获取水平精度因子
Arduino.forBlock['gps_hdop'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'gps';

  ensureGPSLibrary(generator);

  return [varName + '.hdop.hdop()', generator.ORDER_FUNCTION_CALL];
};

// 检查数据有效性
Arduino.forBlock['gps_is_valid'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'gps';
  const type = block.getFieldValue('TYPE') || 'LOCATION';

  ensureGPSLibrary(generator);

  const methodMap = { 'LOCATION': 'location', 'DATE': 'date', 'TIME': 'time' };
  return [varName + '.' + methodMap[type] + '.isValid()', generator.ORDER_FUNCTION_CALL];
};

// 计算两点间距离(米)
Arduino.forBlock['gps_distance_between'] = function(block, generator) {
  const lat1 = generator.valueToCode(block, 'LAT1', generator.ORDER_ATOMIC) || '0';
  const lng1 = generator.valueToCode(block, 'LNG1', generator.ORDER_ATOMIC) || '0';
  const lat2 = generator.valueToCode(block, 'LAT2', generator.ORDER_ATOMIC) || '0';
  const lng2 = generator.valueToCode(block, 'LNG2', generator.ORDER_ATOMIC) || '0';

  ensureGPSLibrary(generator);

  return ['TinyGPSPlus::distanceBetween(' + lat1 + ', ' + lng1 + ', ' + lat2 + ', ' + lng2 + ')', generator.ORDER_FUNCTION_CALL];
};

// 计算两点间航向
Arduino.forBlock['gps_course_to'] = function(block, generator) {
  const lat1 = generator.valueToCode(block, 'LAT1', generator.ORDER_ATOMIC) || '0';
  const lng1 = generator.valueToCode(block, 'LNG1', generator.ORDER_ATOMIC) || '0';
  const lat2 = generator.valueToCode(block, 'LAT2', generator.ORDER_ATOMIC) || '0';
  const lng2 = generator.valueToCode(block, 'LNG2', generator.ORDER_ATOMIC) || '0';

  ensureGPSLibrary(generator);

  return ['TinyGPSPlus::courseTo(' + lat1 + ', ' + lng1 + ', ' + lat2 + ', ' + lng2 + ')', generator.ORDER_FUNCTION_CALL];
};
