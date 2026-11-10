
Arduino.forBlock['tm1650_init'] = function(block, generator) {
  generator.addLibrary('#include<TM1650.h>', '#include<TM1650.h>');
  generator.addVariable('TM1650', 'TM1650 module(A4, A5); \n');
  return '';
};

Arduino.forBlock['tm1650_set'] = function(block, generator) {
  const pwrswc = block.getFieldValue("TM1650PWRSWITCH");
  const bri = block.getFieldValue("TM1650BRIGHTNESS");
  
  const code = 'module.setupDisplay(' + pwrswc + ','+ bri +');\n';
  return code;
};

Arduino.forBlock['tm1650_displaystring'] = function(block, generator) {
  const text = generator.valueToCode(block, 'TMSTR', Arduino.ORDER_ATOMIC) || '""';
  
  return `module.setDisplayToString(${text});\n`;
};

Arduino.forBlock['tm1650_displayNumber'] = function(block, generator) {
  var num = generator.valueToCode(block, 'TMNUM', Arduino.ORDER_ATOMIC) || '';
  
  var code = 'module.setDisplayToDecNumber(' + num + ');\n';
  return code;
};

Arduino.forBlock['tm1650_clearDisplay'] = function(block, generator) {
  
  return `module.clearDisplay();\n`;
};
