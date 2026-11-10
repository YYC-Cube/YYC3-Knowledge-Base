function getVariableName(block) {
  const variableField = block.getField('ENCODER');
  const variableModel = variableField.getVariable();
  // console.log("name: ", variableModel.name);
  return variableModel.name;
}

Arduino.forBlock['encoder_init'] = function(block, generator) {
  const variable_encoder = getVariableName(block);
  var dropdown_pin_a = block.getFieldValue('PIN_A') || '2';
  var dropdown_pin_b = block.getFieldValue('PIN_B') || '3';
  
  generator.addLibrary('Encoder', '#include <Encoder.h>');
  
  // 添加增强编码器变量
  generator.addVariable('lastEncoderPosition', 'long lastEncoderPosition = 0;');
  generator.addVariable('currentEncoderPosition', 'long currentEncoderPosition = 0;');
  generator.addVariable('encoderDirection', 'int encoderDirection = 0; // 0=无变化, 1=右转, -1=左转');
  generator.addVariable('encoderUpperLimit', 'long encoderUpperLimit = 100;');
  generator.addVariable('encoderLowerLimit', 'long encoderLowerLimit = -100;');
  generator.addVariable('encoderAboveLimit', 'bool encoderAboveLimit = false;');
  generator.addVariable('encoderBelowLimit', 'bool encoderBelowLimit = false;');
  
  // 添加基本对象
  generator.addObject(`${variable_encoder}`, `Encoder  ${variable_encoder}(` + dropdown_pin_a + ', ' + dropdown_pin_b + ');\n');
  
  // 添加检测编码器状态的循环代码
  generator.addLoopBegin('encoder_state_check', `
  // 更新编码器状态
  currentEncoderPosition = ${variable_encoder}.read();
  
  // 检测变化
  if (currentEncoderPosition != lastEncoderPosition) {
    // 更新方向
    if (currentEncoderPosition > lastEncoderPosition) {
      encoderDirection = 1;  // 右转
    } else if (currentEncoderPosition < lastEncoderPosition) {
      encoderDirection = -1; // 左转
    }
    
    // 检查上下限
    if (currentEncoderPosition > encoderUpperLimit) {
      encoderAboveLimit = true;
      ${variable_encoder}.write(encoderUpperLimit);
      currentEncoderPosition = encoderUpperLimit;
    } else {
      encoderAboveLimit = false;
    }
    
    if (currentEncoderPosition < encoderLowerLimit) {
      encoderBelowLimit = true;
      ${variable_encoder}.write(encoderLowerLimit);
      currentEncoderPosition = encoderLowerLimit;
    } else {
      encoderBelowLimit = false;
    }
    
    lastEncoderPosition = currentEncoderPosition;
  } else {
    encoderDirection = 0;
  }
  `);
  
  return '';
};

Arduino.forBlock["encoder_value_changed"] = function (block, generator) {
  // 返回编码器值是否发生变化
  return ["encoderDirection != 0", generator.ORDER_EQUALITY];
};

// 1. 编码器状态检测并执行操作
Arduino.forBlock['encoder_state_change'] = function(block, generator) {
  const state = block.getFieldValue('STATE');
  const branch = generator.statementToCode(block, 'DO');
  
  let code = '';
  switch(state) {
    case 'LEFT':
      code = `if (encoderDirection == -1) {\n${branch}  }\n`;
      break;
    case 'RIGHT':
      code = `if (encoderDirection == 1) {\n${branch}  }\n`;
      break;
    case 'ABOVE_LIMIT':
      code = `if (encoderAboveLimit) {\n${branch}  }\n`;
      break;
    case 'BELOW_LIMIT':
      code = `if (encoderBelowLimit) {\n${branch}  }\n`;
      break;
  }
  return code;
};

// 2. 获取编码器属性
Arduino.forBlock['encoder_get_property'] = function(block, generator) {
  const variable_encoder = getVariableName(block);
  const property = block.getFieldValue('PROPERTY');
  
  let code = '';
  switch(property) {
    case 'POSITION':
      code = `${variable_encoder}.read()`;
      break;
    case 'DIRECTION':
      code = 'encoderDirection';
      break;
    case 'UPPER_LIMIT':
      code = 'encoderUpperLimit';
      break;
    case 'LOWER_LIMIT':
      code = 'encoderLowerLimit';
      break;
  }
  
  return [code, Arduino.ORDER_ATOMIC];
};

// 3. 设置编码器属性
Arduino.forBlock['encoder_set_property'] = function(block, generator) {
  const property = block.getFieldValue('PROPERTY');
  const value = generator.valueToCode(block, 'VALUE', Arduino.ORDER_ATOMIC);
  
  let code = '';
  switch (property) {
    case 'position':
      code = `currentEncoderPosition = ${value};
${getVariableName(block)}.write(${value});
`;
      break;
    case 'upper_limit':
      code = `encoderUpperLimit = ${value};
`;
      break;
    case 'lower_limit':
      code = `encoderLowerLimit = ${value};
`;
      break;
  }
  
  return code;
};