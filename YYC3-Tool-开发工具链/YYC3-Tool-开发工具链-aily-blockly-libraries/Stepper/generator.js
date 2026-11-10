
function getVariableName(block) {
  const variableField = block.getField('STEPPER');
  const variableModel = variableField.getVariable();
  // console.log("name: ", variableModel.name);
  return variableModel.name;
}

Arduino.forBlock['stepper_init'] = function (block, generator) {
  var variable_stepper = getVariableName(block);
  var steps_per_rev = block.getFieldValue('STEPS');
  var pin1 = block.getFieldValue('PIN1');
  var pin2 = block.getFieldValue('PIN2');
  var pin3 = block.getFieldValue('PIN3');
  var pin4 = block.getFieldValue('PIN4');

  // 添加步进电机库
  generator.addLibrary('#include <Stepper.h>', '#include <Stepper.h>');

  // 创建步进电机对象
  generator.addVariable('Stepper ' + variable_stepper, 'Stepper ' + variable_stepper + '(' + steps_per_rev + ', ' + pin1 + ', ' + pin2 + ', ' + pin3 + ', ' + pin4 + ');');

  return '';
};

Arduino.forBlock['stepper_set_speed'] = function (block, generator) {
  var variable_stepper = getVariableName(block);
  var speed = block.getFieldValue('SPEED');

  var code = variable_stepper + '.setSpeed(' + speed + ');\n';
  return code;
};

Arduino.forBlock['stepper_step'] = function (block, generator) {
  var variable_stepper = getVariableName(block);
  var steps = generator.valueToCode(block, 'STEPS', Arduino.ORDER_ATOMIC);

  var code = variable_stepper + '.step(' + steps + ');\n';
  return code;
};

// 步进电机旋转指定角度
Arduino.forBlock['stepper_rotate_degrees'] = function (block, generator) {
  // 确保获取正确的变量名，与初始化时创建的相同
  var variable_stepper = getVariableName(block);
  var degrees = generator.valueToCode(block, 'DEGREES', Arduino.ORDER_ATOMIC);
  
  // 从工作区中查找步进电机的初始化块，获取设置的步数
  var stepsPerRev = 2048; // 默认值，如果找不到初始化块
  
  // 获取所有块
  var workspace = block.workspace;
  var allBlocks = workspace.getAllBlocks();
  
  // 查找与当前变量名相匹配的初始化块
  for (var i = 0; i < allBlocks.length; i++) {
    var currentBlock = allBlocks[i];
    if (currentBlock.type === 'stepper_init') {
      // 检查变量名是否匹配
      var initStepperName = getVariableName(currentBlock);
      if (initStepperName === variable_stepper) {
        // 找到匹配的初始化块，获取步数
        stepsPerRev = currentBlock.getFieldValue('STEPS');
        break;
      }
    }
  }
  
  // 计算角度对应的步数并旋转，确保使用完全相同的变量名
  var code = `// 旋转指定角度\n`;
  code += `{\n`;
  code += `  // 将角度转换为步数 (度数 / 360) * 每圈步数\n`;
  code += `  int steps = (int)((${degrees} / 360.0) * ${stepsPerRev});\n`;
  code += `  ${variable_stepper}.step(steps);\n`;
  code += `}\n`;
  
  return code;
};

