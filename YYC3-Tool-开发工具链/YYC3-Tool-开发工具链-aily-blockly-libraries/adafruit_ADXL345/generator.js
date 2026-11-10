Arduino.forBlock['adxl345_init'] = function (block, generator) {
    var sensorId = block.getFieldValue('SENSOR_ID');

    // 添加必要的库
    generator.addLibrary('Wire_include', '#include <Wire.h>');
    generator.addLibrary('Sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addLibrary('ADXL345_include', '#include <Adafruit_ADXL345_U.h>');

    // 创建ADXL345对象
    var adxlDef = 'Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(' + sensorId + ');';
    generator.addVariable('adxl345_def', adxlDef);

    // 在setup中初始化传感器
    var initCode = 'if(!accel.begin()) {\n';
    initCode += '  Serial.println("Ooops, no ADXL345 detected ... Check your wiring!");\n';
    initCode += '  while(1);\n';
    initCode += '}\n';
    initCode += 'accel.setRange(ADXL345_RANGE_16_G);';

    generator.addSetupBegin('adxl345_init', initCode);

    return '';
};

Arduino.forBlock['adxl345_read_x'] = function (block, generator) {
    // 确保库和对象已定义
    generator.addLibrary('Wire_include', '#include <Wire.h>');
    generator.addLibrary('Sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addLibrary('ADXL345_include', '#include <Adafruit_ADXL345_U.h>');

    var adxlDef = 'Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);';
    generator.addVariable('adxl345_def', adxlDef);

    var code = 'adxl345_getX()';

    // 添加获取X轴数据的函数
    var funcCode = 'float adxl345_getX() {\n';
    funcCode += '  sensors_event_t event;\n';
    funcCode += '  accel.getEvent(&event);\n';
    funcCode += '  return event.acceleration.x;\n';
    funcCode += '}';

    generator.addFunction('adxl345_getX_func', funcCode);

    return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['adxl345_read_y'] = function (block, generator) {
    // 确保库和对象已定义
    generator.addLibrary('Wire_include', '#include <Wire.h>');
    generator.addLibrary('Sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addLibrary('ADXL345_include', '#include <Adafruit_ADXL345_U.h>');

    var adxlDef = 'Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);';
    generator.addVariable('adxl345_def', adxlDef);

    var code = 'adxl345_getY()';

    // 添加获取Y轴数据的函数
    var funcCode = 'float adxl345_getY() {\n';
    funcCode += '  sensors_event_t event;\n';
    funcCode += '  accel.getEvent(&event);\n';
    funcCode += '  return event.acceleration.y;\n';
    funcCode += '}';

    generator.addFunction('adxl345_getY_func', funcCode);

    return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['adxl345_read_z'] = function (block, generator) {
    // 确保库和对象已定义
    generator.addLibrary('Wire_include', '#include <Wire.h>');
    generator.addLibrary('Sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addLibrary('ADXL345_include', '#include <Adafruit_ADXL345_U.h>');

    var adxlDef = 'Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);';
    generator.addVariable('adxl345_def', adxlDef);

    var code = 'adxl345_getZ()';

    // 添加获取Z轴数据的函数
    var funcCode = 'float adxl345_getZ() {\n';
    funcCode += '  sensors_event_t event;\n';
    funcCode += '  accel.getEvent(&event);\n';
    funcCode += '  return event.acceleration.z;\n';
    funcCode += '}';

    generator.addFunction('adxl345_getZ_func', funcCode);

    return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['adxl345_read_xyz'] = function (block, generator) {
    var varX = generator.nameDB_.getName(block.getFieldValue('VAR_X'), 'VARIABLE');
    var varY = generator.nameDB_.getName(block.getFieldValue('VAR_Y'), 'VARIABLE');
    var varZ = generator.nameDB_.getName(block.getFieldValue('VAR_Z'), 'VARIABLE');
    addVariableToToolbox(block, varX);
    addVariableToToolbox(block, varY);
    addVariableToToolbox(block, varZ);
    // 确保库和对象已定义
    generator.addLibrary('Wire_include', '#include <Wire.h>');
    generator.addLibrary('Sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addLibrary('ADXL345_include', '#include <Adafruit_ADXL345_U.h>');

    var adxlDef = 'Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);';
    generator.addVariable('adxl345_def', adxlDef);

    // 声明变量
    generator.addVariable(varX, 'float ' + varX + ';');
    generator.addVariable(varY, 'float ' + varY + ';');
    generator.addVariable(varZ, 'float ' + varZ + ';');

    var code = 'sensors_event_t event;\n';
    code += 'accel.getEvent(&event);\n';
    code += varX + ' = event.acceleration.x;\n';
    code += varY + ' = event.acceleration.y;\n';
    code += varZ + ' = event.acceleration.z;\n';

    return code;
};

Arduino.forBlock['adxl345_set_range'] = function (block, generator) {
    var range = block.getFieldValue('RANGE');

    // 确保库和对象已定义
    generator.addLibrary('Wire_include', '#include <Wire.h>');
    generator.addLibrary('Sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addLibrary('ADXL345_include', '#include <Adafruit_ADXL345_U.h>');

    var adxlDef = 'Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);';
    generator.addVariable('adxl345_def', adxlDef);

    var code = 'accel.setRange(' + range + ');\n';

    return code;
};

Arduino.forBlock['adxl345_set_data_rate'] = function (block, generator) {
    var dataRate = block.getFieldValue('DATA_RATE');

    // 确保库和对象已定义
    generator.addLibrary('Wire_include', '#include <Wire.h>');
    generator.addLibrary('Sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addLibrary('ADXL345_include', '#include <Adafruit_ADXL345_U.h>');

    var adxlDef = 'Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);';
    generator.addVariable('adxl345_def', adxlDef);

    var code = 'accel.setDataRate(' + dataRate + ');\n';

    return code;
};

Arduino.forBlock['adxl345_get_range'] = function (block, generator) {
    // 确保库和对象已定义
    generator.addLibrary('Wire_include', '#include <Wire.h>');
    generator.addLibrary('Sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addLibrary('ADXL345_include', '#include <Adafruit_ADXL345_U.h>');

    var adxlDef = 'Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);';
    generator.addVariable('adxl345_def', adxlDef);

    var code = 'accel.getRange()';

    return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['adxl345_get_data_rate'] = function (block, generator) {
    // 确保库和对象已定义
    generator.addLibrary('Wire_include', '#include <Wire.h>');
    generator.addLibrary('Sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addLibrary('ADXL345_include', '#include <Adafruit_ADXL345_U.h>');

    var adxlDef = 'Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);';
    generator.addVariable('adxl345_def', adxlDef);

    var code = 'accel.getDataRate()';

    return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['adxl345_display_sensor_details'] = function (block, generator) {
    // 确保库和对象已定义
    generator.addLibrary('Wire_include', '#include <Wire.h>');
    generator.addLibrary('Sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addLibrary('ADXL345_include', '#include <Adafruit_ADXL345_U.h>');

    var adxlDef = 'Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);';
    generator.addVariable('adxl345_def', adxlDef);

    var code = 'adxl345_displaySensorDetails();\n';

    // 添加显示传感器详情的函数
    var funcCode = 'void adxl345_displaySensorDetails() {\n';
    funcCode += '  sensor_t sensor;\n';
    funcCode += '  accel.getSensor(&sensor);\n';
    funcCode += '  Serial.println("------------------------------------");\n';
    funcCode += '  Serial.print("Sensor:       "); Serial.println(sensor.name);\n';
    funcCode += '  Serial.print("Driver Ver:   "); Serial.println(sensor.version);\n';
    funcCode += '  Serial.print("Unique ID:    "); Serial.println(sensor.sensor_id);\n';
    funcCode += '  Serial.print("Max Value:    "); Serial.print(sensor.max_value); Serial.println(" m/s^2");\n';
    funcCode += '  Serial.print("Min Value:    "); Serial.print(sensor.min_value); Serial.println(" m/s^2");\n';
    funcCode += '  Serial.print("Resolution:   "); Serial.print(sensor.resolution); Serial.println(" m/s^2");\n';
    funcCode += '  Serial.println("------------------------------------");\n';
    funcCode += '}';

    generator.addFunction('adxl345_displaySensorDetails_func', funcCode);

    return code;
};

Arduino.forBlock['adxl345_check_connection'] = function (block, generator) {
    // 确保库和对象已定义
    generator.addLibrary('Wire_include', '#include <Wire.h>');
    generator.addLibrary('Sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addLibrary('ADXL345_include', '#include <Adafruit_ADXL345_U.h>');

    var adxlDef = 'Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);';
    generator.addVariable('adxl345_def', adxlDef);

    var code = 'adxl345_checkConnection()';

    // 添加检查连接状态的函数
    var funcCode = 'bool adxl345_checkConnection() {\n';
    funcCode += '  return accel.begin();\n';
    funcCode += '}';

    generator.addFunction('adxl345_checkConnection_func', funcCode);

    return [code, Arduino.ORDER_FUNCTION_CALL];
};
