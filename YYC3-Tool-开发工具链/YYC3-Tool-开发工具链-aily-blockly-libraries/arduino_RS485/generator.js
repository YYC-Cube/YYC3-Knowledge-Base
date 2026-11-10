// Arduino RS485 库代码生成器

// 添加自动初始化函数
Arduino.addRS485AutoInit = function (generator, serial, baudrate, txPin, dePin, rePin) {
    generator.addMacro('RS485_SERIAL_PORT', '#define RS485_SERIAL_PORT ' + serial);
    generator.addLibrary('#include <ArduinoRS485.h>', '#include <ArduinoRS485.h>');
    generator.addObject('RS485', `RS485Class RS485(${serial}, ${txPin}, ${dePin}, ${rePin});`);

    if (baudrate) {
        generator.addSetup(`rs485_begin_${baudrate}`, `RS485.begin(${baudrate});`);
    }
};

// 关闭RS485通信
Arduino.forBlock['rs485_end'] = function (block, generator) {
    generator.addLibrary('#include <ArduinoRS485.h>', '#include <ArduinoRS485.h>');

    return 'RS485.end();\n';
};

// 检查是否有数据可读
Arduino.forBlock['rs485_available'] = function (block, generator) {
    generator.addLibrary('#include <ArduinoRS485.h>', '#include <ArduinoRS485.h>');

    return ['RS485.available()', generator.ORDER_FUNCTION_CALL];
};

// 读取数据
Arduino.forBlock['rs485_read'] = function (block, generator) {
    generator.addLibrary('#include <ArduinoRS485.h>', '#include <ArduinoRS485.h>');

    return ['RS485.read()', generator.ORDER_FUNCTION_CALL];
};

// 查看下一个字节
Arduino.forBlock['rs485_peek'] = function (block, generator) {
    generator.addLibrary('#include <ArduinoRS485.h>', '#include <ArduinoRS485.h>');

    return ['RS485.peek()', generator.ORDER_FUNCTION_CALL];
};

// 写入数据 - 自动添加初始化
Arduino.forBlock['rs485_write'] = function (block, generator) {
    const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '0';

 

    return `RS485.write(${data});\n`;
};

// 打印数据
Arduino.forBlock['rs485_print'] = function (block, generator) {
    const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';

    return `RS485.print(${data});\n`;
};

// 打印数据并换行
Arduino.forBlock['rs485_println'] = function (block, generator) {
    const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';

    return `RS485.println(${data});\n`;
};

// 等待发送完成
Arduino.forBlock['rs485_flush'] = function (block, generator) {
    generator.addLibrary('#include <ArduinoRS485.h>', '#include <ArduinoRS485.h>');

    return 'RS485.flush();\n';
};

// 开始发送
Arduino.forBlock['rs485_begin_transmission'] = function (block, generator) {
    generator.addLibrary('#include <ArduinoRS485.h>', '#include <ArduinoRS485.h>');

    return 'RS485.beginTransmission();\n';
};

// 结束发送
Arduino.forBlock['rs485_end_transmission'] = function (block, generator) {
    generator.addLibrary('#include <ArduinoRS485.h>', '#include <ArduinoRS485.h>');

    return 'RS485.endTransmission();\n';
};

// 启用接收
Arduino.forBlock['rs485_receive'] = function (block, generator) {
    generator.addLibrary('#include <ArduinoRS485.h>', '#include <ArduinoRS485.h>');

    return 'RS485.receive();\n';
};

// 禁用接收
Arduino.forBlock['rs485_no_receive'] = function (block, generator) {
    generator.addLibrary('#include <ArduinoRS485.h>', '#include <ArduinoRS485.h>');

    return 'RS485.noReceive();\n';
};

// 发送中断信号（毫秒）
Arduino.forBlock['rs485_send_break'] = function (block, generator) {
    const duration = block.getFieldValue('DURATION');

    generator.addLibrary('#include <ArduinoRS485.h>', '#include <ArduinoRS485.h>');

    return `RS485.sendBreak(${duration});\n`;
};

