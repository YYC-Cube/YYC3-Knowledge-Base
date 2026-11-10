'use strict';

function ensureFFatLib(generator) {
  generator.addLibrary('FFat', '#include <FFat.h>');
}

Arduino.forBlock['esp32_ffat_begin'] = function(block, generator) {
  const format = block.getFieldValue('FORMAT') || 'true';
  ensureFFatLib(generator);
  ensureSerialBegin("Serial", generator);
  let code = 'if (!FFat.begin(' + format + ')) {\n';
  code += '  Serial.println("FFat Mount Failed");\n';
  code += '  return;\n';
  code += '}\n';
  return code;
};

Arduino.forBlock['esp32_ffat_end'] = function(block, generator) {
  ensureFFatLib(generator);
  return 'FFat.end();\n';
};

Arduino.forBlock['esp32_ffat_format'] = function(block, generator) {
  ensureFFatLib(generator);
  return 'FFat.format();\n';
};

Arduino.forBlock['esp32_ffat_info'] = function(block, generator) {
  const info = block.getFieldValue('INFO') || 'totalBytes';
  ensureFFatLib(generator);
  return ['FFat.' + info + '()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_ffat_write_file'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  const content = generator.valueToCode(block, 'CONTENT', generator.ORDER_ATOMIC) || '""';
  ensureFFatLib(generator);
  ensureSerialBegin("Serial", generator);

  let funcDef = 'void ffat_writeFile(const char * path, const char * message) {\n';
  funcDef += '  File file = FFat.open(path, FILE_WRITE);\n';
  funcDef += '  if (!file) {\n';
  funcDef += '    Serial.println("Failed to open file for writing");\n';
  funcDef += '    return;\n';
  funcDef += '  }\n';
  funcDef += '  file.print(message);\n';
  funcDef += '  file.close();\n';
  funcDef += '}\n';
  generator.addFunction('ffat_writeFile', funcDef);

  return 'ffat_writeFile(' + path + ', String(' + content + ').c_str());\n';
};

Arduino.forBlock['esp32_ffat_append_file'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  const content = generator.valueToCode(block, 'CONTENT', generator.ORDER_ATOMIC) || '""';
  ensureFFatLib(generator);
  ensureSerialBegin("Serial", generator);

  let funcDef = 'void ffat_appendFile(const char * path, const char * message) {\n';
  funcDef += '  File file = FFat.open(path, FILE_APPEND);\n';
  funcDef += '  if (!file) {\n';
  funcDef += '    Serial.println("Failed to open file for appending");\n';
  funcDef += '    return;\n';
  funcDef += '  }\n';
  funcDef += '  file.print(message);\n';
  funcDef += '  file.close();\n';
  funcDef += '}\n';
  generator.addFunction('ffat_appendFile', funcDef);

  return 'ffat_appendFile(' + path + ', String(' + content + ').c_str());\n';
};

Arduino.forBlock['esp32_ffat_read_file'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  ensureFFatLib(generator);
  ensureSerialBegin("Serial", generator);

  let funcDef = 'String ffat_readFile(const char * path) {\n';
  funcDef += '  File file = FFat.open(path);\n';
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
  generator.addFunction('ffat_readFile', funcDef);

  return ['ffat_readFile(' + path + ')', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_ffat_delete_file'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  ensureFFatLib(generator);
  return 'FFat.remove(' + path + ');\n';
};

Arduino.forBlock['esp32_ffat_exists'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/test.txt"';
  ensureFFatLib(generator);
  return ['FFat.exists(' + path + ')', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['esp32_ffat_mkdir'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/mydir"';
  ensureFFatLib(generator);
  return 'FFat.mkdir(' + path + ');\n';
};

Arduino.forBlock['esp32_ffat_rmdir'] = function(block, generator) {
  const path = generator.valueToCode(block, 'PATH', generator.ORDER_ATOMIC) || '"/mydir"';
  ensureFFatLib(generator);
  return 'FFat.rmdir(' + path + ');\n';
};
