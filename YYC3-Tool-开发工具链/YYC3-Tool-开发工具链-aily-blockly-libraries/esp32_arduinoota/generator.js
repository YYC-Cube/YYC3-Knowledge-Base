'use strict';

function ensureOTALib(generator) {
  generator.addLibrary('ArduinoOTA', '#include <ArduinoOTA.h>');
}

Arduino.forBlock['esp32_ota_begin'] = function(block, generator) {
  ensureOTALib(generator);
  return 'ArduinoOTA.begin();\n';
};

Arduino.forBlock['esp32_ota_handle'] = function(block, generator) {
  ensureOTALib(generator);
  return 'ArduinoOTA.handle();\n';
};

Arduino.forBlock['esp32_ota_set_hostname'] = function(block, generator) {
  const hostname = generator.valueToCode(block, 'HOSTNAME', generator.ORDER_ATOMIC) || '"esp32"';
  ensureOTALib(generator);
  return 'ArduinoOTA.setHostname(' + hostname + ');\n';
};

Arduino.forBlock['esp32_ota_set_password'] = function(block, generator) {
  const password = generator.valueToCode(block, 'PASSWORD', generator.ORDER_ATOMIC) || '"admin"';
  ensureOTALib(generator);
  return 'ArduinoOTA.setPassword(' + password + ');\n';
};

Arduino.forBlock['esp32_ota_set_port'] = function(block, generator) {
  const port = generator.valueToCode(block, 'PORT', generator.ORDER_ATOMIC) || '3232';
  ensureOTALib(generator);
  return 'ArduinoOTA.setPort(' + port + ');\n';
};

Arduino.forBlock['esp32_ota_on_start'] = function(block, generator) {
  const handlerCode = generator.statementToCode(block, 'HANDLER') || '';
  ensureOTALib(generator);

  const funcDef = 'void ota_on_start_callback() {\n' + handlerCode + '}\n';
  generator.addFunction('ota_on_start_callback', funcDef);
  generator.addSetupEnd('ArduinoOTA.onStart(ota_on_start_callback);', 'ArduinoOTA.onStart(ota_on_start_callback);');

  return '';
};

Arduino.forBlock['esp32_ota_on_end'] = function(block, generator) {
  const handlerCode = generator.statementToCode(block, 'HANDLER') || '';
  ensureOTALib(generator);

  const funcDef = 'void ota_on_end_callback() {\n' + handlerCode + '}\n';
  generator.addFunction('ota_on_end_callback', funcDef);
  generator.addSetupEnd('ArduinoOTA.onEnd(ota_on_end_callback);', 'ArduinoOTA.onEnd(ota_on_end_callback);');

  return '';
};

Arduino.forBlock['esp32_ota_on_progress'] = function(block, generator) {
  const curVar = block.getFieldValue('CUR_VAR') || 'progress';
  const totalVar = block.getFieldValue('TOTAL_VAR') || 'total';
  const handlerCode = generator.statementToCode(block, 'HANDLER') || '';
  ensureOTALib(generator);

  const funcDef = 'void ota_on_progress_callback(unsigned int ' + curVar + ', unsigned int ' + totalVar + ') {\n' + handlerCode + '}\n';
  generator.addFunction('ota_on_progress_callback', funcDef);
  generator.addSetupEnd('ArduinoOTA.onProgress(ota_on_progress_callback);', 'ArduinoOTA.onProgress(ota_on_progress_callback);');

  return '';
};

Arduino.forBlock['esp32_ota_on_error'] = function(block, generator) {
  const errVar = block.getFieldValue('ERR_VAR') || 'error';
  const handlerCode = generator.statementToCode(block, 'HANDLER') || '';
  ensureOTALib(generator);

  const funcDef = 'void ota_on_error_callback(ota_error_t ' + errVar + ') {\n' + handlerCode + '}\n';
  generator.addFunction('ota_on_error_callback', funcDef);
  generator.addSetupEnd('ArduinoOTA.onError(ota_on_error_callback);', 'ArduinoOTA.onError(ota_on_error_callback);');

  return '';
};
