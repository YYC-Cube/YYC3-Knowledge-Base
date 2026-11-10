// ============================================================
// nrf54_lowpower Blockly Generator
// Low Power Management Library for nRF54L15
// ============================================================

// --- 辅助函数 ---

function ensureLowPowerLibraries(generator) {
  generator.addLibrary('lp_arduino', '#include <Arduino.h>');
  generator.addLibrary('lp_nrf54l15', '#include <nrf54l15.h>');
  generator.addLibrary('lp_hal', '#include "nrf54l15_hal.h"');
  generator.addLibrary('lp_variant', '#include <variant.h>');
}

function ensureLowPowerNamespace(generator) {
  ensureLowPowerLibraries(generator);
  generator.addVariable('lp_namespace', 'using namespace xiao_nrf54l15;');
}

function ensurePowerManager(generator) {
  ensureLowPowerNamespace(generator);
  generator.addObject('lp_pm', 'PowerManager lowpower_pm;');
}

function ensureWatchdog(generator) {
  ensureLowPowerNamespace(generator);
  generator.addObject('lp_wdt', 'Watchdog lowpower_wdt;');
}

function ensureLpcomp(generator) {
  ensureLowPowerNamespace(generator);
  generator.addObject('lp_lpcomp', 'Lpcomp lowpower_lpcomp;');
}

function ensureSleepHelper(generator) {
  generator.addFunction('lp_sleep_until',
    'static void lowpower_sleepUntilMs(uint32_t deadlineMs) {\n' +
    '  while ((int32_t)(millis() - deadlineMs) < 0) {\n' +
    '    __asm volatile("wfi");\n' +
    '  }\n' +
    '}\n'
  );
}

function ensureGpregretHelpers(generator) {
  ensureLowPowerLibraries(generator);
  generator.addFunction('lp_gpregret',
    '#ifdef NRF_TRUSTZONE_NONSECURE\n' +
    'static NRF_POWER_Type* const lp_pwr_reg = reinterpret_cast<NRF_POWER_Type*>(0x4010E000UL);\n' +
    '#else\n' +
    'static NRF_POWER_Type* const lp_pwr_reg = reinterpret_cast<NRF_POWER_Type*>(0x5010E000UL);\n' +
    '#endif\n' +
    'static void lowpower_writeGpregret(uint8_t v) { lp_pwr_reg->GPREGRET[0] = (uint32_t)v; }\n' +
    'static uint8_t lowpower_readGpregret() { return (uint8_t)(lp_pwr_reg->GPREGRET[0] & 0xFF); }\n'
  );
}

function ensureButtonSenseHelper(generator) {
  ensureLowPowerNamespace(generator);
  generator.addFunction('lp_button_sense',
    'static void lowpower_configureButtonSenseWake() {\n' +
    '  Gpio::configure(kPinUserButton, GpioDirection::kInput, GpioPull::kDisabled);\n' +
    '  volatile uint32_t* pinCnf = nullptr;\n' +
    '  if (kPinUserButton.port == 0U) {\n' +
    '    pinCnf = &NRF_P0->PIN_CNF[kPinUserButton.pin];\n' +
    '  } else if (kPinUserButton.port == 1U) {\n' +
    '    pinCnf = &NRF_P1->PIN_CNF[kPinUserButton.pin];\n' +
    '  } else if (kPinUserButton.port == 2U) {\n' +
    '    pinCnf = &NRF_P2->PIN_CNF[kPinUserButton.pin];\n' +
    '  }\n' +
    '  if (pinCnf != nullptr) {\n' +
    '    uint32_t cnf = *pinCnf;\n' +
    '    cnf &= ~GPIO_PIN_CNF_SENSE_Msk;\n' +
    '    cnf |= (GPIO_PIN_CNF_SENSE_Low << GPIO_PIN_CNF_SENSE_Pos);\n' +
    '    *pinCnf = cnf;\n' +
    '  }\n' +
    '}\n'
  );
}

