
// PS3IIC手柄初始化块，测试地址aa:ac:ef:ff:01:10
Arduino.forBlock['openjumper_iicps3_init'] = function(block, generator) { 
  const ps3name = block.getFieldValue("PS3_NAME") || "";

  generator.addLibrary('OpenJumperPS3', '#include <OpenJumperPS3.h>');
  generator.addVariable(`PS3`, `OpenJumperPS3 ${ps3name};\n`); 
  generator.addSetupBegin('Wire.begin', 'Wire.begin();\n');

  return '';
};

// PS3IIC手柄解析数据
Arduino.forBlock['openjumper_iicps3_run'] = function(block, generator) {
  const ps3name = block.getFieldValue("PS3_NAME") || "";

  return `${ps3name}.run();\n`;
};

// PS3IIC手柄各个按键状态块
Arduino.forBlock['openjumper_iicps3_butstate'] = function(block, generator) {
  const ps3name = block.getFieldValue("PS3_NAME") || "";

  const ps3btnstate = block.getFieldValue("IICPS3_BTN");
  return [`${ps3name}.ps3Data.${ps3btnstate}`, Arduino.ORDER_FUNCTION_CALL];
};

// PS3IIC手柄各个摇杆数据块
Arduino.forBlock['openjumper_iicps3_xy'] = function(block, generator) {
  const ps3name = block.getFieldValue("PS3_NAME") || "";

  const ps3xyval = block.getFieldValue("IICPS3_XY");
  return [`${ps3name}.ps3Data.${ps3xyval}`, Arduino.ORDER_FUNCTION_CALL];
};
