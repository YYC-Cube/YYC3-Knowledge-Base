Arduino.forBlock['mqtt_begin'] = function(block, generator) {
  // 添加必要的库
  generator.addLibrary('MQTT_INCLUDE', '#include <ArduinoMqttClient.h>');
  
  // 添加网络相关库
  generator.addLibrary('WIFI_INCLUDE', '#include <WiFiNINA.h>');
  
  // 添加MQTT客户端对象
  generator.addObject('MQTT_CLIENT', 'WiFiClient wifiClient;\nMqttClient mqttClient(wifiClient);');
  
  // 获取参数
  var broker = generator.valueToCode(block, 'BROKER', Arduino.ORDER_ATOMIC) || '"mqtt.example.com"';
  var port = generator.valueToCode(block, 'PORT', Arduino.ORDER_ATOMIC) || '1883';
  var username = generator.valueToCode(block, 'USERNAME', Arduino.ORDER_ATOMIC) || '""';
  var password = generator.valueToCode(block, 'PASSWORD', Arduino.ORDER_ATOMIC) || '""';
  
  // 生成代码
  var code = '';
  code += 'if (' + username + ' != "") mqttClient.setUsernamePassword(' + username + ', ' + password + ');\n';
  code += 'if (!mqttClient.connect(' + broker + ', ' + port + ')) {\n';
  code += '  Serial.print("MQTT连接失败! 错误码 = ");\n';
  code += '  Serial.println(mqttClient.connectError());\n';
  code += '}\n';
  
  return code;
};

Arduino.forBlock['mqtt_connected'] = function(block, generator) {
  return ['mqttClient.connected()', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['mqtt_poll'] = function(block, generator) {
  return 'mqttClient.poll();\n';
};

Arduino.forBlock['mqtt_subscribe'] = function(block, generator) {
  var topic = generator.valueToCode(block, 'TOPIC', Arduino.ORDER_ATOMIC) || '"topic"';
  return 'mqttClient.subscribe(' + topic + ');\n';
};

Arduino.forBlock['mqtt_publish'] = function(block, generator) {
  var message = generator.valueToCode(block, 'MESSAGE', Arduino.ORDER_ATOMIC) || '""';
  var topic = generator.valueToCode(block, 'TOPIC', Arduino.ORDER_ATOMIC) || '"topic"';
  
  var code = 'mqttClient.beginMessage(' + topic + ');\n';
  code += 'mqttClient.print(' + message + ');\n';
  code += 'mqttClient.endMessage();\n';
  
  return code;
};

Arduino.forBlock['mqtt_message_available'] = function(block, generator) {
  return ['mqttClient.parseMessage()', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['mqtt_read_topic'] = function(block, generator) {
  return ['mqttClient.messageTopic()', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['mqtt_read_message'] = function(block, generator) {
  // 添加函数来读取消息
  generator.addFunction('MQTT_READ_MESSAGE', 
    'String readMqttMessage() {\n' +
    '  String message = "";\n' +
    '  while (mqttClient.available()) {\n' +
    '    message += (char)mqttClient.read();\n' +
    '  }\n' +
    '  return message;\n' +
    '}'
  );
  
  return ['readMqttMessage()', Arduino.ORDER_ATOMIC];
};