Arduino.forBlock['four_driver_init'] = function (block, generator) {
    // 添加必要的库引用和对象创建
    generator.addLibrary('#include "seekfree_can.h"', '#include "seekfree_can.h"');
    generator.addLibrary('#include "seekfree_four_driver.h"', '#include "seekfree_four_driver.h"');
    generator.addLibrary('#include "seekfree_key_gpio.h"', '#include "seekfree_key_gpio.h"');
	
    generator.addObject('ESP32C3_CAN esp32c3_can', 'ESP32C3_CAN esp32c3_can;');
    generator.addObject('FOUR_DRIVER four_driver', 'FOUR_DRIVER four_driver;');
	
	ensureSerialBegin("Serial", generator);
	
	const power_index = block.getFieldValue('power_index');
	// 添加初始化代码到setup部分
    generator.addSetup('esp32c3_can.begin()', 'esp32c3_can.begin();');
    generator.addSetup('four_driver.begin()', 'four_driver.begin();');
	
    return '';
};

Arduino.forBlock['four_driver_set_speed'] = function (block, generator) {
	var speed1 = generator.valueToCode(block, 'speed1', generator.ORDER_ATOMIC) || '0';
	var speed2 = generator.valueToCode(block, 'speed2', generator.ORDER_ATOMIC) || '0';
	var speed3 = generator.valueToCode(block, 'speed3', generator.ORDER_ATOMIC) || '0';
	var speed4 = generator.valueToCode(block, 'speed4', generator.ORDER_ATOMIC) || '0';
	
    // 生成函数调用代码
	var code = 'four_driver.set_speed(1, 0, ' + speed1 + ');\n four_driver.set_speed(1, 1, ' + speed2 + ');\n four_driver.set_speed(1, 2, ' + speed3 + ');\n four_driver.set_speed(1, 3, ' + speed4 + ');\n';// four_driver.set_speed_ready(1);\n
    return code;
};

Arduino.forBlock['four_driver_move'] = function (block, generator) {
    const direction = block.getFieldValue('DIRECTION');
	var speed = generator.valueToCode(block, 'SPEED', Arduino.ORDER_ATOMIC);
    var distance = generator.valueToCode(block, 'DISTANCE', Arduino.ORDER_ATOMIC);

    // 生成函数调用代码
    return `four_driver.move(${direction}, ${speed}, ${distance});\n`;
};

Arduino.forBlock['four_driver_keep_move'] = function (block, generator) {
    const direction = block.getFieldValue('DIRECTION');
	var speed = generator.valueToCode(block, 'SPEED', Arduino.ORDER_ATOMIC);

    // 生成函数调用代码
    return `four_driver.keep_move(${direction}, ${speed});\n`;
};

Arduino.forBlock['four_driver_turn'] = function (block, generator) {
	const direction = block.getFieldValue('DIRECTION');
	var angle = generator.valueToCode(block, 'ANGLE', Arduino.ORDER_ATOMIC);
    var speed = generator.valueToCode(block, 'SPEED', Arduino.ORDER_ATOMIC);
	
	// 生成函数调用代码
	return `four_driver.turn(${direction} * ${angle} * 10, ${speed});\n`;
};

