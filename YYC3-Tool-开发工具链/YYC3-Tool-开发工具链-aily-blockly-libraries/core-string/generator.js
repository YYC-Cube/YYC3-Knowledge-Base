Arduino.forBlock['string_create'] = function(block, generator) {
  var variable = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  var value = generator.valueToCode(block, 'VALUE', Arduino.ORDER_ASSIGNMENT);
  
  // 如果是首次使用该变量，添加变量声明
  generator.addVariable(variable, `String ${variable};`);
  
  return `${variable} = ${value};\n`;
};

Arduino.forBlock['string_char_create'] = function(block, generator) {
  var variable = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  var value = generator.valueToCode(block, 'VALUE', Arduino.ORDER_ASSIGNMENT);
  
  // 如果是首次使用该变量，添加变量声明
  generator.addVariable(variable, `char ${variable};`);
  
  return `${variable} = ${value}[0];\n`;
};

Arduino.forBlock['string_get'] = function(block, generator) {
  var variable = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  return [variable, Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['string_length'] = function(block, generator) {
  var string = generator.valueToCode(block, 'STRING', Arduino.ORDER_MEMBER);
  return [`${string}.length()`, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['string_concat'] = function(block, generator) {
  var string1 = generator.valueToCode(block, 'STRING1', Arduino.ORDER_ADDITIVE);
  var string2 = generator.valueToCode(block, 'STRING2', Arduino.ORDER_ADDITIVE);
  return [`String(${string1}) + String(${string2})`, Arduino.ORDER_ADDITIVE];
};

Arduino.forBlock['string_char_at'] = function(block, generator) {
  var string = generator.valueToCode(block, 'STRING', Arduino.ORDER_MEMBER);
  var index = generator.valueToCode(block, 'INDEX', Arduino.ORDER_ATOMIC);
  return [`${string}.charAt(${index})`, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['string_substring'] = function(block, generator) {
  var string = generator.valueToCode(block, 'STRING', Arduino.ORDER_MEMBER);
  var start = generator.valueToCode(block, 'START', Arduino.ORDER_ATOMIC);
  var end = generator.valueToCode(block, 'END', Arduino.ORDER_ATOMIC);
  return [`${string}.substring(${start}, ${end})`, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['string_index_of'] = function(block, generator) {
  var string = generator.valueToCode(block, 'STRING', Arduino.ORDER_MEMBER);
  var search = generator.valueToCode(block, 'SEARCH', Arduino.ORDER_ATOMIC);
  return [`${string}.indexOf(${search})`, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['string_equals'] = function(block, generator) {
  var string1 = generator.valueToCode(block, 'STRING1', Arduino.ORDER_EQUALITY);
  var string2 = generator.valueToCode(block, 'STRING2', Arduino.ORDER_EQUALITY);
  return [`${string1}.equals(${string2})`, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['string_to_int'] = function(block, generator) {
  var string = generator.valueToCode(block, 'STRING', Arduino.ORDER_MEMBER);
  return [`${string}.toInt()`, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['string_to_float'] = function(block, generator) {
  var string = generator.valueToCode(block, 'STRING', Arduino.ORDER_MEMBER);
  return [`${string}.toFloat()`, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['string_replace'] = function(block, generator) {
  var string = generator.valueToCode(block, 'STRING', Arduino.ORDER_MEMBER);
  var find = generator.valueToCode(block, 'FIND', Arduino.ORDER_ATOMIC);
  var replace = generator.valueToCode(block, 'REPLACE', Arduino.ORDER_ATOMIC);
  return [`${string}.replace(${find}, ${replace})`, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['string_to_upper'] = function(block, generator) {
  var string = generator.valueToCode(block, 'STRING', Arduino.ORDER_MEMBER);
  return [`${string}.toUpperCase()`, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['string_to_lower'] = function(block, generator) {
  var string = generator.valueToCode(block, 'STRING', Arduino.ORDER_MEMBER);
  return [`${string}.toLowerCase()`, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['string_trim'] = function(block, generator) {
  var string = generator.valueToCode(block, 'STRING', Arduino.ORDER_MEMBER);
  return [`${string}.trim()`, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['string_starts_with'] = function(block, generator) {
  var string = generator.valueToCode(block, 'STRING', Arduino.ORDER_MEMBER);
  var prefix = generator.valueToCode(block, 'PREFIX', Arduino.ORDER_ATOMIC);
  return [`${string}.startsWith(${prefix})`, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['string_ends_with'] = function(block, generator) {
  var string = generator.valueToCode(block, 'STRING', Arduino.ORDER_MEMBER);
  var suffix = generator.valueToCode(block, 'SUFFIX', Arduino.ORDER_ATOMIC);
  return [`${string}.endsWith(${suffix})`, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['string_literal'] = function(block, generator) {
  var text = block.getFieldValue('TEXT');
  return [`"${text}"`, Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['string_char_literal'] = function(block, generator) {
  var char = block.getFieldValue('CHAR');
  if (char.length > 0) {
    return [`'${char[0]}'`, Arduino.ORDER_ATOMIC];
  } else {
    return [`' '`, Arduino.ORDER_ATOMIC];
  }
};