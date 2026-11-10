/**
 * RTC Library Generator for Aily Blockly
 * Based on Makuna/Rtc library (v2.5.0)
 * Supports DS3231, DS1307, DS1302, PCF8563
 */

// ============================================================
// Chip type to variable type mapping
// ============================================================
const RTC_CHIP_VAR_TYPE = {
  'DS3231': 'RtcDS3231',
  'DS1307': 'RtcDS1307',
  'DS1302': 'RtcDS1302',
  'PCF8563': 'RtcPCF8563'
};

// ============================================================
// Dynamic extension: rtc_init_dynamic
// Adds pin fields depending on chip type (3-wire vs I2C)
// ============================================================
if (Blockly.Extensions && Blockly.Extensions.isRegistered && Blockly.Extensions.isRegistered('rtc_init_dynamic')) {
  Blockly.Extensions.unregister('rtc_init_dynamic');
}

if (Blockly.Extensions && Blockly.Extensions.register) {
  Blockly.Extensions.register('rtc_init_dynamic', function () {
    const i18n = window.__BLOCKLY_LIB_I18N__?.['@aily-project/lib-rtc']?.extensions?.rtc_init_dynamic || {};
    const datPinLabel = i18n.dat_pin || 'DAT引脚';
    const clkPinLabel = i18n.clk_pin || 'CLK引脚';
    const rstPinLabel = i18n.rst_pin || 'RST引脚';
    const sdaPinLabel = i18n.sda_pin || 'SDA引脚';
    const sclPinLabel = i18n.scl_pin || 'SCL引脚';

    const boardConfig = window['boardConfig'] || {};
    const boardCore = (boardConfig.core || '').toLowerCase();
    const boardType = (boardConfig.type || '').toLowerCase();
    const boardName = (boardConfig.name || '').toLowerCase();
    const isESP32 = boardCore.indexOf('esp32') > -1 ||
                    boardType.indexOf('esp32') > -1 ||
                    boardName.indexOf('esp32') > -1;

    this.isESP32_ = isESP32;

    this.updateShape_ = function (chipType) {
      // Remove old dynamic inputs
      if (this.getInput('THREE_WIRE_PINS')) this.removeInput('THREE_WIRE_PINS');
      if (this.getInput('I2C_PINS')) this.removeInput('I2C_PINS');
      if (this.getInput('DAT_PIN')) this.removeInput('DAT_PIN');
      if (this.getInput('CLK_PIN')) this.removeInput('CLK_PIN');
      if (this.getInput('RST_PIN')) this.removeInput('RST_PIN');
      if (this.getInput('SDA_PIN')) this.removeInput('SDA_PIN');
      if (this.getInput('SCL_PIN')) this.removeInput('SCL_PIN');

      if (chipType === 'DS1302') {
        // DS1302 uses ThreeWire: DAT, CLK, RST - use dropdown pin selection
        var digitalPins = (boardConfig.digitalPins || []);
        var pinOptions = digitalPins.length > 0 ? digitalPins : [
          ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'],
          ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'],
          ['10', '10'], ['11', '11'], ['12', '12'], ['13', '13']
        ];
        this.appendDummyInput('THREE_WIRE_PINS')
            .appendField(datPinLabel)
            .appendField(new Blockly.FieldDropdown(pinOptions), 'DAT_PIN')
            .appendField(clkPinLabel)
            .appendField(new Blockly.FieldDropdown(pinOptions), 'CLK_PIN')
            .appendField(rstPinLabel)
            .appendField(new Blockly.FieldDropdown(pinOptions), 'RST_PIN');
        this.setFieldValue('4', 'DAT_PIN');
        this.setFieldValue('5', 'CLK_PIN');
        this.setFieldValue('2', 'RST_PIN');
      } else if (isESP32) {
        // I2C chips on ESP32: allow pin selection
        var digitalPins = (boardConfig.digitalPins || []);
        var pinOptions = digitalPins.length > 0 ? digitalPins : [
          ['21', '21'], ['22', '22'], ['19', '19'], ['23', '23'],
          ['18', '18'], ['5', '5'], ['17', '17'], ['16', '16']
        ];
        this.appendDummyInput('I2C_PINS')
            .appendField(sdaPinLabel)
            .appendField(new Blockly.FieldDropdown(pinOptions), 'SDA_PIN')
            .appendField(sclPinLabel)
            .appendField(new Blockly.FieldDropdown(pinOptions), 'SCL_PIN');
      }
      // For non-ESP32 I2C chips: no extra pin inputs needed (fixed pins)
    };

    // Initial shape
    const initialChip = this.getFieldValue('CHIP_TYPE') || 'DS3231';
    this.updateShape_(initialChip);

    // Listen for chip type changes
    const chipField = this.getField('CHIP_TYPE');
    if (chipField && typeof chipField.setValidator === 'function') {
      const block = this;
      chipField.setValidator(function (newValue) {
        block.updateShape_(newValue);
        return newValue;
      });
    }
  });
}

