function getVariableName(block) {
  const variableField = block.getField('TCS34725NAME');
  const variableModel = variableField.getVariable();
  // console.log("name: ", variableModel.name);
  return variableModel.name;
}

Arduino.forBlock['tcs34725_init'] = function (block, generator) {
  var variable_tcs = getVariableName(block);

  generator.addLibrary('#include <Adafruit_TCS34725.h>', '#include <Wire.h>\n#include "Adafruit_TCS34725.h"\n');

  generator.addVariable('Adafruit_TCS34725 ' + variable_tcs, 'Adafruit_TCS34725 ' + variable_tcs + '= Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);\n');
  generator.addObject('TCS34725', 'float red, green, blue;');
  generator.addSetupBegin('TCS34725', variable_tcs + '.begin();', true);
  return '';
};

Arduino.forBlock['tcs34725_led_ctrl'] = function (block, generator) {
  var variable_tcs = getVariableName(block);
  const tcsledste = block.getFieldValue("TCSLEDSTATE");

  var code = variable_tcs + '.setInterrupt(' + tcsledste + ');\n';
  return code;
};

Arduino.forBlock['tcs34725_get_rgb'] = function (block, generator) {
  var variable_tcs = getVariableName(block);

  var code = variable_tcs + '.getRGB(&red, &green, &blue);\n';
  return code;
};

Arduino.forBlock['tcs34725_rgb_value'] = function (block, generator) {
  const code = block.getFieldValue("TCSRGBVALUE");

  return [code, Arduino.ORDER_ATOMIC];
};