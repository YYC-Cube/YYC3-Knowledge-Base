Arduino.forBlock['esp32_can_init'] = function (block, generator) {
  const rxPin = block.getFieldValue('RX_PIN');
  const txPin = block.getFieldValue('TX_PIN');
  const mode = block.getFieldValue('MODE');
  const speed = block.getFieldValue('SPEED');

  // 添加必要的库
  generator.addLibrary('#include "driver/twai.h"', '#include "driver/twai.h"');

  // 添加全局变量
  generator.addMacro('// Pins used to connect to CAN bus transceiver:', '// Pins used to connect to CAN bus transceiver:');
  generator.addMacro(`#define RX_PIN ${rxPin}`, `#define RX_PIN ${rxPin}`);
  generator.addMacro(`#define TX_PIN ${txPin}`, `#define TX_PIN ${txPin}`);
  generator.addVariable('static bool driver_installed = false;', 'static bool driver_installed = false;');

  // 在setup中添加初始化代码
  const code = `
  // Initialize configuration structures using macro initializers
  twai_general_config_t g_config = TWAI_GENERAL_CONFIG_DEFAULT((gpio_num_t)TX_PIN, (gpio_num_t)RX_PIN, ${mode});
  twai_timing_config_t t_config = ${speed};
  twai_filter_config_t f_config = TWAI_FILTER_CONFIG_ACCEPT_ALL();

  // Install TWAI driver
  if (twai_driver_install(&g_config, &t_config, &f_config) == ESP_OK) {
    driver_installed = true;
  } else {
    return;
  }

  // Start TWAI driver
  if (twai_start() != ESP_OK) {
    return;
  }
`;
  return code;
};

Arduino.forBlock['esp32_can_configure_alerts'] = function (block, generator) {
  const rx_data = block.getFieldValue('RX_DATA') === 'TRUE';
  const tx_idle = block.getFieldValue('TX_IDLE') === 'TRUE';
  const tx_success = block.getFieldValue('TX_SUCCESS') === 'TRUE';
  const tx_failed = block.getFieldValue('TX_FAILED') === 'TRUE';
  const err_pass = block.getFieldValue('ERR_PASS') === 'TRUE';
  const bus_error = block.getFieldValue('BUS_ERROR') === 'TRUE';
  const rx_queue_full = block.getFieldValue('RX_QUEUE_FULL') === 'TRUE';

  let alertsCode = [];
  if (rx_data) alertsCode.push('TWAI_ALERT_RX_DATA');
  if (tx_idle) alertsCode.push('TWAI_ALERT_TX_IDLE');
  if (tx_success) alertsCode.push('TWAI_ALERT_TX_SUCCESS');
  if (tx_failed) alertsCode.push('TWAI_ALERT_TX_FAILED');
  if (err_pass) alertsCode.push('TWAI_ALERT_ERR_PASS');
  if (bus_error) alertsCode.push('TWAI_ALERT_BUS_ERROR');
  if (rx_queue_full) alertsCode.push('TWAI_ALERT_RX_QUEUE_FULL');

  let alertsString = alertsCode.join(' | ');
  if (alertsCode.length === 0) {
    alertsString = '0';  // 如果没有选择任何警报
  }

  // 在setup中添加警报配置代码
  const code = `
  // Reconfigure alerts
  uint32_t alerts_to_enable = ${alertsString};
  twai_reconfigure_alerts(alerts_to_enable, NULL);
`;
  return code;
};

Arduino.forBlock['esp32_can_send_message'] = function (block, generator) {
  const id = block.getFieldValue('ID');
  const length = block.getFieldValue('LENGTH');
  const data = block.getFieldValue('DATA');

  // 添加相关函数
  generator.addFunction('send_can_message', `
static void send_can_message(uint32_t id, uint8_t length, const uint8_t* data) {
  if (!driver_installed) {
    return;
  }
  
  // Configure message to transmit
  twai_message_t message;
  message.identifier = id;
  message.data_length_code = length;
  message.extd = 0;  // Standard frame format
  message.rtr = 0;   // Not a remote transmission request
  
  for (int i = 0; i < length; i++) {
    message.data[i] = data[i];
  }

  // Queue message for transmission
  twai_transmit(&message, pdMS_TO_TICKS(1000));
}
`);

  // 返回实际代码
  return `{
  // Parse data string into array
  String dataStr = "${data}";
  uint8_t dataArray[8] = {0};
  int dataIdx = 0;
  
  int commaIndex;
  while ((commaIndex = dataStr.indexOf(',')) != -1) {
    dataArray[dataIdx++] = dataStr.substring(0, commaIndex).toInt();
    dataStr = dataStr.substring(commaIndex + 1);
    if (dataIdx >= 8) break;
  }
  if (dataStr.length() > 0 && dataIdx < 8) {
    dataArray[dataIdx] = dataStr.toInt();
  }
  
  send_can_message(${id}, ${length}, dataArray);
}\n`;
};

Arduino.forBlock['esp32_can_receive_message'] = function (block, generator) {
  // 添加处理接收消息的函数
  generator.addFunction('handle_rx_message', `
static void handle_rx_message(twai_message_t &message) {
  // Store the message for later use
  memcpy(&last_received_message, &message, sizeof(twai_message_t));
  new_message_available = true;
}
`);

  // 定义全局变量来存储最新消息
  generator.addVariable('twai_message_t last_received_message;', 'twai_message_t last_received_message;');
  generator.addVariable('bool new_message_available = false;', 'bool new_message_available = false;');

  return `{
  // Check if message is received
  twai_message_t message;
  if (twai_receive(&message, 0) == ESP_OK) {
    handle_rx_message(message);
  }
}\n`;
};

Arduino.forBlock['esp32_can_check_alerts'] = function (block, generator) {
  // 定义用于存储警报状态的全局变量
  generator.addVariable('uint32_t alerts_triggered = 0;', 'uint32_t alerts_triggered = 0;');
  generator.addMacro('#define POLLING_RATE_MS 1000', '#define POLLING_RATE_MS 1000');

  return `{
  // Check if alert happened
  twai_read_alerts(&alerts_triggered, pdMS_TO_TICKS(POLLING_RATE_MS));
  twai_status_info_t twaistatus;
  twai_get_status_info(&twaistatus);
  
  // 如果有接收数据警报，处理所有接收到的消息
  if (alerts_triggered & TWAI_ALERT_RX_DATA) {
    twai_message_t message;
    while (twai_receive(&message, 0) == ESP_OK) {
      handle_rx_message(message);
    }
  }
}\n`;
};

Arduino.forBlock['esp32_can_message_available'] = function (block, generator) {
  return ['new_message_available', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['esp32_can_get_message_id'] = function (block, generator) {
  return ['last_received_message.identifier', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['esp32_can_get_message_length'] = function (block, generator) {
  return ['last_received_message.data_length_code', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['esp32_can_get_message_data'] = function (block, generator) {
  const index = block.getFieldValue('INDEX');
  return [`last_received_message.data[${index}]`, Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['esp32_can_transmit_interval'] = function (block, generator) {
  const interval = block.getFieldValue('INTERVAL');

  // 添加全局变量
  generator.addMacro(`#define TRANSMIT_RATE_MS ${interval}`, `#define TRANSMIT_RATE_MS ${interval}`);
  generator.addVariable('unsigned long previousMillis = 0;', 'unsigned long previousMillis = 0;');

  return `{
  // Setup timer for periodic transmission
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= TRANSMIT_RATE_MS) {
    previousMillis = currentMillis;
    // Call your send function here, e.g.: send_can_message();
  }
}\n`;
};