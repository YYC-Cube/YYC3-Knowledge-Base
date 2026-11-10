'use strict';

function ensureHashLib(algo, generator) {
  if (algo === 'SHA1') {
    generator.addLibrary('SHA1Builder', '#include <SHA1Builder.h>');
  } else if (algo.startsWith('SHA3')) {
    generator.addLibrary('SHA3Builder', '#include <SHA3Builder.h>');
  } else {
    generator.addLibrary('SHA2Builder', '#include <SHA2Builder.h>');
  }
}

function getHashClass(algo) {
  switch (algo) {
    case 'SHA1': return 'SHA1Builder';
    case 'SHA224': return 'SHA224Builder';
    case 'SHA256': return 'SHA256Builder';
    case 'SHA384': return 'SHA384Builder';
    case 'SHA512': return 'SHA512Builder';
    case 'SHA3_256': return 'SHA3_256Builder';
    case 'SHA3_512': return 'SHA3_512Builder';
    default: return 'SHA256Builder';
  }
}

// 一步到位计算哈希值
Arduino.forBlock['esp32_hash_compute'] = function(block, generator) {
  const algo = block.getFieldValue('ALGO') || 'SHA256';
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';

  ensureHashLib(algo, generator);
  const className = getHashClass(algo);
  const funcName = 'computeHash_' + algo;

  generator.addFunction(funcName,
    'String ' + funcName + '(String data) {\n' +
    '  ' + className + ' builder;\n' +
    '  builder.begin();\n' +
    '  builder.add((const uint8_t*)data.c_str(), data.length());\n' +
    '  builder.calculate();\n' +
    '  return builder.toString();\n' +
    '}\n'
  );

  return [funcName + '(' + data + ')', generator.ORDER_FUNCTION_CALL];
};

// 创建哈希构建器
Arduino.forBlock['esp32_hash_create'] = function(block, generator) {
  const varName = block.getFieldValue('VAR') || 'hashBuilder';
  const algo = block.getFieldValue('ALGO') || 'SHA256';

  ensureHashLib(algo, generator);
  const className = getHashClass(algo);

  generator.addObject(varName, className + ' ' + varName + ';');
  return '';
};

function getVariableName(block, fieldName, defaultName) {
  const varField = block.getField(fieldName);
  return varField ? varField.getText() : defaultName;
}

// 开始哈希计算
Arduino.forBlock['esp32_hash_begin'] = function(block, generator) {
  const varName = getVariableName(block, 'VAR', 'hashBuilder');
  return varName + '.begin();\n';
};

// 添加数据
Arduino.forBlock['esp32_hash_add'] = function(block, generator) {
  const varName = getVariableName(block, 'VAR', 'hashBuilder');
  const data = generator.valueToCode(block, 'DATA', generator.ORDER_ATOMIC) || '""';
  return '{\n  String _hashData = ' + data + ';\n  ' + varName + '.add((const uint8_t*)_hashData.c_str(), _hashData.length());\n}\n';
};

// 完成计算
Arduino.forBlock['esp32_hash_calculate'] = function(block, generator) {
  const varName = getVariableName(block, 'VAR', 'hashBuilder');
  return varName + '.calculate();\n';
};

// 获取结果
Arduino.forBlock['esp32_hash_result'] = function(block, generator) {
  const varName = getVariableName(block, 'VAR', 'hashBuilder');
  return [varName + '.toString()', generator.ORDER_FUNCTION_CALL];
};

// PBKDF2 密钥派生
Arduino.forBlock['esp32_hash_pbkdf2'] = function(block, generator) {
  const algo = block.getFieldValue('ALGO') || 'SHA256';
  const password = generator.valueToCode(block, 'PASSWORD', generator.ORDER_ATOMIC) || '""';
  const salt = generator.valueToCode(block, 'SALT', generator.ORDER_ATOMIC) || '""';
  const iterations = generator.valueToCode(block, 'ITERATIONS', generator.ORDER_ATOMIC) || '10000';

  ensureHashLib(algo, generator);
  generator.addLibrary('PBKDF2_HMACBuilder', '#include <PBKDF2_HMACBuilder.h>');

  const className = getHashClass(algo);
  const funcName = 'computePBKDF2_' + algo;

  generator.addFunction(funcName,
    'String ' + funcName + '(String password, String salt, uint32_t iterations) {\n' +
    '  ' + className + ' hashAlgo;\n' +
    '  PBKDF2_HMACBuilder builder(&hashAlgo, password, salt, iterations);\n' +
    '  builder.begin();\n' +
    '  builder.calculate();\n' +
    '  return builder.toString();\n' +
    '}\n'
  );

  return [funcName + '(' + password + ', ' + salt + ', ' + iterations + ')', generator.ORDER_FUNCTION_CALL];
};