// ============================================================
// RTC Init
// ============================================================
Arduino.forBlock['rtc_init'] = function (block, generator) {
  // Variable rename listener
  if (!block._rtcVarMonitorAttached) {
    block._rtcVarMonitorAttached = true;
    const chipType = block.getFieldValue('CHIP_TYPE') || 'DS3231';
    const varType = RTC_CHIP_VAR_TYPE[chipType] || 'RtcDS3231';
    block._rtcVarLastName = block.getFieldValue('VAR') || 'rtc';
    block._rtcVarType = varType;
    registerVariableToBlockly(block._rtcVarLastName, varType);

    const varField = block.getField('VAR');
    if (varField) {
      const originalFinishEditing = varField.onFinishEditing_;
      varField.onFinishEditing_ = function (newName) {
        if (typeof originalFinishEditing === 'function') {
          originalFinishEditing.call(this, newName);
        }
        const oldName = block._rtcVarLastName;
        if (newName && newName !== oldName) {
          renameVariableInBlockly(block, oldName, newName, block._rtcVarType);
          block._rtcVarLastName = newName;
        }
      };
    }
  }

  const varName = block.getFieldValue('VAR') || 'rtc';
  const chipType = block.getFieldValue('CHIP_TYPE') || 'DS3231';
  const varType = RTC_CHIP_VAR_TYPE[chipType] || 'RtcDS3231';

  // Update variable type when chip type changes
  if (block._rtcVarType !== varType) {
    block._rtcVarType = varType;
    registerVariableToBlockly(varName, varType);
  }

  let code = '';

  if (chipType === 'DS1302') {
    const datPin = block.getFieldValue('DAT_PIN') || '4';
    const clkPin = block.getFieldValue('CLK_PIN') || '5';
    const rstPin = block.getFieldValue('RST_PIN') || '2';
    const wireName = '_wire_' + varName;

    generator.addLibrary('ThreeWire', '#include <ThreeWire.h>');
    generator.addLibrary('RtcDS1302', '#include <RtcDS1302.h>');
    generator.addVariable(wireName, 'ThreeWire ' + wireName + '(' + datPin + ', ' + clkPin + ', ' + rstPin + ');');
    generator.addVariable(varName, 'RtcDS1302<ThreeWire> ' + varName + '(' + wireName + ');');
    code = varName + '.Begin();\n';
  } else if (chipType === 'DS1307') {
    generator.addLibrary('Wire', '#include <Wire.h>');
    generator.addLibrary('RtcDS1307', '#include <RtcDS1307.h>');
    generator.addVariable(varName, 'RtcDS1307<TwoWire> ' + varName + '(Wire);');

    const boardConfig = window['boardConfig'] || {};
    const boardCore = (boardConfig.core || '').toLowerCase();
    const isESP32 = boardCore.indexOf('esp32') > -1;
    if (isESP32) {
      const sdaPin = block.getFieldValue('SDA_PIN') || '21';
      const sclPin = block.getFieldValue('SCL_PIN') || '22';
      generator.addSetupBegin('wire_begin', 'Wire.begin(' + sdaPin + ', ' + sclPin + ');');
    } else {
      generator.addSetupBegin('wire_begin', 'Wire.begin();');
    }
    code = varName + '.Begin();\n';
  } else if (chipType === 'DS3231') {
    generator.addLibrary('Wire', '#include <Wire.h>');
    generator.addLibrary('RtcDS3231', '#include <RtcDS3231.h>');
    generator.addVariable(varName, 'RtcDS3231<TwoWire> ' + varName + '(Wire);');

    const boardConfig = window['boardConfig'] || {};
    const boardCore = (boardConfig.core || '').toLowerCase();
    const isESP32 = boardCore.indexOf('esp32') > -1;
    if (isESP32) {
      const sdaPin = block.getFieldValue('SDA_PIN') || '21';
      const sclPin = block.getFieldValue('SCL_PIN') || '22';
      generator.addSetupBegin('wire_begin', 'Wire.begin(' + sdaPin + ', ' + sclPin + ');');
    } else {
      generator.addSetupBegin('wire_begin', 'Wire.begin();');
    }
    code = varName + '.Begin();\n';
  } else if (chipType === 'PCF8563') {
    generator.addLibrary('Wire', '#include <Wire.h>');
    generator.addLibrary('RtcPCF8563', '#include <RtcPCF8563.h>');
    generator.addVariable(varName, 'RtcPCF8563<TwoWire> ' + varName + '(Wire);');

    const boardConfig = window['boardConfig'] || {};
    const boardCore = (boardConfig.core || '').toLowerCase();
    const isESP32 = boardCore.indexOf('esp32') > -1;
    if (isESP32) {
      const sdaPin = block.getFieldValue('SDA_PIN') || '21';
      const sclPin = block.getFieldValue('SCL_PIN') || '22';
      generator.addSetupBegin('wire_begin', 'Wire.begin(' + sdaPin + ', ' + sclPin + ');');
    } else {
      generator.addSetupBegin('wire_begin', 'Wire.begin();');
    }
    code = varName + '.Begin();\n';
  }

  return code;
};