// 发送中断信号（微秒）
Arduino.forBlock['rs485_send_break_microseconds'] = function (block, generator) {
    const duration = block.getFieldValue('DURATION');

    generator.addLibrary('#include <ArduinoRS485.h>', '#include <ArduinoRS485.h>');

    return `RS485.sendBreakMicroseconds(${duration});\n`;
};

// 设置引脚
Arduino.forBlock['rs485_set_pins'] = function (block, generator) {
    const txPin = block.getFieldValue('TX_PIN');
    const dePin = block.getFieldValue('DE_PIN');
    const rePin = block.getFieldValue('RE_PIN');

    generator.addLibrary('#include <ArduinoRS485.h>', '#include <ArduinoRS485.h>');

    return `RS485.setPins(${txPin}, ${dePin}, ${rePin});\n`;
};

// 简化的发送函数 - 自动处理传输控制
Arduino.forBlock['rs485_simple_send'] = function (block, generator) {
    const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';
    return `RS485.beginTransmission();\nRS485.print(${data});\nRS485.endTransmission();\n`;
};

// 简化的接收处理 - 自动启用接收
Arduino.forBlock['rs485_simple_receive'] = function (block, generator) {
    const statements = generator.statementToCode(block, 'DO');
    generator.addVariable('rs485_receivedData', 'String rs485_receivedData = "";');
    generator.addSetup('rs485_receive_enable', 'RS485.receive();');

    const code = `if (RS485.available()) {
    rs485_receivedData = "";
    while (RS485.available()) {
        char c = RS485.read();
        rs485_receivedData += c;
        delay(1);
    }
    if (rs485_receivedData.length() > 0) {
${statements}
    }
}\n`;

    return code;
};

// 获取接收到的数据
Arduino.forBlock['rs485_received_data'] = function (block, generator) {
    generator.addVariable('rs485_receivedData', 'String rs485_receivedData = "";');
    return ['rs485_receivedData', generator.ORDER_ATOMIC];
};

// 快速设置RS485 - 一步完成所有配置
Arduino.forBlock['rs485_begin'] = function (block, generator) {
    const serial = block.getFieldValue('SERIAL');
    const baudrate = block.getFieldValue('BAUDRATE');
    const txPin = block.getFieldValue('TX_PIN');
    const dePin = block.getFieldValue('DE_PIN');
    const rePin = block.getFieldValue('RE_PIN');
    Arduino.addRS485AutoInit(generator, serial, baudrate, txPin, dePin, rePin);
    return '';
};

// RS485主机发送数据
Arduino.forBlock['rs485_master_send'] = function (block, generator) {
    const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';
    const slaveAddr = block.getFieldValue('SLAVE_ADDR');

    return `RS485.beginTransmission();\nRS485.print("TO:${slaveAddr}:");\nRS485.print(${data});\nRS485.endTransmission();\n`;
};

// RS485从机接收数据
Arduino.forBlock['rs485_slave_receive'] = function (block, generator) {
    const slaveAddr = block.getFieldValue('SLAVE_ADDR');
    const statements = generator.statementToCode(block, 'DO');

    generator.addVariable('rs485_receivedData', 'String rs485_receivedData = "";');
    generator.addSetup('rs485_receive_enable', 'RS485.receive();');

    const code = `if (RS485.available()) {
    rs485_receivedData = "";
    while (RS485.available()) {
        char c = RS485.read();
        rs485_receivedData += c;
        delay(1);
    }
    if (rs485_receivedData.length() > 0 && rs485_receivedData.indexOf("TO:${slaveAddr}:") == 0) {
        rs485_receivedData = rs485_receivedData.substring(${String(slaveAddr).length + 4});
${statements}
    }
}\n`;

    return code;
};
