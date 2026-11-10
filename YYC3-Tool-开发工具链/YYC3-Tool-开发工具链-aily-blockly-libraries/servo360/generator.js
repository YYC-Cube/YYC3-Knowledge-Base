Arduino.forBlock['servo360_write'] = function(block, generator) {
    // 获取引脚号
    var pin = block.getFieldValue('PIN');
    // 获取转速值（从连接的块获取）
    var speedCode = generator.valueToCode(block, 'SPEED', generator.ORDER_ATOMIC) || '0';
    // 获取方向（true为正传，false为反转）
    var direction = block.getFieldValue('DIRECTION');
    
    // 创建servo对象名称
    var servoName = 'servo_' + pin;
    
    // 添加必要的库
    generator.addLibrary('Servo', '#include <Servo.h>');
    
    // 添加servo对象
    generator.addObject(servoName, 'Servo ' + servoName + ';');
    
    // 在setup中添加引脚初始化代码
    generator.addSetupBegin(servoName + '_attach', servoName + '.attach(' + pin + ');');
    
    // 计算微秒值
    var code = '';
    if (direction === 'true') {
      // 正传: 将0-100映射到1500-500 (0代表停止，100代表最大正转速度)
      code = servoName + '.writeMicroseconds(1500 - (' + speedCode + ' * 10));\n';
    } else {
      // 反转: 将0-100映射到1500-2500 (0代表停止，100代表最大反转速度)
      code = servoName + '.writeMicroseconds(1500 + (' + speedCode + ' * 10));\n';
    }
    
    return code;
};

Arduino.forBlock['servo360_speed'] = function(block, generator) {
    // 获取转速值
    var speed = block.getFieldValue('SPEED');
    return [speed, generator.ORDER_ATOMIC];
};