// ============================================================
// RTC Set DateTime (manual)
// ============================================================
Arduino.forBlock['rtc_set_datetime'] = function (block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'rtc';

  const year = generator.valueToCode(block, 'YEAR', generator.ORDER_ATOMIC) || '2024';
  const month = generator.valueToCode(block, 'MONTH', generator.ORDER_ATOMIC) || '1';
  const day = generator.valueToCode(block, 'DAY', generator.ORDER_ATOMIC) || '1';
  const hour = generator.valueToCode(block, 'HOUR', generator.ORDER_ATOMIC) || '0';
  const minute = generator.valueToCode(block, 'MINUTE', generator.ORDER_ATOMIC) || '0';
  const second = generator.valueToCode(block, 'SECOND', generator.ORDER_ATOMIC) || '0';

  return varName + '.SetDateTime(RtcDateTime(' + year + ', ' + month + ', ' + day + ', ' + hour + ', ' + minute + ', ' + second + '));\n';
};

// ============================================================
// RTC Set Compile DateTime
// ============================================================
Arduino.forBlock['rtc_set_compile_datetime'] = function (block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'rtc';

  return varName + '.SetDateTime(RtcDateTime(__DATE__, __TIME__));\n';
};

// ============================================================
// RTC Get DateTime
// ============================================================
Arduino.forBlock['rtc_get_datetime'] = function (block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'rtc';

  return [varName + '.GetDateTime()', generator.ORDER_ATOMIC];
};

// ============================================================
// RTC Is DateTime Valid
// ============================================================
Arduino.forBlock['rtc_is_datetime_valid'] = function (block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'rtc';

  return [varName + '.IsDateTimeValid()', generator.ORDER_ATOMIC];
};

// ============================================================
// RTC Get Is Running
// ============================================================
Arduino.forBlock['rtc_get_is_running'] = function (block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'rtc';

  return [varName + '.GetIsRunning()', generator.ORDER_ATOMIC];
};

// ============================================================
// RTC Set Is Running
// ============================================================
Arduino.forBlock['rtc_set_is_running'] = function (block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'rtc';
  const running = block.getFieldValue('RUNNING') === 'TRUE';

  return varName + '.SetIsRunning(' + (running ? 'true' : 'false') + ');\n';
};

