// HT16K33 Generator for Arduino
// 避免重复加载
if (typeof Arduino === 'undefined') {
    var Arduino = {};
    Arduino.forBlock = {};
}

// 自动初始化函数
Arduino.ht16k33AutoInit = function(generator, address = '0x70') {
    // 添加库文件
    generator.addLibrary('#include <Wire.h>', '#include <Wire.h>');
    generator.addLibrary('#include "HT16K33.h"', '#include "HT16K33.h"');
    
    // 添加对象声明  
    generator.addObject('HT16K33 seg(' + address + ')', 'HT16K33 seg(' + address + ');');
    
    // 添加初始化代码到setup
    generator.addSetupBegin('ht16k33_begin', '  Wire.begin();\n  Wire.setClock(100000);\n  seg.begin();\n  seg.displayOn();\n  seg.setBrightness(8);');
};

// 初始化HT16K33
Arduino.forBlock['ht16k33_init'] = function(block, generator) {
    const address = block.getFieldValue('ADDRESS');
    Arduino.ht16k33AutoInit(generator, address);
    return '';
};

// 简化显示块 - 自动判断数据类型
Arduino.forBlock['ht16k33_simple_display'] = function(block, generator) {
    const value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    // 生成智能显示代码
    return `// 自动选择显示格式
if (${value} == (int)${value} && ${value} >= -999 && ${value} <= 9999) {
  seg.displayInt(${value});
} else {
  seg.displayFloat(${value}, 2);
}
`;
};

// 显示温度
Arduino.forBlock['ht16k33_display_temperature'] = function(block, generator) {
    const temp = generator.valueToCode(block, 'TEMP', generator.ORDER_ATOMIC) || '25.0';
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    return `seg.displayFloat(${temp}, 1);
delay(1000);
seg.displayClear();
delay(200);
// 显示度数符号
uint8_t degreeSegments[4] = {0x63, 0x00, 0x00, 0x38}; // °C
seg.displayRaw(degreeSegments);
delay(1000);
`;
};

// 显示电压
Arduino.forBlock['ht16k33_display_voltage'] = function(block, generator) {
    const voltage = generator.valueToCode(block, 'VOLTAGE', generator.ORDER_ATOMIC) || '3.3';
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    return `seg.displayFloat(${voltage}, 2);
`;
};

// 时钟显示（带闪烁冒号）
Arduino.forBlock['ht16k33_clock_display'] = function(block, generator) {
    const hour = generator.valueToCode(block, 'HOUR', generator.ORDER_ATOMIC) || '12';
    const minute = generator.valueToCode(block, 'MINUTE', generator.ORDER_ATOMIC) || '0';
    const blink = block.getFieldValue('BLINK') === 'TRUE';
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    if (blink) {
        return `// 时钟显示（带闪烁冒号和参数验证）
int clockHour = constrain(${hour}, 0, 23);
int clockMinute = constrain(${minute}, 0, 59);
seg.displayTime(clockHour, clockMinute, true);
delay(500);
seg.displayTime(clockHour, clockMinute, false);
delay(500);
`;
    } else {
        return `// 时钟显示（带参数验证）
int clockHour = constrain(${hour}, 0, 23);
int clockMinute = constrain(${minute}, 0, 59);
seg.displayTime(clockHour, clockMinute, true);
`;
    }
};

// 倒计时显示
Arduino.forBlock['ht16k33_countdown'] = function(block, generator) {
    const seconds = generator.valueToCode(block, 'SECONDS', generator.ORDER_ATOMIC) || '60';
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    return `// 倒计时显示（带参数验证）
int countdownSeconds = constrain(${seconds}, 0, 5999); // 最大99:59
seg.displaySeconds(countdownSeconds, true);
`;
};

// 显示整数
Arduino.forBlock['ht16k33_display_int'] = function(block, generator) {
    const value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    return 'seg.displayInt(' + value + ');\n';
};

// 显示浮点数
Arduino.forBlock['ht16k33_display_float'] = function(block, generator) {
    const value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0.0';
    const decimals = block.getFieldValue('DECIMALS');
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    return 'seg.displayFloat(' + value + ', ' + decimals + ');\n';
};

// 显示十六进制
Arduino.forBlock['ht16k33_display_hex'] = function(block, generator) {
    const value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    return 'seg.displayHex(' + value + ');\n';
};

