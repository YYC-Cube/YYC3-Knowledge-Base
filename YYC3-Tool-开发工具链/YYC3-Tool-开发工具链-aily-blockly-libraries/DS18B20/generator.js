// 创建安全的引脚变量名
Arduino.createPinVar = function(pin) {
    return 'pin_' + pin.toString().replace(/[^a-zA-Z0-9]/g, '_');
};

// 初始化指定引脚的DS18B20传感器
Arduino.forBlock['ds18b20_init_pin'] = function (block, generator) {
    var pin = generator.valueToCode(block, 'PIN', Arduino.ORDER_ATOMIC) || '2';
    var pinVar = Arduino.createPinVar(pin);

    // 添加必要的库
    generator.addLibrary('OneWire_include', '#include <OneWire.h>');
    generator.addLibrary('DallasTemperature_include', '#include <DallasTemperature.h>');

    // 为每个引脚创建独立的对象
    var oneWireDef = 'OneWire oneWire_' + pinVar + '(' + pin + ');';
    generator.addVariable('oneWire_def_' + pinVar, oneWireDef);

    var sensorsDef = 'DallasTemperature sensors_' + pinVar + '(&oneWire_' + pinVar + ');';
    generator.addVariable('sensors_def_' + pinVar, sensorsDef);

    // 在setup中初始化传感器
    generator.addSetupBegin('ds18b20_begin_' + pinVar, 'sensors_' + pinVar + '.begin();');

    return '';
};

// 读取指定引脚的DS18B20温度 (摄氏度)
Arduino.forBlock['ds18b20_read_temperature_c_pin'] = function (block, generator) {
    var pin = generator.valueToCode(block, 'PIN', Arduino.ORDER_ATOMIC) || '2';
    var pinVar = Arduino.createPinVar(pin);
    
    // 创建读取温度的函数
    var functionName = 'readDS18B20C_' + pinVar;
    var functionCode = 'float ' + functionName + '() {\n' +
        '  sensors_' + pinVar + '.requestTemperatures();\n' +
        '  return sensors_' + pinVar + '.getTempCByIndex(0);\n' +
        '}';
    generator.addFunction(functionName, functionCode);

    return [functionName + '()', Arduino.ORDER_ATOMIC];
};

// 读取指定引脚的DS18B20温度 (华氏度)
Arduino.forBlock['ds18b20_read_temperature_f_pin'] = function (block, generator) {
    var pin = generator.valueToCode(block, 'PIN', Arduino.ORDER_ATOMIC) || '2';
    var pinVar = Arduino.createPinVar(pin);
    
    // 创建读取温度的函数
    var functionName = 'readDS18B20F_' + pinVar;
    var functionCode = 'float ' + functionName + '() {\n' +
        '  sensors_' + pinVar + '.requestTemperatures();\n' +
        '  return sensors_' + pinVar + '.getTempFByIndex(0);\n' +
        '}';
    generator.addFunction(functionName, functionCode);

    return [functionName + '()', Arduino.ORDER_ATOMIC];
};

// 获取指定引脚总线上的设备数量
Arduino.forBlock['ds18b20_get_device_count_pin'] = function (block, generator) {
    var pin = generator.valueToCode(block, 'PIN', Arduino.ORDER_ATOMIC) || '2';
    var pinVar = Arduino.createPinVar(pin);
    
    return ['sensors_' + pinVar + '.getDeviceCount()', Arduino.ORDER_ATOMIC];
};

// 按索引读取指定引脚上的特定DS18B20传感器温度
Arduino.forBlock['ds18b20_read_temperature_by_index_pin'] = function (block, generator) {
    var pin = generator.valueToCode(block, 'PIN', Arduino.ORDER_ATOMIC) || '2';
    var index = generator.valueToCode(block, 'INDEX', Arduino.ORDER_ATOMIC) || '0';
    var pinVar = Arduino.createPinVar(pin);
    
    // 创建按索引读取温度的函数
    var functionName = 'readDS18B20ByIndex_' + pinVar;
    var functionCode = 'float ' + functionName + '(int index) {\n' +
        '  sensors_' + pinVar + '.requestTemperatures();\n' +
        '  return sensors_' + pinVar + '.getTempCByIndex(index);\n' +
        '}';
    generator.addFunction(functionName, functionCode);

    return [functionName + '(' + index + ')', Arduino.ORDER_ATOMIC];
};
