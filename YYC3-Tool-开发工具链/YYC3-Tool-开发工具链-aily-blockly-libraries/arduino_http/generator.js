Arduino.forBlock['wifi_connect'] = function(block, generator) {
  var ssid = block.getFieldValue('SSID');
  var pass = block.getFieldValue('PASS');
  generator.addLibrary('#include <WiFi101.h>', '#include <WiFi101.h>');
  return 'WiFi.begin("' + ssid + '", "' + pass + '");\n';
};

Arduino.forBlock['wifi_ssid'] = function(block, generator) {
  // 返回当前连接的WiFi网络名称
  return ['WiFi.SSID()', generator.ORDER_NONE];
};

Arduino.forBlock['wifi_localip'] = function(block, generator) {
  // 返回设备的本地IP地址
  return ['WiFi.localIP()', generator.ORDER_NONE];
};

Arduino.forBlock['http_get'] = function(block, generator) {
  var url = block.getFieldValue('URL');
  generator.addLibrary('#include <ArduinoHttpClient.h>', '#include <ArduinoHttpClient.h>');
  // 注意：需要在代码其他部分创建WiFiClient对象，例如：WiFiClient wifiClient;
  // 同时需要根据目标主机和端口创建HttpClient对象，例如：HttpClient client(wifiClient, host, port);
  var code = 'client.beginRequest();\n';
  code += 'client.get("' + url + '");\n';
  code += 'client.endRequest();\n';
  return code;
};

Arduino.forBlock['http_post'] = function(block, generator) {
  var url = block.getFieldValue('URL');
  var contentType = block.getFieldValue('TYPE');
  var postData = block.getFieldValue('DATA');
  generator.addLibrary('#include <ArduinoHttpClient.h>', '#include <ArduinoHttpClient.h>');
  // 注意：需要在代码其他部分创建WiFiClient对象及HttpClient对象
  var code = 'client.beginRequest();\n';
  code += 'client.post("' + url + '", "' + contentType + '", "' + postData + '");\n';
  code += 'client.endRequest();\n';
  return code;
};

Arduino.forBlock['analog_read'] = function(block, generator) {
  var pin = block.getFieldValue('PIN');
  var code = 'analogRead(' + pin + ')';
  return [code, generator.ORDER_ATOMIC];
};

// 合并的附加代码
// 为wifi_connect块生成代码：连接WiFi
Arduino.forBlock['wifi_connect'] = function(block, generator) {
  // 添加必要的库引用
  generator.addLibrary('#include <WiFi101.h>', '#include <WiFi101.h>');
  // 生成WiFi.begin代码，等待WiFi连接成功后打印提示信息
  var ssid = generator.valueToCode(block, 'SSID', generator.ORDER_NONE) || '"Your_SSID"';
  var pass = generator.valueToCode(block, 'PASS', generator.ORDER_NONE) || '"Your_PASSWORD"';
  var setupCode = 'WiFi.begin(' + ssid + ', ' + pass + ');\n' +
                  'while (WiFi.status() != WL_CONNECTED) {\n' +
                  '  delay(500);\n' +
                  '}\n' +
                  'Serial.println("WiFi Connected");';
  generator.addSetupBegin('wifi_connect_setup', setupCode);
  return '';
};

// 为http_get块生成代码：发送HTTP GET请求并打印返回数据
Arduino.forBlock['http_get'] = function(block, generator) {
  // 添加HTTP和网络客户端所需的库及变量
  generator.addLibrary('#include <ArduinoHttpClient.h>', '#include <ArduinoHttpClient.h>');
  generator.addLibrary('#include <WiFi101.h>', '#include <WiFi101.h>');
  generator.addVariable('WiFiClient client', 'WiFiClient client');
  // 注意：此处构造HttpClient需要服务器地址和端口号。为简化，假设传入的URL为完整路径，则需要用户自己处理主机和端口解析。
  // 此处仅生成请求代码片段，实际应用中建议使用URLParser类进一步解析URL。
  var url = generator.valueToCode(block, 'URL', generator.ORDER_NONE) || '"http://example.com/resource"';
  var code = '/* HTTP GET 请求 */\n' +
             '/* 注意: 请确保已正确配置HttpClient的服务器地址和端口 */\n' +
             'HttpClient http(client, "your.server.com", 80);\n' +
             'http.beginRequest();\n' +
             'http.get(' + url + ');\n' +
             'http.endRequest();\n' +
             'int statusCode = http.responseStatusCode();\n' +
             'String response = http.responseBody();\n' +
             'Serial.println(response);\n';
  return code;
};

// 为http_post块生成代码：发送HTTP POST请求并打印返回数据
Arduino.forBlock['http_post'] = function(block, generator) {
  // 添加HTTP和网络客户端所需的库及变量（如果未添加则会自动去重）
  generator.addLibrary('#include <ArduinoHttpClient.h>', '#include <ArduinoHttpClient.h>');
  generator.addLibrary('#include <WiFi101.h>', '#include <WiFi101.h>');
  generator.addVariable('WiFiClient client', 'WiFiClient client');
  var url = generator.valueToCode(block, 'URL', generator.ORDER_NONE) || '"http://example.com/resource"';
  var contentType = generator.valueToCode(block, 'CONTENTTYPE', generator.ORDER_NONE) || '"text/plain"';
  var data = generator.valueToCode(block, 'DATA', generator.ORDER_NONE) || '"data"';
  var code = '/* HTTP POST 请求 */\n' +
             '/* 注意: 请确保已正确配置HttpClient的服务器地址和端口 */\n' +
             'HttpClient http(client, "your.server.com", 80);\n' +
             'http.beginRequest();\n' +
             'http.post(' + url + ', ' + contentType + ', ' + data + ');\n' +
             'http.endRequest();\n' +
             'int statusCode = http.responseStatusCode();\n' +
             'String response = http.responseBody();\n' +
             'Serial.println(response);\n';
  return code;
};