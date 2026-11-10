Arduino.forBlock['shtc3_init'] = function (block, generator) {
    // 添加SHTC3库
    generator.addLibrary('shtc3_include', '#include "Adafruit_SHTC3.h"');
    
    // 创建SHTC3对象
    generator.addVariable('shtc3_obj', 'Adafruit_SHTC3 shtc3 = Adafruit_SHTC3();');
    
    // 在setup中初始化SHTC3
    generator.addSetupBegin('shtc3_begin', 'if (!shtc3.begin()) {\n    Serial.println("无法找到SHTC3传感器");\n  }');
    
    return '';
};

Arduino.forBlock['shtc3_read_temperature'] = function (block, generator) {
    // 添加SHTC3库和对象（如果不存在）
    generator.addLibrary('shtc3_include', '#include "Adafruit_SHTC3.h"');
    generator.addVariable('shtc3_obj', 'Adafruit_SHTC3 shtc3 = Adafruit_SHTC3();');
    generator.addSetupBegin('shtc3_begin', 'if (!shtc3.begin()) {\n    Serial.println("无法找到SHTC3传感器");\n  }');
    
    // 添加获取温度的函数
    var functionName = 'getSHTC3Temperature';
    var functionCode = 'float ' + functionName + '() {\n' +
                      '  sensors_event_t humidity, temp;\n' +
                      '  shtc3.getEvent(&humidity, &temp);\n' +
                      '  return temp.temperature;\n' +
                      '}';
    generator.addFunction(functionName, functionCode);
    
    return [functionName + '()', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['shtc3_read_humidity'] = function (block, generator) {
    // 添加SHTC3库和对象（如果不存在）
    generator.addLibrary('shtc3_include', '#include "Adafruit_SHTC3.h"');
    generator.addVariable('shtc3_obj', 'Adafruit_SHTC3 shtc3 = Adafruit_SHTC3();');
    generator.addSetupBegin('shtc3_begin', 'if (!shtc3.begin()) {\n    Serial.println("无法找到SHTC3传感器");\n  }');
    
    // 添加获取湿度的函数
    var functionName = 'getSHTC3Humidity';
    var functionCode = 'float ' + functionName + '() {\n' +
                      '  sensors_event_t humidity, temp;\n' +
                      '  shtc3.getEvent(&humidity, &temp);\n' +
                      '  return humidity.relative_humidity;\n' +
                      '}';
    generator.addFunction(functionName, functionCode);
    
    return [functionName + '()', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['shtc3_read_both'] = function (block, generator) {
    // 添加SHTC3库和对象（如果不存在）
    generator.addLibrary('shtc3_include', '#include "Adafruit_SHTC3.h"');
    generator.addVariable('shtc3_obj', 'Adafruit_SHTC3 shtc3 = Adafruit_SHTC3();');
    generator.addSetupBegin('shtc3_begin', 'if (!shtc3.begin()) {\n    Serial.println("无法找到SHTC3传感器");\n  }');
    
    // 添加全局变量来存储最新的温湿度数据
    generator.addVariable('shtc3_temp_var', 'float shtc3_temperature = 0.0;');
    generator.addVariable('shtc3_humi_var', 'float shtc3_humidity = 0.0;');
    
    var code = 'sensors_event_t humidity, temp;\n' +
               'shtc3.getEvent(&humidity, &temp);\n' +
               'shtc3_temperature = temp.temperature;\n' +
               'shtc3_humidity = humidity.relative_humidity;\n';
    
    return code;
};

Arduino.forBlock['shtc3_is_connected'] = function (block, generator) {
    // 添加SHTC3库和对象（如果不存在）
    generator.addLibrary('shtc3_include', '#include "Adafruit_SHTC3.h"');
    generator.addVariable('shtc3_obj', 'Adafruit_SHTC3 shtc3 = Adafruit_SHTC3();');
    
    // 添加检查连接的函数
    var functionName = 'isSHTC3Connected';
    var functionCode = 'bool ' + functionName + '() {\n' +
                      '  uint16_t id = shtc3.readID();\n' +
                      '  return (id != 0 && id != 0xFFFF);\n' +
                      '}';
    generator.addFunction(functionName, functionCode);
    
    return [functionName + '()', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['shtc3_sleep'] = function (block, generator) {
    var mode = block.getFieldValue('MODE');
    
    // 添加SHTC3库和对象（如果不存在）
    generator.addLibrary('shtc3_include', '#include "Adafruit_SHTC3.h"');
    generator.addVariable('shtc3_obj', 'Adafruit_SHTC3 shtc3 = Adafruit_SHTC3();');
    generator.addSetupBegin('shtc3_begin', 'if (!shtc3.begin()) {\n    Serial.println("无法找到SHTC3传感器");\n  }');
    
    var sleepMode = (mode === 'sleep') ? 'true' : 'false';
    var code = 'shtc3.sleep(' + sleepMode + ');\n';
    
    return code;
};

Arduino.forBlock['shtc3_set_power_mode'] = function (block, generator) {
    var powerMode = block.getFieldValue('POWER_MODE');
    
    // 添加SHTC3库和对象（如果不存在）
    generator.addLibrary('shtc3_include', '#include "Adafruit_SHTC3.h"');
    generator.addVariable('shtc3_obj', 'Adafruit_SHTC3 shtc3 = Adafruit_SHTC3();');
    generator.addSetupBegin('shtc3_begin', 'if (!shtc3.begin()) {\n    Serial.println("无法找到SHTC3传感器");\n  }');
    
    var lowPowerMode = (powerMode === 'lowpower') ? 'true' : 'false';
    var code = 'shtc3.lowPowerMode(' + lowPowerMode + ');\n';
    
    return code;
};

// 添加访问全局变量的便捷函数
Arduino.forBlock['shtc3_get_stored_temperature'] = function (block, generator) {
    // 添加全局变量
    generator.addVariable('shtc3_temp_var', 'float shtc3_temperature = 0.0;');
    
    return ['shtc3_temperature', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['shtc3_get_stored_humidity'] = function (block, generator) {
    // 添加全局变量
    generator.addVariable('shtc3_humi_var', 'float shtc3_humidity = 0.0;');
    
    return ['shtc3_humidity', Arduino.ORDER_ATOMIC];
};
