// LCD I2C display library generator

// 添加一个标志变量，用于跟踪LCD是否已初始化
Arduino.lcdI2CInitialized = false;

// 自动初始化LCD的辅助函数
Arduino.ensureLcdInitialized = function (generator) {
  // console.log('ensureLcdInitialized', Arduino.lcdI2CInitialized);

  if (!Arduino.lcdI2CInitialized) {
    // 设置默认值
    var defaultAddress = '0x27';
    var defaultCols = '16';
    var defaultRows = '2';

    generator.addLibrary('LCD_I2C', '#include <LiquidCrystal_I2C.h>');
    generator.addVariable('lcd_i2c', 'LiquidCrystal_I2C lcd(' + defaultAddress + ', ' + defaultCols + ', ' + defaultRows + ');');

    // 添加初始化代码到setup部分
    generator.addSetupBegin('lcd_init', 'lcd.init();\n  lcd.backlight();');

    // 标记为已初始化
    // Arduino.lcdI2CInitialized = true;
    return true;
  }
  return false;
};

// LCD initialize
Arduino.forBlock['lcd_i2c_init'] = function (block, generator) {
  var address = block.getFieldValue("ADDRESS") || '0x27';
  var cols = block.getFieldValue("COLS") || '16';
  var rows = block.getFieldValue("ROWS") || '2';

  generator.addLibrary('LCD_I2C', '#include <LiquidCrystal_I2C.h>');
  generator.addVariable('lcd_i2c', 'LiquidCrystal_I2C lcd(' + address + ', ' + cols + ', ' + rows + ');');

  var code = 'lcd.init();\n';
  code += 'lcd.backlight();\n';

  // 标记为已初始化
  Arduino.lcdI2CInitialized = true;

  return code;
};

// LCD clear display
Arduino.forBlock['lcd_i2c_clear'] = function (block, generator) {
  // 确保LCD已初始化
  Arduino.ensureLcdInitialized(generator);
  return 'lcd.clear();\n';
};

// LCD set cursor position
Arduino.forBlock['lcd_i2c_set_cursor'] = function (block, generator) {
  // 确保LCD已初始化
  Arduino.ensureLcdInitialized(generator);
  var col = generator.valueToCode(block, 'COL', generator.ORDER_ATOMIC) || '0';
  var row = generator.valueToCode(block, 'ROW', generator.ORDER_ATOMIC) || '0';

  return 'lcd.setCursor(' + col + ', ' + row + ');\n';
};

// LCD print text at current cursor position
Arduino.forBlock['lcd_i2c_print'] = function (block, generator) {
  // 确保LCD已初始化
  Arduino.ensureLcdInitialized(generator);
  // 获取连接到TEXT输入的块
  var textBlock = block.getInputTargetBlock('TEXT');

  // 判断连接的块是否为自定义字符块
  if (textBlock && textBlock.type === 'lcd_i2c_custom_char') {
    // 这是一个自定义字符，需要使用write而不是print
    var charIndex = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC);
    return `lcd.write(${charIndex});\n`;
  } else {
    // 正常的文本打印
    var text = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC) || '""';
    return 'lcd.print(' + text + ');\n';
  }
};

// LCD print text at specified position (combined set cursor and print)
Arduino.forBlock['lcd_i2c_print_position'] = function (block, generator) {
  // 确保LCD已初始化
  Arduino.ensureLcdInitialized(generator);
  var col = generator.valueToCode(block, 'COL', generator.ORDER_ATOMIC) || '0';
  var row = generator.valueToCode(block, 'ROW', generator.ORDER_ATOMIC) || '0';
  
  // 首先设置光标位置
  var code = 'lcd.setCursor(' + col + ', ' + row + ');\n';
  
  // 获取连接到TEXT输入的块
  var textBlock = block.getInputTargetBlock('TEXT');
  
  // 判断连接的块是否为自定义字符块
  if (textBlock && textBlock.type === 'lcd_i2c_custom_char') {
    // 这是一个自定义字符，需要使用write而不是print
    var charIndex = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC);
    code += `lcd.write(${charIndex});\n`;
  } else {
    // 正常的文本打印
    var text = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC) || '""';
    code += 'lcd.print(' + text + ');\n';
  }
  
  return code;
};

// LCD turn backlight on
Arduino.forBlock['lcd_i2c_backlight_on'] = function (block, generator) {
  // 确保LCD已初始化
  Arduino.ensureLcdInitialized(generator);
  return 'lcd.backlight();\n';
};

// LCD turn backlight off
Arduino.forBlock['lcd_i2c_backlight_off'] = function (block, generator) {
  // 确保LCD已初始化
  Arduino.ensureLcdInitialized(generator);
  return 'lcd.noBacklight();\n';
};

Arduino.forBlock['lcd_i2c_custom_char'] = function (block, generator) {
  // 获取字符位图数据和存储位置
  var bitmapData = block.getFieldValue('CUSTOM_CHAR');
  var charIndex = block.getFieldValue('CHAR_INDEX');

  try {
    // 将字符位图数据转换为二进制格式的LCD字符数组
    var customCharData = [];

    for (var row = 0; row < 8; row++) {
      var binaryString = '0b000';

      // 对于二维数组格式
      if (Array.isArray(bitmapData) && Array.isArray(bitmapData[0])) {
        for (var col = 0; col < 5; col++) {
          binaryString += bitmapData[row][col];
        }
      }
      // 对于一维数组格式（保留兼容性）
      else if (typeof bitmapData === 'string') {
        for (var col = 0; col < 5; col++) {
          var bit = bitmapData[row * 5 + col] === '1' ? 1 : 0;
          binaryString += bit;
        }
      }

      customCharData.push(binaryString);
    }

    // 生成创建和显示自定义字符的代码
    var charName = 'custom_char_' + charIndex;
    var charArrayName = charName + '_data';

    generator.addVariable(charArrayName, 'byte ' + charArrayName + '[8] = {\n  ' +
      customCharData.join(',\n  ') + '\n};');
    generator.addSetupBegin(charName, 'lcd.createChar(' + charIndex + ', ' + charArrayName + ');');

    return [charIndex, generator.ORDER_ATOMIC];
  } catch (e) {
    console.error('Error processing bitmap data:', e);
    return ['0', generator.ORDER_ATOMIC]; // 返回默认值
  }
};