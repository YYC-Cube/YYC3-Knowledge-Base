'use strict';

function ensureLittleFSLib(generator) {
  generator.addLibrary('LittleFS', '#include <LittleFS.h>');
}

Arduino.forBlock['esp32_littlefs_begin'] = function(block, generator) {
  const format = block.getFieldValue('FORMAT') || 'true';
  ensureLittleFSLib(generator);
  ensureSerialBegin("Serial", generator);
  let code = '';
  code += 'if (!LittleFS.begin(' + format + ')) {\n';
  code += '  Serial.println("LittleFS Mount Failed");\n';
  code += '  return;\n';
  code += '}\n';
  return code;
};

Arduino.forBlock['esp32_littlefs_end'] = function(block, generator) {
  ensureLittleFSLib(generator);
  return 'LittleFS.end();\n';
};

Arduino.forBlock['esp32_littlefs_format'] = function(block, generator) {
  ensureLittleFSLib(generator);
  return 'LittleFS.format();\n';
};

Arduino.forBlock['esp32_littlefs_info'] = function(block, generator) {
  const info = block.getFieldValue('INFO') || 'totalBytes';
  ensureLittleFSLib(generator);
  return ['LittleFS.' + info + '()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_littlefs_write_file'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  const content = generator.valueToCode(block, 'CONTENT', generator.ORDER_ATOMIC) || '""';
  ensureLittleFSLib(generator);
  ensureSerialBegin("Serial", generator);

  let funcDef = '';
  funcDef += 'void littlefs_writeFile(const char * path, const char * message) {\n';
  funcDef += '  File file = LittleFS.open(path, FILE_WRITE);\n';
  funcDef += '  if (!file) {\n';
  funcDef += '    Serial.println("Failed to open file for writing");\n';
  funcDef += '    return;\n';
  funcDef += '  }\n';
  funcDef += '  file.print(message);\n';
  funcDef += '  file.close();\n';
  funcDef += '}\n';
  generator.addFunction('littlefs_writeFile', funcDef);

  return 'littlefs_writeFile(' + path + ', String(' + content + ').c_str());\n';
};

Arduino.forBlock['esp32_littlefs_append_file'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  const content = generator.valueToCode(block, 'CONTENT', generator.ORDER_ATOMIC) || '""';
  ensureLittleFSLib(generator);
  ensureSerialBegin("Serial", generator);

  let funcDef = '';
  funcDef += 'void littlefs_appendFile(const char * path, const char * message) {\n';
  funcDef += '  File file = LittleFS.open(path, FILE_APPEND);\n';
  funcDef += '  if (!file) {\n';
  funcDef += '    Serial.println("Failed to open file for appending");\n';
  funcDef += '    return;\n';
  funcDef += '  }\n';
  funcDef += '  file.print(message);\n';
  funcDef += '  file.close();\n';
  funcDef += '}\n';
  generator.addFunction('littlefs_appendFile', funcDef);

  return 'littlefs_appendFile(' + path + ', String(' + content + ').c_str());\n';
};

Arduino.forBlock['esp32_littlefs_read_file'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  ensureLittleFSLib(generator);
  ensureSerialBegin("Serial", generator);

  let funcDef = '';
  funcDef += 'String littlefs_readFile(const char * path) {\n';
  funcDef += '  File file = LittleFS.open(path);\n';
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
  generator.addFunction('littlefs_readFile', funcDef);

  return ['littlefs_readFile(' + path + ')', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_littlefs_delete_file'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  ensureLittleFSLib(generator);
  return 'LittleFS.remove(' + path + ');\n';
};

Arduino.forBlock['esp32_littlefs_exists'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  ensureLittleFSLib(generator);
  return ['LittleFS.exists(' + path + ')', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_littlefs_rename'] = function(block, generator) {
  const oldPath = generator.valueToCode(block, 'OLD_PATH', generator.ORDER_ATOMIC) || '"/old.txt"';
  const newPath = generator.valueToCode(block, 'NEW_PATH', generator.ORDER_ATOMIC) || '"/new.txt"';
  ensureLittleFSLib(generator);
  return 'LittleFS.rename(' + oldPath + ', ' + newPath + ');\n';
};

Arduino.forBlock['esp32_littlefs_mkdir'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/mydir"';
  ensureLittleFSLib(generator);
  return 'LittleFS.mkdir(' + path + ');\n';
};

Arduino.forBlock['esp32_littlefs_rmdir'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/mydir"';
  ensureLittleFSLib(generator);
  return 'LittleFS.rmdir(' + path + ');\n';
};