// 显示时间
Arduino.forBlock['ht16k33_display_time'] = function(block, generator) {
    const hour = generator.valueToCode(block, 'HOUR', generator.ORDER_ATOMIC) || '0';
    const minute = generator.valueToCode(block, 'MINUTE', generator.ORDER_ATOMIC) || '0';
    const colon = block.getFieldValue('COLON') === 'TRUE' ? 'true' : 'false';
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    return `// 显示时间（带参数验证）
int displayHour = constrain(${hour}, 0, 23);
int displayMinute = constrain(${minute}, 0, 59);
seg.displayTime(displayHour, displayMinute, ${colon});
`;
};

// 显示日期
Arduino.forBlock['ht16k33_display_date'] = function(block, generator) {
    const month = generator.valueToCode(block, 'MONTH', generator.ORDER_ATOMIC) || '1';
    const day = generator.valueToCode(block, 'DAY', generator.ORDER_ATOMIC) || '1';
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    return `// 显示日期（带参数验证）
int displayMonth = constrain(${month}, 1, 12);
int displayDay = constrain(${day}, 1, 31);
seg.displayDate(displayMonth, displayDay);
`;
};

// 清屏
Arduino.forBlock['ht16k33_display_clear'] = function(block, generator) {
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    return 'seg.displayClear();\n';
};

// 设置亮度
Arduino.forBlock['ht16k33_set_brightness'] = function(block, generator) {
    const brightness = generator.valueToCode(block, 'BRIGHTNESS', generator.ORDER_ATOMIC) || '8';
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    // 限制亮度范围
    return `int brightness = constrain(${brightness}, 0, 15);
seg.setBrightness(brightness);
`;
};

// 设置闪烁
Arduino.forBlock['ht16k33_set_blink'] = function(block, generator) {
    const blink = block.getFieldValue('BLINK');
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    return 'seg.setBlink(' + blink + ');\n';
};

// 显示开关
Arduino.forBlock['ht16k33_display_on_off'] = function(block, generator) {
    const state = block.getFieldValue('STATE');
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    if (state === 'ON') {
        return 'seg.displayOn();\n';
    } else {
        return 'seg.displayOff();\n';
    }
};

// 冒号控制
Arduino.forBlock['ht16k33_display_colon'] = function(block, generator) {
    const state = block.getFieldValue('STATE');
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    return 'seg.displayColon(' + state + ');\n';
};

// 显示测试
Arduino.forBlock['ht16k33_display_test'] = function(block, generator) {
    const delay = generator.valueToCode(block, 'DELAY', generator.ORDER_ATOMIC) || '100';
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    return 'seg.displayTest(' + delay + ');\n';
};

// 传感器值显示（带标签）
Arduino.forBlock['ht16k33_sensor_display'] = function(block, generator) {
    const value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
    const label = block.getFieldValue('LABEL');
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    let code = '';
    switch(label) {
        case 'temp':
            code = `// 显示温度值
seg.displayFloat(${value}, 1);
delay(2000);
seg.displayClear();
delay(200);
// 显示°C符号
uint8_t tempSegments[4] = {0x63, 0x38, 0x00, 0x00}; // °C
seg.displayRaw(tempSegments);
delay(1500);
`;
            break;
        case 'humi':
            code = `// 显示湿度值
seg.displayFloat(${value}, 1);
delay(2000);
seg.displayClear();
delay(200);
// 显示H符号
uint8_t humiSegments[4] = {0x76, 0x00, 0x00, 0x00}; // H
seg.displayRaw(humiSegments);
delay(1500);
`;
            break;
        case 'volt':
            code = `// 显示电压值
seg.displayFloat(${value}, 2);
delay(2000);
seg.displayClear();
delay(200);
// 显示U符号
uint8_t voltSegments[4] = {0x3E, 0x00, 0x00, 0x00}; // U
seg.displayRaw(voltSegments);
delay(1500);
`;
            break;
        case 'curr':
            code = `// 显示电流值
seg.displayFloat(${value}, 3);
delay(2000);
seg.displayClear();
delay(200);
// 显示A符号
uint8_t currSegments[4] = {0x77, 0x00, 0x00, 0x00}; // A
seg.displayRaw(currSegments);
delay(1500);
`;
            break;
        case 'dist':
            code = `// 显示距离值
seg.displayFloat(${value}, 1);
delay(2000);
seg.displayClear();
delay(200);
// 显示Cd符号
uint8_t distSegments[4] = {0x39, 0x5E, 0x00, 0x00}; // Cd
seg.displayRaw(distSegments);
delay(1500);
`;
            break;
        case 'light':
            code = `// 显示亮度值
seg.displayInt(${value});
delay(2000);
seg.displayClear();
delay(200);
// 显示L符号
uint8_t lightSegments[4] = {0x38, 0x00, 0x00, 0x00}; // L
seg.displayRaw(lightSegments);
delay(1500);
`;
            break;
        default:
            code = `// 显示数值
if (${value} == (int)${value} && ${value} >= -999 && ${value} <= 9999) {
  seg.displayInt(${value});
} else {
  seg.displayFloat(${value}, 2);
}
delay(2000);
`;
    }
    
    return code;
};

