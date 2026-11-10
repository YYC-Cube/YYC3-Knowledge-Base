'use strict';

function ensureSPIFFSLib(generator) {
  generator.addLibrary('SPIFFS', '#include <SPIFFS.h>');
}

Arduino.forBlock['esp32_spiffs_begin'] = function(block, generator) {
  const format = block.getFieldValue('FORMAT') || 'true';
  ensureSPIFFSLib(generator);
  ensureSerialBegin("Serial", generator);
  let code = '';
  code += 'if (!SPIFFS.begin(' + format + ')) {\n';
  code += '  Serial.println("SPIFFS Mount Failed");\n';
  code += '  return;\n';
  code += '}\n';
  return code;
};

Arduino.forBlock['esp32_spiffs_end'] = function(block, generator) {
  ensureSPIFFSLib(generator);
  return 'SPIFFS.end();\n';
};

Arduino.forBlock['esp32_spiffs_format'] = function(block, generator) {
  ensureSPIFFSLib(generator);
  return 'SPIFFS.format();\n';
};

Arduino.forBlock['esp32_spiffs_info'] = function(block, generator) {
  const info = block.getFieldValue('INFO') || 'totalBytes';
  ensureSPIFFSLib(generator);
  return ['SPIFFS.' + info + '()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_spiffs_write_file'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  const content = generator.valueToCode(block, 'CONTENT', generator.ORDER_ATOMIC) || '""';
  ensureSPIFFSLib(generator);

  let funcDef = '';
  funcDef += 'void spiffs_writeFile(const char * path, const char * message) {\n';
  funcDef += '  File file = SPIFFS.open(path, FILE_WRITE);\n';
  funcDef += '  if (!file) {\n';
  funcDef += '    Serial.println("Failed to open file for writing");\n';
  funcDef += '    return;\n';
  funcDef += '  }\n';
  funcDef += '  file.print(message);\n';
  funcDef += '  file.close();\n';
  funcDef += '}\n';
  generator.addFunction('spiffs_writeFile', funcDef);
  ensureSerialBegin("Serial", generator);

  return 'spiffs_writeFile(' + path + ', String(' + content + ').c_str());\n';
};

Arduino.forBlock['esp32_spiffs_append_file'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  const content = generator.valueToCode(block, 'CONTENT', generator.ORDER_ATOMIC) || '""';
  ensureSPIFFSLib(generator);

  let funcDef = '';
  funcDef += 'void spiffs_appendFile(const char * path, const char * message) {\n';
  funcDef += '  File file = SPIFFS.open(path, FILE_APPEND);\n';
  funcDef += '  if (!file) {\n';
  funcDef += '    Serial.println("Failed to open file for appending");\n';
  funcDef += '    return;\n';
  funcDef += '  }\n';
  funcDef += '  file.print(message);\n';
  funcDef += '  file.close();\n';
  funcDef += '}\n';
  generator.addFunction('spiffs_appendFile', funcDef);
  ensureSerialBegin("Serial", generator);

  return 'spiffs_appendFile(' + path + ', String(' + content + ').c_str());\n';
};

Arduino.forBlock['esp32_spiffs_read_file'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  ensureSPIFFSLib(generator);

  let funcDef = '';
  funcDef += 'String spiffs_readFile(const char * path) {\n';
  funcDef += '  File file = SPIFFS.open(path);\n';
  funcDef += '  if (!file || file.isDirectory()) {\n';
  funcDef += '    Serial.println("Failed to open file for reading");\n';
  funcDef += '    return String();\n';
  funcDef += '  }\n';
  funcDef += '  String content;\n';
  funcDef += '  while (file.available()) {\n';
  funcDef += '    content += (char)file.read();\n';
  funcDef += '  }\n';
  funcDef += '  file.close();\n';
  funcDef += '  return content;\n';
  funcDef += '}\n';
  generator.addFunction('spiffs_readFile', funcDef);
  ensureSerialBegin("Serial", generator);

  return ['spiffs_readFile(' + path + ')', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_spiffs_delete_file'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  ensureSPIFFSLib(generator);
  return 'SPIFFS.remove(' + path + ');\n';
};

Arduino.forBlock['esp32_spiffs_exists'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  ensureSPIFFSLib(generator);
  return ['SPIFFS.exists(' + path + ')', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_spiffs_rename'] = function(block, generator) {
  const oldPath = generator.valueToCode(block, 'OLD_PATH', generator.ORDER_ATOMIC) || '"/old.txt"';
  const newPath = generator.valueToCode(block, 'NEW_PATH', generator.ORDER_ATOMIC) || '"/new.txt"';
  ensureSPIFFSLib(generator);
  return 'SPIFFS.rename(' + oldPath + ', ' + newPath + ');\n';
};
