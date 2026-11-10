Arduino.forBlock['ws2812fx_set_color'] = function(block, generator) {
    var color = block.getFieldValue('COLOR');
    var ledCount = block.getFieldValue('LED_COUNT');
    var code = `ws2812fx.setColor(${ledCount}, ${color});\n`;
    return code;
  };
  
  Arduino.forBlock['ws2812fx_show'] = function(block, generator) {
    var code = `ws2812fx.show();\n`;
    return code;
  };
  
  Arduino.forBlock['ws2812fx_set_effect'] = function(block, generator) {
    var effect = block.getFieldValue('EFFECT');
    var code = `ws2812fx.setEffect(${effect});\n`;
    return code;
  };
  
  Arduino.forBlock['ws2812fx_set_speed'] = function(block, generator) {
    var speed = block.getFieldValue('SPEED');
    var code = `ws2812fx.setSpeed(${speed});\n`;
    return code;
  };