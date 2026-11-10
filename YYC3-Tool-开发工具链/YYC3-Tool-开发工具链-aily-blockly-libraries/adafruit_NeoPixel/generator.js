Arduino.forBlock['neopixel_init'] = function(block, generator) {
  var pin = block.getFieldValue('PIN');
  var num = block.getFieldValue('NUM');
  var type = block.getFieldValue('TYPE');
  
  generator.addLibrary('#include <Adafruit_NeoPixel.h>', '#include <Adafruit_NeoPixel.h>');
  generator.addVariable('Adafruit_NeoPixel strip', 'Adafruit_NeoPixel strip(' + num + ', ' + pin + ', ' + type + ');');
  
  return '';
};

Arduino.forBlock['neopixel_begin'] = function(block, generator) {
  return 'strip.begin();\n';
};

Arduino.forBlock['neopixel_show'] = function(block, generator) {
  return 'strip.show();\n';
};

Arduino.forBlock['neopixel_set_brightness'] = function(block, generator) {
  var brightness = block.getFieldValue('BRIGHTNESS');
  return 'strip.setBrightness(' + brightness + ');\n';
};

Arduino.forBlock['neopixel_set_pixel_color'] = function(block, generator) {
  var pixel = block.getFieldValue('PIXEL');
  var red = block.getFieldValue('RED');
  var green = block.getFieldValue('GREEN');
  var blue = block.getFieldValue('BLUE');
  
  return 'strip.setPixelColor(' + pixel + ', strip.Color(' + red + ', ' + green + ', ' + blue + '));\n';
};

Arduino.forBlock['neopixel_fill'] = function(block, generator) {
  var red = block.getFieldValue('RED');
  var green = block.getFieldValue('GREEN');
  var blue = block.getFieldValue('BLUE');
  
  return 'strip.fill(strip.Color(' + red + ', ' + green + ', ' + blue + '));\n';
};

Arduino.forBlock['neopixel_clear'] = function(block, generator) {
  return 'strip.clear();\n';
};

Arduino.forBlock['neopixel_rainbow'] = function(block, generator) {
  var delay = block.getFieldValue('DELAY');
  
  // Add the rainbow function
  generator.addFunction('void rainbow(int wait)', 
  'void rainbow(int wait) {\n' +
  '  for(long firstPixelHue = 0; firstPixelHue < 65536; firstPixelHue += 256) {\n' +
  '    for(int i=0; i<strip.numPixels(); i++) {\n' +
  '      int pixelHue = firstPixelHue + (i * 65536L / strip.numPixels());\n' +
  '      strip.setPixelColor(i, strip.gamma32(strip.ColorHSV(pixelHue)));\n' +
  '    }\n' +
  '    strip.show();\n' +
  '    delay(wait);\n' +
  '  }\n' +
  '}\n');
  
  return 'rainbow(' + delay + ');\n';
};

Arduino.forBlock['neopixel_color_wipe'] = function(block, generator) {
  var red = block.getFieldValue('RED');
  var green = block.getFieldValue('GREEN');
  var blue = block.getFieldValue('BLUE');
  var delay = block.getFieldValue('DELAY');
  
  // Add the colorWipe function
  generator.addFunction('void colorWipe(uint32_t color, int wait)', 
  'void colorWipe(uint32_t color, int wait) {\n' +
  '  for(int i=0; i<strip.numPixels(); i++) {\n' +
  '    strip.setPixelColor(i, color);\n' +
  '    strip.show();\n' +
  '    delay(wait);\n' +
  '  }\n' +
  '}\n');
  
  return 'colorWipe(strip.Color(' + red + ', ' + green + ', ' + blue + '), ' + delay + ');\n';
};

Arduino.forBlock['neopixel_theater_chase'] = function(block, generator) {
  var red = block.getFieldValue('RED');
  var green = block.getFieldValue('GREEN');
  var blue = block.getFieldValue('BLUE');
  var delay = block.getFieldValue('DELAY');
  
  // Add the theaterChase function
  generator.addFunction('void theaterChase(uint32_t color, int wait)', 
  'void theaterChase(uint32_t color, int wait) {\n' +
  '  for(int a=0; a<10; a++) {\n' +
  '    for(int b=0; b<3; b++) {\n' +
  '      strip.clear();\n' +
  '      for(int c=b; c<strip.numPixels(); c += 3) {\n' +
  '        strip.setPixelColor(c, color);\n' +
  '      }\n' +
  '      strip.show();\n' +
  '      delay(wait);\n' +
  '    }\n' +
  '  }\n' +
  '}\n');
  
  return 'theaterChase(strip.Color(' + red + ', ' + green + ', ' + blue + '), ' + delay + ');\n';
};

Arduino.forBlock['neopixel_theater_chase_rainbow'] = function(block, generator) {
  var delay = block.getFieldValue('DELAY');
  
  // Add the Wheel function
  generator.addFunction('uint32_t Wheel(byte WheelPos)', 
  'uint32_t Wheel(byte WheelPos) {\n' +
  '  WheelPos = 255 - WheelPos;\n' +
  '  if(WheelPos < 85) {\n' +
  '    return strip.Color(255 - WheelPos * 3, 0, WheelPos * 3);\n' +
  '  }\n' +
  '  if(WheelPos < 170) {\n' +
  '    WheelPos -= 85;\n' +
  '    return strip.Color(0, WheelPos * 3, 255 - WheelPos * 3);\n' +
  '  }\n' +
  '  WheelPos -= 170;\n' +
  '  return strip.Color(WheelPos * 3, 255 - WheelPos * 3, 0);\n' +
  '}\n');
  
  // Add the theaterChaseRainbow function
  generator.addFunction('void theaterChaseRainbow(int wait)', 
  'void theaterChaseRainbow(int wait) {\n' +
  '  int firstPixelHue = 0;\n' +
  '  for(int a=0; a<30; a++) {\n' +
  '    for(int b=0; b<3; b++) {\n' +
  '      strip.clear();\n' +
  '      for(int c=b; c<strip.numPixels(); c += 3) {\n' +
  '        int hue = firstPixelHue + c * 65536L / strip.numPixels();\n' +
  '        uint32_t color = strip.gamma32(strip.ColorHSV(hue));\n' +
  '        strip.setPixelColor(c, color);\n' +
  '      }\n' +
  '      strip.show();\n' +
  '      delay(wait);\n' +
  '      firstPixelHue += 65536 / 90;\n' +
  '    }\n' +
  '  }\n' +
  '}\n');
  
  return 'theaterChaseRainbow(' + delay + ');\n';
};