Arduino.forBlock['wdt_init'] = function(block, generator) {
  var timeout = block.getFieldValue('TIMEOUT');
  var panic = block.getFieldValue('PANIC') === 'TRUE';
  
  generator.addLibrary('WDT_lib', '#include "esp_task_wdt.h"');
  
  var code = `esp_task_wdt_config_t twdt_config = {
    .timeout_ms = ${timeout * 1000},
    .idle_core_mask = (1 << portNUM_PROCESSORS) - 1,
    .trigger_panic = ${panic ? 'true' : 'false'},
  };
  ESP_ERROR_CHECK(esp_task_wdt_init(&twdt_config));\n`;
  
  return code;
};

Arduino.forBlock['wdt_add_task'] = function(block, generator) {
  generator.addLibrary('WDT_lib', '#include "esp_task_wdt.h"');
  
  var code = 'ESP_ERROR_CHECK(esp_task_wdt_add(NULL));\n';
  return code;
};

Arduino.forBlock['wdt_reset'] = function(block, generator) {
  generator.addLibrary('WDT_lib', '#include "esp_task_wdt.h"');
  
  var code = 'esp_task_wdt_reset();\n';
  return code;
};

Arduino.forBlock['wdt_add_user'] = function(block, generator) {
  var userName = generator.valueToCode(block, 'USER_NAME', Arduino.ORDER_ATOMIC) || '""';
  var userVarName = userName.replace(/"/g, '').replace(/[^a-zA-Z0-9_]/g, '_');
  
  generator.addLibrary('WDT_lib', '#include "esp_task_wdt.h"');
  generator.addVariable('wdt_user_handle_' + userVarName, 
                       'esp_task_wdt_user_handle_t wdt_user_handle_' + userVarName + ';');
  
  var code = `ESP_ERROR_CHECK(esp_task_wdt_add_user(${userName}, &wdt_user_handle_${userVarName}));\n`;
  return code;
};

Arduino.forBlock['wdt_reset_user'] = function(block, generator) {
  var userName = generator.valueToCode(block, 'USER_NAME', Arduino.ORDER_ATOMIC) || '""';
  var userVarName = userName.replace(/"/g, '').replace(/[^a-zA-Z0-9_]/g, '_');
  
  generator.addLibrary('WDT_lib', '#include "esp_task_wdt.h"');
  
  var code = `esp_task_wdt_reset_user(wdt_user_handle_${userVarName});\n`;
  return code;
};

Arduino.forBlock['wdt_delete_task'] = function(block, generator) {
  generator.addLibrary('WDT_lib', '#include "esp_task_wdt.h"');
  
  var code = 'ESP_ERROR_CHECK(esp_task_wdt_delete(NULL));\n';
  return code;
};

Arduino.forBlock['wdt_delete_user'] = function(block, generator) {
  var userName = generator.valueToCode(block, 'USER_NAME', Arduino.ORDER_ATOMIC) || '""';
  var userVarName = userName.replace(/"/g, '').replace(/[^a-zA-Z0-9_]/g, '_');
  
  generator.addLibrary('WDT_lib', '#include "esp_task_wdt.h"');
  
  var code = `ESP_ERROR_CHECK(esp_task_wdt_delete_user(wdt_user_handle_${userVarName}));\n`;
  return code;
};

Arduino.forBlock['wdt_deinit'] = function(block, generator) {
  generator.addLibrary('WDT_lib', '#include "esp_task_wdt.h"');
  
  var code = 'ESP_ERROR_CHECK(esp_task_wdt_deinit());\n';
  return code;
};