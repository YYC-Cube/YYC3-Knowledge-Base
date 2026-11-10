// SHT4x传感器变量，用于存储最后读取的值
Arduino.sht4x_last_temperature = 0;
Arduino.sht4x_last_humidity = 0;

Arduino.forBlock['sht4x_init'] = function (block, generator) {
    var address = block.getFieldValue('ADDRESS');

    // 添加库文件
    generator.addLibrary('sht4x_include', '#include "Adafruit_SHT4x.h"');
    generator.addLibrary('sht4x_sensor_include', '#include <Adafruit_Sensor.h>');
    
    // 创建SHT4x对象
    generator.addObject('sht4x_object', 'Adafruit_SHT4x sht4;');
    
    // 在setup中初始化传感器
    var setupCode = 'if (!sht4.begin(' + address + ')) {\n';
    setupCode += '    Serial.println("找不到SHT4x传感器!");\n';
    setupCode += '    while (1) delay(1);\n';
    setupCode += '  }';
    generator.addSetupBegin('sht4x_init', setupCode);

    return '';
};

Arduino.forBlock['sht4x_read_temperature'] = function (block, generator) {
    // 确保传感器已初始化
    generator.addLibrary('sht4x_include', '#include "Adafruit_SHT4x.h"');
    generator.addLibrary('sht4x_sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addObject('sht4x_object', 'Adafruit_SHT4x sht4;');
    generator.addSetupBegin('sht4x_init_default', 'if (!sht4.begin()) {\n    Serial.println("找不到SHT4x传感器!");\n    while (1) delay(1);\n  }');

    // 添加用于存储传感器事件的变量
    generator.addVariable('sht4x_events', 'sensors_event_t humidity, temp;');

    var code = '({ sht4.getEvent(&humidity, &temp); temp.temperature; })';
    return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['sht4x_read_humidity'] = function (block, generator) {
    // 确保传感器已初始化
    generator.addLibrary('sht4x_include', '#include "Adafruit_SHT4x.h"');
    generator.addLibrary('sht4x_sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addObject('sht4x_object', 'Adafruit_SHT4x sht4;');
    generator.addSetupBegin('sht4x_init_default', 'if (!sht4.begin()) {\n    Serial.println("找不到SHT4x传感器!");\n    while (1) delay(1);\n  }');

    // 添加用于存储传感器事件的变量
    generator.addVariable('sht4x_events', 'sensors_event_t humidity, temp;');

    var code = '({ sht4.getEvent(&humidity, &temp); humidity.relative_humidity; })';
    return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['sht4x_read_both'] = function (block, generator) {
    // 确保传感器已初始化
    generator.addLibrary('sht4x_include', '#include "Adafruit_SHT4x.h"');
    generator.addLibrary('sht4x_sensor_include', '#include <Adafruit_Sensor.h>');
    generator.addObject('sht4x_object', 'Adafruit_SHT4x sht4;');
    generator.addSetupBegin('sht4x_init_default', 'if (!sht4.begin()) {\n    Serial.println("找不到SHT4x传感器!");\n    while (1) delay(1);\n  }');

    // 添加用于存储传感器事件的变量
    generator.addVariable('sht4x_events', 'sensors_event_t humidity, temp;');
    generator.addVariable('sht4x_last_temp', 'float sht4x_last_temperature = 0;');
    generator.addVariable('sht4x_last_hum', 'float sht4x_last_humidity = 0;');

    var code = 'sht4.getEvent(&humidity, &temp);\n';
    code += 'sht4x_last_temperature = temp.temperature;\n';
    code += 'sht4x_last_humidity = humidity.relative_humidity;';
    return code;
};

Arduino.forBlock['sht4x_get_last_temperature'] = function (block, generator) {
    generator.addVariable('sht4x_last_temp', 'float sht4x_last_temperature = 0;');
    return ['sht4x_last_temperature', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['sht4x_get_last_humidity'] = function (block, generator) {
    generator.addVariable('sht4x_last_hum', 'float sht4x_last_humidity = 0;');
    return ['sht4x_last_humidity', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['sht4x_set_precision'] = function (block, generator) {
    var precision = block.getFieldValue('PRECISION');
    
    // 确保传感器已初始化
    generator.addLibrary('sht4x_include', '#include "Adafruit_SHT4x.h"');
    generator.addObject('sht4x_object', 'Adafruit_SHT4x sht4;');
    
    return 'sht4.setPrecision(' + precision + ');';
};

Arduino.forBlock['sht4x_set_heater'] = function (block, generator) {
    var heater = block.getFieldValue('HEATER');
    
    // 确保传感器已初始化
    generator.addLibrary('sht4x_include', '#include "Adafruit_SHT4x.h"');
    generator.addObject('sht4x_object', 'Adafruit_SHT4x sht4;');
    
    return 'sht4.setHeater(' + heater + ');';
};

Arduino.forBlock['sht4x_read_serial'] = function (block, generator) {
    // 确保传感器已初始化
    generator.addLibrary('sht4x_include', '#include "Adafruit_SHT4x.h"');
    generator.addObject('sht4x_object', 'Adafruit_SHT4x sht4;');
    generator.addSetupBegin('sht4x_init_default', 'if (!sht4.begin()) {\n    Serial.println("找不到SHT4x传感器!");\n    while (1) delay(1);\n  }');

    return ['sht4.readSerial()', Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['sht4x_reset'] = function (block, generator) {
    // 确保传感器已初始化
    generator.addLibrary('sht4x_include', '#include "Adafruit_SHT4x.h"');
    generator.addObject('sht4x_object', 'Adafruit_SHT4x sht4;');
    
    return 'sht4.reset();';
};

Arduino.forBlock['sht4x_simple_read'] = function (block, generator) {
    var type = block.getFieldValue('TYPE');
    var address = block.getFieldValue('ADDRESS');
    
    // 确保传感器已初始化
    generator.addLibrary('sht4x_include', '#include "Adafruit_SHT4x.h"');
    generator.addLibrary('sht4x_sensor_include', '#include <Adafruit_Sensor.h>');
    
    // 创建唯一的对象名
    var objName = 'sht4_' + address.replace('0x', '');
    generator.addObject('sht4x_object_' + objName, 'Adafruit_SHT4x ' + objName + ';');
    
    // 在setup中初始化
    generator.addSetupBegin('sht4x_init_' + objName, 'if (!' + objName + '.begin(' + address + ')) {\n    Serial.println("找不到SHT4x传感器 地址:' + address + '!");\n    while (1) delay(1);\n  }');
    
    // 添加用于存储传感器事件的变量
    generator.addVariable('sht4x_events_' + objName, 'sensors_event_t humidity_' + objName + ', temp_' + objName + ';');

    var code;
    if (type === 'temperature') {
        code = '({ ' + objName + '.getEvent(&humidity_' + objName + ', &temp_' + objName + '); temp_' + objName + '.temperature; })';
    } else {
        code = '({ ' + objName + '.getEvent(&humidity_' + objName + ', &temp_' + objName + '); humidity_' + objName + '.relative_humidity; })';
    }
    
    return [code, Arduino.ORDER_FUNCTION_CALL];
};