function ensureLpcompAboveHelper(generator) {
  ensureLpcomp(generator);
  generator.addFunction('lp_lpcomp_above',
    'static bool lowpower_lpcompAboveThreshold() {\n' +
    '  lowpower_lpcomp.sample(200000UL);\n' +
    '  return lowpower_lpcomp.resultAbove();\n' +
    '}\n'
  );
}

// ============================================================
// 电源配置
// ============================================================

Arduino.forBlock['lowpower_init'] = function(block, generator) {
  ensureLowPowerNamespace(generator);
  ensurePowerManager(generator);

  const freq = block.getFieldValue('FREQ');
  const mode = block.getFieldValue('MODE');

  const freqEnum = (freq === '128MHZ')
    ? 'CpuFrequency::k128MHz'
    : 'CpuFrequency::k64MHz';
  const modeEnum = (mode === 'CONSTANT_LATENCY')
    ? 'PowerLatencyMode::kConstantLatency'
    : 'PowerLatencyMode::kLowPower';

  let code = '';
  code += '(void)ClockControl::setCpuFrequency(' + freqEnum + ');\n';
  code += 'lowpower_pm.setLatencyMode(' + modeEnum + ');\n';
  return code;
};

Arduino.forBlock['lowpower_enter_lowest_power'] = function(block, generator) {
  ensureLowPowerLibraries(generator);
  return 'xiaoNrf54l15EnterLowestPowerBoardState();\n';
};

Arduino.forBlock['lowpower_set_cpu_freq'] = function(block, generator) {
  ensureLowPowerNamespace(generator);

  const freq = block.getFieldValue('FREQ');
  const freqEnum = (freq === '128MHZ')
    ? 'CpuFrequency::k128MHz'
    : 'CpuFrequency::k64MHz';

  return '(void)ClockControl::setCpuFrequency(' + freqEnum + ');\n';
};

// ============================================================
// 休眠模式
// ============================================================

Arduino.forBlock['lowpower_wfi'] = function(block, generator) {
  return '__asm volatile("wfi");\n';
};

Arduino.forBlock['lowpower_sleep_ms'] = function(block, generator) {
  ensureSleepHelper(generator);

  const ms = generator.valueToCode(block, 'MS', generator.ORDER_ATOMIC) || '1000';
  return 'lowpower_sleepUntilMs(millis() + ' + ms + ');\n';
};

Arduino.forBlock['lowpower_system_off_timed'] = function(block, generator) {
  ensureLowPowerLibraries(generator);

  const ms = generator.valueToCode(block, 'MS', generator.ORDER_ATOMIC) || '1000';
  return 'delaySystemOffNoRetention(' + ms + ');\n';
};

Arduino.forBlock['lowpower_system_off_button'] = function(block, generator) {
  ensurePowerManager(generator);
  ensureButtonSenseHelper(generator);

  let code = '';
  code += 'lowpower_configureButtonSenseWake();\n';
  code += 'Serial.flush();\n';
  code += 'delay(2);\n';
  code += 'lowpower_pm.systemOffNoRetention();\n';
  return code;
};

Arduino.forBlock['lowpower_system_off'] = function(block, generator) {
  ensurePowerManager(generator);

  const retention = block.getFieldValue('RETENTION');
  let code = 'Serial.flush();\ndelay(2);\n';
  if (retention === 'NO_RETENTION') {
    code += 'lowpower_pm.systemOffNoRetention();\n';
  } else {
    code += 'lowpower_pm.systemOff();\n';
  }
  return code;
};

// ============================================================
// LPCOMP 低功耗比较器
// ============================================================

