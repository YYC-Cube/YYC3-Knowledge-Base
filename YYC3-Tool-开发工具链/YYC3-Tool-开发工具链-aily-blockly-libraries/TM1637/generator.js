// TM1637四位数码管驱动 - Generator

Arduino.forBlock['tm1637_init'] = function(block, generator) {
    const clkPin = block.getFieldValue('CLK_PIN');
    const dioPin = block.getFieldValue('DIO_PIN');
    
    generator.addLibrary('#include <SevenSegmentTM1637.h>', '#include "SevenSegmentTM1637.h"');
    generator.addObject(`SevenSegmentTM1637 display(${clkPin}, ${dioPin});`, `SevenSegmentTM1637 display(${clkPin}, ${dioPin});`);
    generator.addSetupBegin('display.begin();', 'display.begin();');
    generator.addSetupBegin('display.setBacklight(100);', 'display.setBacklight(100);');
    
    return '';
};

Arduino.forBlock['tm1637_print_number'] = function(block, generator) {
    const number = generator.valueToCode(block, 'NUMBER', generator.ORDER_ATOMIC) || '0';
    
    generator.addLibrary('#include <SevenSegmentTM1637.h>', '#include "SevenSegmentTM1637.h"');
    
    const code = `display.print(${number});\n`;
    return code;
};

Arduino.forBlock['tm1637_print_text'] = function(block, generator) {
    const text = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC) || '""';
    
    generator.addLibrary('#include <SevenSegmentTM1637.h>', '#include "SevenSegmentTM1637.h"');
    
    const code = `display.print(${text});\n`;
    return code;
};

Arduino.forBlock['tm1637_clear'] = function(block, generator) {
    generator.addLibrary('#include <SevenSegmentTM1637.h>', '#include "SevenSegmentTM1637.h"');
    
    const code = 'display.clear();\n';
    return code;
};

Arduino.forBlock['tm1637_set_brightness'] = function(block, generator) {
    const brightness = block.getFieldValue('BRIGHTNESS');
    
    generator.addLibrary('#include <SevenSegmentTM1637.h>', '#include "SevenSegmentTM1637.h"');
    
    const code = `display.setBacklight(${brightness});\n`;
    return code;
};

Arduino.forBlock['tm1637_set_colon'] = function(block, generator) {
    const colonState = block.getFieldValue('COLON_STATE');
    
    generator.addLibrary('#include <SevenSegmentTM1637.h>', '#include "SevenSegmentTM1637.h"');
    
    const code = `display.setColonOn(${colonState});\n`;
    return code;
};

Arduino.forBlock['tm1637_print_time'] = function(block, generator) {
    const hour = generator.valueToCode(block, 'HOUR', generator.ORDER_ATOMIC) || '0';
    const minute = generator.valueToCode(block, 'MINUTE', generator.ORDER_ATOMIC) || '0';
    
    generator.addLibrary('#include <SevenSegmentTM1637.h>', '#include "SevenSegmentTM1637.h"');
    
    const code = `display.setColonOn(true);\n` +
                `display.print(String(${hour} < 10 ? "0" : "") + String(${hour}) + String(${minute} < 10 ? "0" : "") + String(${minute}));\n`;
    return code;
};

Arduino.forBlock['tm1637_blink'] = function(block, generator) {
    const delay = block.getFieldValue('DELAY');
    const repeats = block.getFieldValue('REPEATS');
    
    generator.addLibrary('#include <SevenSegmentTM1637.h>', '#include "SevenSegmentTM1637.h"');
    
    const code = `display.blink(${delay}, ${repeats});\n`;
    return code;
};