// 数字时钟显示
Arduino.forBlock['ht16k33_digital_clock'] = function(block, generator) {
    const timeSource = block.getFieldValue('TIME_SOURCE');
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    // 添加静态变量到对象部分
    generator.addObject('ht16k33_clock_vars', 'static unsigned long lastUpdate = 0;\nstatic bool colonState = true;\nstatic int clockHour = 0;\nstatic int clockMinute = 0;\nstatic int clockSecond = 0;');
    
    let code = '';
    switch(timeSource) {
        case 'millis':
            code = `// 基于系统时间的数字时钟
unsigned long currentTime = millis();
if (currentTime - lastUpdate >= 1000) {
  lastUpdate = currentTime;
  clockSecond++;
  if (clockSecond >= 60) {
    clockSecond = 0;
    clockMinute++;
    if (clockMinute >= 60) {
      clockMinute = 0;
      clockHour++;
      if (clockHour >= 24) {
        clockHour = 0;
      }
    }
  }
  // 每秒切换冒号状态
  colonState = !colonState;
  seg.displayTime(clockHour, clockMinute, colonState);
}
`;
            break;
        case 'manual':
            code = `// 手动设置时间的数字时钟
// 请在其他地方设置 clockHour 和 clockMinute 的值
unsigned long currentTime = millis();
if (currentTime - lastUpdate >= 500) {
  lastUpdate = currentTime;
  colonState = !colonState;
  seg.displayTime(clockHour, clockMinute, colonState);
}
`;
            break;
        case 'rtc':
            code = `// 基于RTC模块的数字时钟
// 注意：需要先配置RTC模块并获取时间
unsigned long currentTime = millis();
if (currentTime - lastUpdate >= 500) {
  lastUpdate = currentTime;
  colonState = !colonState;
  // 请替换为实际的RTC时间获取代码
  // clockHour = rtc.getHour();
  // clockMinute = rtc.getMinute();
  seg.displayTime(clockHour, clockMinute, colonState);
}
`;
            break;
    }
    
    return code;
};

// 得分显示
Arduino.forBlock['ht16k33_score_display'] = function(block, generator) {
    const score = generator.valueToCode(block, 'SCORE', generator.ORDER_ATOMIC) || '0';
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    return `// 显示游戏得分
int displayScore = constrain(${score}, 0, 9999);
seg.displayInt(displayScore);
`;
};

// 计数器显示
Arduino.forBlock['ht16k33_counter_display'] = function(block, generator) {
    const operation = block.getFieldValue('OPERATION');
    const step = generator.valueToCode(block, 'STEP', generator.ORDER_ATOMIC) || '1';
    
    // 自动初始化
    Arduino.ht16k33AutoInit(generator);
    
    // 添加计数器变量
    generator.addObject('ht16k33_counter', 'static int displayCounter = 0;');
    
    let code = '';
    switch(operation) {
        case 'inc':
            code = `// 计数器递增
displayCounter += ${step};
if (displayCounter > 9999) displayCounter = 9999;
seg.displayInt(displayCounter);
`;
            break;
        case 'dec':
            code = `// 计数器递减
displayCounter -= ${step};
if (displayCounter < -999) displayCounter = -999;
seg.displayInt(displayCounter);
`;
            break;
        case 'reset':
            code = `// 计数器重置
displayCounter = 0;
seg.displayInt(displayCounter);
`;
            break;
    }
    
    return code;
};