Arduino.forBlock['four_driver_track'] = function (block, generator) {
	var coord_x = generator.valueToCode(block, 'coord_x', Arduino.ORDER_ATOMIC);
    var coord_y = generator.valueToCode(block, 'coord_y', Arduino.ORDER_ATOMIC);

	// 生成函数调用代码
    var code = 'four_driver.track(' + coord_x + ', ' + coord_y + ')';
    
    // 返回数组包含代码和运算符优先级
    return [code, Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['four_driver_calibration_gyro'] = function (block, generator) {
	
	var code = 'four_driver.calibration_gyro();\n';
	return code;
};

Arduino.forBlock['four_driver_calibration_head'] = function (block, generator) {
	var angle = generator.valueToCode(block, 'ANGLE', Arduino.ORDER_ATOMIC);
	return `four_driver.calibration_head(${angle});\n`;
};

Arduino.forBlock['beep_begin'] = function (block, generator) {
    // 添加初始化代码到setup部分
    generator.addSetup('pinMode(21, OUTPUT)', 'pinMode(21, OUTPUT);');
    generator.addSetup('digitalWrite(21, HIGH)', 'digitalWrite(21, HIGH);');

    return '';
};

Arduino.forBlock['beep_set'] = function (block, generator) {
    // 添加初始化代码到setup部分
	var state = block.getFieldValue('STATE');
	
	return `digitalWrite(21, ${state});\n`;
};


Arduino.forBlock['led_begin'] = function (block, generator) {
    // 添加初始化代码到setup部分
    generator.addSetup('pinMode(35, OUTPUT)', 'pinMode(35, OUTPUT);');
    generator.addSetup('pinMode(36, OUTPUT)', 'pinMode(36, OUTPUT);');
    generator.addSetup('pinMode(37, OUTPUT)', 'pinMode(37, OUTPUT);');
    generator.addSetup('digitalWrite(35, LOW)', 'digitalWrite(35, HIGH);');
    generator.addSetup('digitalWrite(36, LOW)', 'digitalWrite(36, HIGH);');
    generator.addSetup('digitalWrite(37, LOW)', 'digitalWrite(37, HIGH);');

    return '';
};

Arduino.forBlock['led_set'] = function (block, generator) {
    // 添加初始化代码到setup部分
	
	var pin = block.getFieldValue('PIN');
	var state = block.getFieldValue('STATE');
	
	return `digitalWrite(${pin}, ${state});\n`;
};

Arduino.forBlock['key_gpio_begin'] = function (block, generator) {
    // 添加ADC按键库引用
    generator.addLibrary('#include "seekfree_key_gpio.h"', '#include "seekfree_key_gpio.h"');
    // 创建ADC按键对象
    generator.addObject('KEY_GPIO key_gpio', 'KEY_GPIO key_gpio;');
    // 添加初始化代码到setup部分
    generator.addSetup('key_gpio.begin()', 'key_gpio.begin();');

    return '';
};

Arduino.forBlock['key_gpio_read'] = function (block, generator) {
    var key_id = block.getFieldValue('KEY_ID');
	var state = block.getFieldValue('STATE');
	
    // 添加ADC按键库引用和对象（如果尚未添加）
    generator.addLibrary('#include "seekfree_key_gpio.h"', '#include "seekfree_key_gpio.h"');
    generator.addObject('KEY_GPIO key_gpio', 'KEY_GPIO key_gpio;');

	return ['key_gpio.read_state(' + key_id + ', ' + state + ')', Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['photoelectricity_init'] = function (block, generator) {
    generator.addLibrary('#include "seekfree_can.h"', '#include "seekfree_can.h"');
    generator.addLibrary('#include "seekfree_photoelectricity.h"', '#include "seekfree_photoelectricity.h"');
	
    generator.addObject('ESP32C3_CAN esp32c3_can', 'ESP32C3_CAN esp32c3_can;');
    generator.addObject('PHOTOELECTRICITY location', 'PHOTOELECTRICITY location;');
	
	
	const power_index = block.getFieldValue('power_index');
	
    generator.addSetup('esp32c3_can.begin()', 'esp32c3_can.begin();');
    generator.addSetup('location.begin(' + power_index + ')', 'location.begin(' + power_index + ');');

    return '';
};

Arduino.forBlock['photoelectricity_set_black'] = function (block, generator) {
	var device_id = block.getFieldValue('DEVICE_ID');
	var code = 'location.set_black(' + device_id + ');\n';
    return code;
};

Arduino.forBlock['photoelectricity_set_white'] = function (block, generator) {
	var device_id = block.getFieldValue('DEVICE_ID');
	var code = 'location.set_white(' + device_id + ');\n';
    return code;
};

Arduino.forBlock['photoelectricity_get_position'] = function (block, generator) {
    var device_id = block.getFieldValue('DEVICE_ID');

	generator.addVariable('int16_t photoelectricity_position', 'int16_t photoelectricity_position;');
	
	var code = '';
	code = '(location.get_position(' + device_id + ', photoelectricity_position) == 0 ? photoelectricity_position : 0)';

    return [code, Arduino.ORDER_CONDITIONAL];
};

Arduino.forBlock['photoelectricity_get_value'] = function (block, generator) {
    var device_id = block.getFieldValue('DEVICE_ID');
	var channel = block.getFieldValue('CHANNEL');

	generator.addVariable('int16_t photoelectricity_value', 'int16_t photoelectricity_value;');
	
	var code = '';
	code = '(location.get_value(' + device_id + ', ' + channel + ', ' + 'photoelectricity_value) == 0 ? photoelectricity_value : 0)';

    return [code, Arduino.ORDER_CONDITIONAL];
};

Arduino.forBlock['photoelectricity_get_value_bin'] = function (block, generator) {
    var device_id = block.getFieldValue('DEVICE_ID');
	var channel = block.getFieldValue('CHANNEL');

	generator.addVariable('uint8_t photoelectricity_value_bin', 'uint8_t photoelectricity_value_bin;');
	var code = '';
	code = '(location.get_value_bin(' + device_id + ', ' + channel + ', ' + 'photoelectricity_value_bin) == 0 ? photoelectricity_value_bin : 0)';

    return [code, Arduino.ORDER_CONDITIONAL];
};

Arduino.forBlock['photoelectricity_get_black_num'] = function (block, generator) {
    var device_id = block.getFieldValue('DEVICE_ID');
	var channel = block.getFieldValue('CHANNEL');

	generator.addVariable('uint8_t black_num', 'uint8_t black_num;');
	var code = '';
	code = '(location.get_black_num(' + device_id + ', ' + 'black_num) == 0 ? black_num : 0)';

    return [code, Arduino.ORDER_CONDITIONAL];
};

Arduino.forBlock['photoelectricity_get_white_num'] = function (block, generator) {
    var device_id = block.getFieldValue('DEVICE_ID');
	var channel = block.getFieldValue('CHANNEL');

	generator.addVariable('uint8_t white_num', 'uint8_t white_num;');
	var code = '';
	code = '(location.get_white_num(' + device_id + ', ' + 'white_num) == 0 ? white_num : 0)';

    return [code, Arduino.ORDER_CONDITIONAL];
};


Arduino.forBlock['openart_mini_begin'] = function (block, generator) {
    // 添加ADC按键库引用
    generator.addLibrary('#include "seekfree_openart_mini.h"', '#include "seekfree_openart_mini.h"');
    // 创建ADC按键对象
    generator.addObject('OPENART_MINI openart_mini', 'OPENART_MINI openart_mini;');
    // 添加初始化代码到setup部分
    generator.addSetup('openart_mini.begin()', 'openart_mini.begin();');

    return '';
};

Arduino.forBlock['openart_mini_detection_object_easy'] = function (block, generator) {
	var type = block.getFieldValue('VALUE');
	
    // 添加ADC按键库引用和对象（如果尚未添加）
    generator.addLibrary('#include "seekfree_openart_mini.h"', '#include "seekfree_openart_mini.h"');
    generator.addObject('OPENART_MINI openart_mini', 'OPENART_MINI openart_mini;');
	
	var code = 'openart_mini.detection_object_easy(' + type + ');\n';
	return code;
};

Arduino.forBlock['openart_mini_detection_object'] = function (block, generator) {
	var l_min = generator.valueToCode(block, 'L_MIN', Arduino.ORDER_ATOMIC);
	var l_max = generator.valueToCode(block, 'L_MAX', Arduino.ORDER_ATOMIC);
	var a_min = generator.valueToCode(block, 'A_MIN', Arduino.ORDER_ATOMIC);
	var a_max = generator.valueToCode(block, 'A_MAX', Arduino.ORDER_ATOMIC);
	var b_min = generator.valueToCode(block, 'B_MIN', Arduino.ORDER_ATOMIC);
	var b_max = generator.valueToCode(block, 'B_MAX', Arduino.ORDER_ATOMIC);
	
    // 添加ADC按键库引用和对象（如果尚未添加）
    generator.addLibrary('#include "seekfree_openart_mini.h"', '#include "seekfree_openart_mini.h"');
    generator.addObject('OPENART_MINI openart_mini', 'OPENART_MINI openart_mini;');
	
	var code = 'openart_mini.detection_object(' + l_min + ', ' + l_max + ', ' + a_min + ', ' + a_max + ', ' + b_min + ', ' + b_max + ');\n';
	return code;
};

Arduino.forBlock['openart_mini_detection_apriltag'] = function (block, generator) {
    // 添加ADC按键库引用和对象（如果尚未添加）
    generator.addLibrary('#include "seekfree_openart_mini.h"', '#include "seekfree_openart_mini.h"');
    generator.addObject('OPENART_MINI openart_mini', 'OPENART_MINI openart_mini;');
	
	var code = 'openart_mini.detection_apriltag();\n';
	return code;
};

Arduino.forBlock['openart_mini_detection_stop'] = function (block, generator) {
    // 添加ADC按键库引用和对象（如果尚未添加）
    generator.addLibrary('#include "seekfree_openart_mini.h"', '#include "seekfree_openart_mini.h"');
    generator.addObject('OPENART_MINI openart_mini', 'OPENART_MINI openart_mini;');
	
	var code = 'openart_mini.detection_stop();\n';
	return code;
};

Arduino.forBlock['openart_mini_get_result'] = function (block, generator) {
    var type = block.getFieldValue('TYPE');
	
    // 添加ADC按键库引用和对象（如果尚未添加）
    generator.addLibrary('#include "seekfree_openart_mini.h"', '#include "seekfree_openart_mini.h"');
    generator.addObject('OPENART_MINI openart_mini', 'OPENART_MINI openart_mini;');

	return ['openart_mini.get_result(' + type + ')', Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['openart_mini_get_coord_x'] = function (block, generator) {
    var type = block.getFieldValue('TYPE');
	
    // 添加ADC按键库引用和对象（如果尚未添加）
    generator.addLibrary('#include "seekfree_openart_mini.h"', '#include "seekfree_openart_mini.h"');
    generator.addObject('OPENART_MINI openart_mini', 'OPENART_MINI openart_mini;');

	return ['openart_mini.get_coord_x(' + type + ')', Arduino.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['openart_mini_get_coord_y'] = function (block, generator) {
    var type = block.getFieldValue('TYPE');
	
    // 添加ADC按键库引用和对象（如果尚未添加）
    generator.addLibrary('#include "seekfree_openart_mini.h"', '#include "seekfree_openart_mini.h"');
    generator.addObject('OPENART_MINI openart_mini', 'OPENART_MINI openart_mini;');

	return ['openart_mini.get_coord_y(' + type + ')', Arduino.ORDER_FUNCTION_CALL];
};
Arduino.forBlock['robotic_arm_init'] = function (block, generator) {
    // 添加必要的库引用和对象创建
    generator.addLibrary('#include "seekfree_can.h"', '#include "seekfree_can.h"');
    generator.addLibrary('#include "seekfree_robotic_arm.h"', '#include "seekfree_robotic_arm.h"');
	
    generator.addObject('ESP32C3_CAN esp32c3_can', 'ESP32C3_CAN esp32c3_can;');
    generator.addObject('DOUBLE_ROBOTIC_ARM robot_arm', 'DOUBLE_ROBOTIC_ARM robot_arm;');
	
	ensureSerialBegin("Serial", generator);
	
	const power_index = block.getFieldValue('power_index');
	// 添加初始化代码到setup部分
    generator.addSetup('esp32c3_can.begin()', 'esp32c3_can.begin();');
    generator.addSetup('robot_arm.begin()', 'robot_arm.begin();');
	
    return '';
};
Arduino.forBlock['robotic_arm_set_servo_motor_angle'] = function (block, generator) {
    const channel = block.getFieldValue('channel');
	var angle = generator.valueToCode(block, 'angle', Arduino.ORDER_ATOMIC);

    // 生成函数调用代码
    return `robot_arm.set_servo_motor_angle(1, ${channel}, ${angle} * 10);\n`;
};

Arduino.forBlock['robotic_arm_set_servo_motor_offset_angle'] = function (block, generator) {
    const channel = block.getFieldValue('channel');
	var angle = generator.valueToCode(block, 'angle', Arduino.ORDER_ATOMIC);

    // 生成函数调用代码
    return `robot_arm.set_servo_motor_offset_angle(1, ${channel}, ${angle} * 10);\n`;
};

Arduino.forBlock['robotic_arm_get_servo_motor_angle'] = function (block, generator) {
    var channel = block.getFieldValue('channel');

    generator.addVariable('uint16_t angle', 'uint16_t angle');

    var code = '';
	code = '(robot_arm.get_servo_motor_angle(1, channel, angle) == 0 ? angle / 10.0f : 0)';

    return [code, Arduino.ORDER_CONDITIONAL];
};