// ============================================================
// DateTime component getters
// ============================================================
Arduino.forBlock['rtc_get_year'] = function (block, generator) {
  const time = generator.valueToCode(block, 'TIME', generator.ORDER_ATOMIC) || 'RtcDateTime(2024, 1, 1, 0, 0, 0)';
  return [time + '.Year()', generator.ORDER_ATOMIC];
};

Arduino.forBlock['rtc_get_month'] = function (block, generator) {
  const time = generator.valueToCode(block, 'TIME', generator.ORDER_ATOMIC) || 'RtcDateTime(2024, 1, 1, 0, 0, 0)';
  return [time + '.Month()', generator.ORDER_ATOMIC];
};

Arduino.forBlock['rtc_get_day'] = function (block, generator) {
  const time = generator.valueToCode(block, 'TIME', generator.ORDER_ATOMIC) || 'RtcDateTime(2024, 1, 1, 0, 0, 0)';
  return [time + '.Day()', generator.ORDER_ATOMIC];
};

Arduino.forBlock['rtc_get_hour'] = function (block, generator) {
  const time = generator.valueToCode(block, 'TIME', generator.ORDER_ATOMIC) || 'RtcDateTime(2024, 1, 1, 0, 0, 0)';
  return [time + '.Hour()', generator.ORDER_ATOMIC];
};

Arduino.forBlock['rtc_get_minute'] = function (block, generator) {
  const time = generator.valueToCode(block, 'TIME', generator.ORDER_ATOMIC) || 'RtcDateTime(2024, 1, 1, 0, 0, 0)';
  return [time + '.Minute()', generator.ORDER_ATOMIC];
};

Arduino.forBlock['rtc_get_second'] = function (block, generator) {
  const time = generator.valueToCode(block, 'TIME', generator.ORDER_ATOMIC) || 'RtcDateTime(2024, 1, 1, 0, 0, 0)';
  return [time + '.Second()', generator.ORDER_ATOMIC];
};

Arduino.forBlock['rtc_get_day_of_week'] = function (block, generator) {
  const time = generator.valueToCode(block, 'TIME', generator.ORDER_ATOMIC) || 'RtcDateTime(2024, 1, 1, 0, 0, 0)';
  return [time + '.DayOfWeek()', generator.ORDER_ATOMIC];
};

// ============================================================
// Format DateTime as String
// ============================================================
Arduino.forBlock['rtc_format_datetime'] = function (block, generator) {
  const time = generator.valueToCode(block, 'TIME', generator.ORDER_ATOMIC) || 'RtcDateTime(2024, 1, 1, 0, 0, 0)';

  // Add helper function for formatting
  generator.addFunction('rtcFormatDateTime',
    'String rtcFormatDateTime(const RtcDateTime& dt) {\n' +
    '  char buf[20];\n' +
    '  snprintf(buf, sizeof(buf), "%04u/%02u/%02u %02u:%02u:%02u",\n' +
    '    dt.Year(), dt.Month(), dt.Day(),\n' +
    '    dt.Hour(), dt.Minute(), dt.Second());\n' +
    '  return String(buf);\n' +
    '}\n');

  return ['rtcFormatDateTime(' + time + ')', generator.ORDER_ATOMIC];
};

// ============================================================
// DS3231 Get Temperature
// ============================================================
Arduino.forBlock['rtc_ds3231_get_temperature'] = function (block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'rtc';
  const unit = block.getFieldValue('UNIT') || 'C';

  if (unit === 'F') {
    return [varName + '.GetTemperature().AsFloatDegF()', generator.ORDER_ATOMIC];
  }
  return [varName + '.GetTemperature().AsFloatDegC()', generator.ORDER_ATOMIC];
};

// ============================================================
// DS1302 Set Write Protect
// ============================================================
Arduino.forBlock['rtc_ds1302_set_write_protect'] = function (block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'rtc';
  const enable = block.getFieldValue('ENABLE') === 'TRUE';

  return varName + '.SetIsWriteProtected(' + (enable ? 'true' : 'false') + ');\n';
};
