/**
 * Generator functions for OpenJumper IICMotorDriver library blocks.
 */

// 电机驱动初始化块
Arduino.forBlock['iicmd_init'] = function(block, generator) {
  generator.addLibrary('OpenJumperIICMotorDriver', '#include <Openjumper_IICMotorDriver.h>');  
  generator.addVariable('IICMD', 'Openjumper_IICMotorDriver pwm = Openjumper_IICMotorDriver();'); 
  generator.addSetupBegin('I2CMDbeing', 'pwm.begin();');
  
  return '';
};

// 电机相对方向初始化
Arduino.forBlock['iicmd_dirinit'] = function(block, generator) {
  const m1d = block.getFieldValue("DIR_TYPE_M1");
  const m2d = block.getFieldValue("DIR_TYPE_M2");
  const m3d = block.getFieldValue("DIR_TYPE_M3");
  const m4d = block.getFieldValue("DIR_TYPE_M4");
  
  const code = `pwm.motorConfig(${m1d},${m2d},${m3d},${m4d});\n`;
  return code;
};

// 电机停止
Arduino.forBlock['iicmd_stop'] = function(block, generator) {
  const m_st_n = block.getFieldValue("MOTOR_NUMBER");
  
  const code = `pwm.stopMotor(${m_st_n});\n`;
  return code;
};

// 设置电机转速
Arduino.forBlock['iicmd_runone'] = function(block, generator) {
  const mn2 = block.getFieldValue("MOTOR_RUN_NUM");
  const speed = generator.valueToCode(block,"RUNONR_SP", Arduino.ORDER_ATOMIC);

  return `pwm.setMotor(${mn2},${speed});\n`;
};

// 设置电机转速
Arduino.forBlock['iicmd_runall'] = function(block, generator) {
  const speeda = generator.valueToCode(block,"RUNALL_SP", Arduino.ORDER_ATOMIC);

  return `pwm.setAllMotor(${speeda});\n`;
};

// 设置全部电机转速
Arduino.forBlock['iicmd_runall2'] = function(block, generator) {
  const m1sped = generator.valueToCode(block,"M1_SP", Arduino.ORDER_ATOMIC);
  const m2sped = generator.valueToCode(block,"M2_SP", Arduino.ORDER_ATOMIC);
  const m3sped = generator.valueToCode(block,"M3_SP", Arduino.ORDER_ATOMIC);
  const m4sped = generator.valueToCode(block,"M4_SP", Arduino.ORDER_ATOMIC);
 
  return `pwm.setAllMotor(${m1sped},${m2sped},${m3sped},${m4sped});\n`;
};

// 设置IO输出
Arduino.forBlock['iicmd_digitout'] = function(block, generator) {
  const outio = block.getFieldValue("IODIGIT");
  const outstat = block.getFieldValue("OUTSTATE");
  
  const code = `pwm.digitalWrite(${outio},${outstat});\n`;
  return code;
};

// 设置舵机转动角度
Arduino.forBlock['iicmd_servo'] = function(block, generator) {
  const ioser = block.getFieldValue("IOSERVER");
  const ser_ang = generator.valueToCode(block,"SERANGLE", Arduino.ORDER_ATOMIC);
  
  const code = `pwm.setServoAngle(${ioser},${ser_ang});\n`;
  return code;
};