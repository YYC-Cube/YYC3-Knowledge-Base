Arduino.forBlock['taojingchi_init'] = function(block, generator) {
    const rxPin = generator.valueToCode(block, 'RXPIN', Arduino.ORDER_ATOMIC) || '2';
    const txPin = generator.valueToCode(block, 'TXPIN', Arduino.ORDER_ATOMIC) || '3';
    const baud = block.getFieldValue('BAUD');
    
    // 根据开发板类型生成不同的初始化代码
    if (window['boardConfig'] && window['boardConfig'].core.indexOf('esp32') > -1) {
        // ESP32使用Serial1
        generator.addSetup('taojingchi_init', `Serial1.begin(${baud}, SERIAL_8N1, ${rxPin}, ${txPin});`);
    } else {
        // Arduino使用软串口
        generator.addLibrary('SoftwareSerial', '#include <SoftwareSerial.h>');
        generator.addObject('taojingchi_serial', `SoftwareSerial taojingchiSerial(${rxPin}, ${txPin});`);
        generator.addSetup('taojingchi_init', `taojingchiSerial.begin(${baud});`);
    }
    
    return '';
};

Arduino.forBlock['taojingchi_backlight'] = function(block, generator) {
    const brightness = generator.valueToCode(block, 'BRIGHTNESS', Arduino.ORDER_ATOMIC) || '100';
    
    let serialObject = 'Serial1';
    if (window['boardConfig'] && window['boardConfig'].core.indexOf('esp32') === -1) {
        serialObject = 'taojingchiSerial';
    }
    
    const code = `${serialObject}.print("dim=" + String(${brightness}));
${serialObject}.write(0xFF);
${serialObject}.write(0xFF);
${serialObject}.write(0xFF);
delay(10);
`;
    return code;
};

Arduino.forBlock['taojingchi_display_page'] = function(block, generator) {
    const page = generator.valueToCode(block, 'PAGE', Arduino.ORDER_ATOMIC) || '0';
    
    let serialObject = 'Serial1';
    if (window['boardConfig'] && window['boardConfig'].core.indexOf('esp32') === -1) {
        serialObject = 'taojingchiSerial';
    }
    
    const code = `${serialObject}.print("page" + String(${page}));
${serialObject}.write(0xFF);
${serialObject}.write(0xFF);
${serialObject}.write(0xFF);
delay(10);
`;
    return code;
};

Arduino.forBlock['taojingchi_set_var'] = function(block, generator) {
    const varName = block.getFieldValue('VARNAME');
    const value = generator.valueToCode(block, 'VALUE', Arduino.ORDER_ATOMIC) || '0';
    
    let serialObject = 'Serial1';
    if (window['boardConfig'] && window['boardConfig'].core.indexOf('esp32') === -1) {
        serialObject = 'taojingchiSerial';
    }
    
    const code = `${serialObject}.print("${varName}=" + String((int)${value}));
${serialObject}.write(0xFF);
${serialObject}.write(0xFF);
${serialObject}.write(0xFF);
delay(10);
`;
    return code;
};

Arduino.forBlock['taojingchi_display_image'] = function(block, generator) {
    const page = generator.valueToCode(block, 'PAGE', Arduino.ORDER_ATOMIC) || '0';
    const img = generator.valueToCode(block, 'IMG', Arduino.ORDER_ATOMIC) || '0';
    const id = generator.valueToCode(block, 'ID', Arduino.ORDER_ATOMIC) || '0';
    
    let serialObject = 'Serial1';
    if (window['boardConfig'] && window['boardConfig'].core.indexOf('esp32') === -1) {
        serialObject = 'taojingchiSerial';
    }
    
    const code = `${serialObject}.print("page" + String(${page}) + ".p" + String(${img}) + ".pic=" + String(${id}));
${serialObject}.write(0xFF);
${serialObject}.write(0xFF);
${serialObject}.write(0xFF);
delay(10);
`;
    return code;
};

Arduino.forBlock['taojingchi_send_command'] = function(block, generator) {
    const command = generator.valueToCode(block, 'COMMAND', Arduino.ORDER_ATOMIC) || '"CMD"';
    
    let serialObject = 'Serial1';
    if (window['boardConfig'] && window['boardConfig'].core.indexOf('esp32') === -1) {
        serialObject = 'taojingchiSerial';
    }
    
    const code = `${serialObject}.print(${command});
${serialObject}.write(0xFF);
${serialObject}.write(0xFF);
${serialObject}.write(0xFF);
delay(10);
`;
    return code;
};

Arduino.forBlock['taojingchi_send_data'] = function(block, generator) {
    const command = generator.valueToCode(block, 'COMMAND', Arduino.ORDER_ATOMIC) || '"CMD"';
    const value = generator.valueToCode(block, 'VALUE', Arduino.ORDER_ATOMIC) || '0';
    
    let serialObject = 'Serial1';
    if (window['boardConfig'] && window['boardConfig'].core.indexOf('esp32') === -1) {
        serialObject = 'taojingchiSerial';
    }
    
    const code = `${serialObject}.print(${command});
${serialObject}.print("=");
${serialObject}.print(String((int)${value}));
${serialObject}.write(0xFF);
${serialObject}.write(0xFF);
${serialObject}.write(0xFF);
delay(10);
`;
    return code;
};