Arduino.forBlock['lowpower_lpcomp_init'] = function(block, generator) {
  ensureLpcomp(generator);

  const pin = block.getFieldValue('PIN');
  const vdd = generator.valueToCode(block, 'VDD', generator.ORDER_ATOMIC) || '3300';
  const threshold = generator.valueToCode(block, 'THRESHOLD', generator.ORDER_ATOMIC) || '200';
  const hysteresis = block.getFieldValue('HYSTERESIS') === 'TRUE' ? 'true' : 'false';
  const detect = block.getFieldValue('DETECT');

  let detectEnum;
  switch (detect) {
    case 'DOWN': detectEnum = 'LpcompDetect::kDown'; break;
    case 'CROSS': detectEnum = 'LpcompDetect::kCross'; break;
    default: detectEnum = 'LpcompDetect::kUp'; break;
  }

  return 'lowpower_lpcomp.beginThresholdMv(' + pin + ', ' + vdd + ', ' + threshold +
    ', ' + hysteresis + ', ' + detectEnum + ');\n';
};

Arduino.forBlock['lowpower_lpcomp_poll_up'] = function(block, generator) {
  ensureLpcomp(generator);
  return ['lowpower_lpcomp.pollUp(true)', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['lowpower_lpcomp_sample_above'] = function(block, generator) {
  ensureLpcompAboveHelper(generator);
  return ['lowpower_lpcompAboveThreshold()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['lowpower_lpcomp_clear'] = function(block, generator) {
  ensureLpcomp(generator);
  return 'lowpower_lpcomp.clearEvents();\n';
};

// ============================================================
// 看门狗
// ============================================================

Arduino.forBlock['lowpower_watchdog_init'] = function(block, generator) {
  ensureWatchdog(generator);

  const timeout = generator.valueToCode(block, 'TIMEOUT', generator.ORDER_ATOMIC) || '4000';
  const pauseSleep = block.getFieldValue('PAUSE_SLEEP') === 'TRUE' ? 'true' : 'false';

  let code = '';
  code += 'if (lowpower_wdt.configure(' + timeout + ', 0U, ' + pauseSleep + ', false, false)) {\n';
  code += '  lowpower_wdt.start();\n';
  code += '  lowpower_wdt.feed();\n';
  code += '}\n';
  return code;
};

Arduino.forBlock['lowpower_watchdog_feed'] = function(block, generator) {
  ensureWatchdog(generator);
  return 'lowpower_wdt.feed();\n';
};

// ============================================================
// 唤醒与复位信息
// ============================================================

Arduino.forBlock['lowpower_woke_from'] = function(block, generator) {
  ensurePowerManager(generator);

  const source = block.getFieldValue('SOURCE');
  let mask;
  switch (source) {
    case 'GRTC': mask = 'RESET_RESETREAS_GRTC_Msk'; break;
    case 'LPCOMP': mask = 'RESET_RESETREAS_LPCOMP_Msk'; break;
    case 'WATCHDOG': mask = 'RESET_RESETREAS_DOG0_Msk'; break;
    default: mask = 'RESET_RESETREAS_OFF_Msk'; break;
  }

  return ['((lowpower_pm.resetReason() & ' + mask + ') != 0U)', generator.ORDER_RELATIONAL];
};

Arduino.forBlock['lowpower_reset_reason'] = function(block, generator) {
  ensurePowerManager(generator);
  return ['lowpower_pm.resetReason()', generator.ORDER_FUNCTION_CALL];
};

Arduino.forBlock['lowpower_clear_reset_reason'] = function(block, generator) {
  ensurePowerManager(generator);

  generator.addVariable('lp_reset_reason_var', 'static uint32_t lp_saved_reset_reason = 0U;');
  generator.addFunction('lp_clear_reset',
    'static void lowpower_clearResetReason() {\n' +
    '  lp_saved_reset_reason = lowpower_pm.resetReason();\n' +
    '  lowpower_pm.clearResetReason(lp_saved_reset_reason);\n' +
    '}\n'
  );

  return 'lowpower_clearResetReason();\n';
};

Arduino.forBlock['lowpower_gpregret_write'] = function(block, generator) {
  ensureGpregretHelpers(generator);

  const value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
  return 'lowpower_writeGpregret((uint8_t)(' + value + '));\n';
};

Arduino.forBlock['lowpower_gpregret_read'] = function(block, generator) {
  ensureGpregretHelpers(generator);
  return ['lowpower_readGpregret()', generator.ORDER_FUNCTION_CALL];
};
