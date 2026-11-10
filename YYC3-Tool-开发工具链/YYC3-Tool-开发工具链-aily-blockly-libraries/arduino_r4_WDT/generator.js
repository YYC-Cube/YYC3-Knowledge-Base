Arduino.forBlock['wdt_begin'] = function(block, generator) {
  var timeout = block.getFieldValue('TIMEOUT');
  generator.addLibrary('WDT_lib', '#include <WDT.h>');
  
  var code = 'WDT.begin(' + timeout + ');\n';
  return code;
};

Arduino.forBlock['wdt_refresh'] = function(block, generator) {
  generator.addLibrary('WDT_lib', '#include <WDT.h>');
  
  var code = 'WDT.refresh();\n';
  return code;
};

Arduino.forBlock['wdt_gettimeout'] = function(block, generator) {
  generator.addLibrary('WDT_lib', '#include <WDT.h>');
  
  var code = 'WDT.getTimeout()';
  return [code, Arduino.ORDER_ATOMIC];
};