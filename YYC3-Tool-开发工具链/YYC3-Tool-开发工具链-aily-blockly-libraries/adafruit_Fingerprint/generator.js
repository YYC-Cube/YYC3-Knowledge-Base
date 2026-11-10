Arduino.forBlock['fingerprint_begin'] = function (block, generator) {
  var baud = block.getFieldValue('BAUDRATE');
  generator.addLibrary('#include <Adafruit_Fingerprint.h>', '#include <Adafruit_Fingerprint.h>');
  generator.addVariable('Adafruit_Fingerprint finger(&Serial, 0x0);', 'Adafruit_Fingerprint finger(&Serial, 0x0);');
  generator.addSetupBegin('finger_begin', 'finger.begin(' + baud + ');');
  return '';
};

Arduino.forBlock['fingerprint_verify'] = function (block, generator) {
  return ['finger.verifyPassword()', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['fingerprint_get_image'] = function (block, generator) {
  return ['finger.getImage()', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['fingerprint_image2Tz'] = function (block, generator) {
  var slot = block.getFieldValue('SLOT');
  if (slot === '1') {
    slot = 'FINGERPRINT_CHARBUFFER1';
  } else if (slot === '2') {
    slot = 'FINGERPRINT_CHARBUFFER2';
  } else {
    slot = 'FINGERPRINT_CHARBUFFER1';
  }
  generator.addLibrary('#include <Adafruit_Fingerprint.h>', '#include <Adafruit_Fingerprint.h>');
  generator.addVariable('Adafruit_Fingerprint finger(&Serial, 0x0);', 'Adafruit_Fingerprint finger(&Serial, 0x0);');
  generator.addSetupBegin('finger_begin', 'finger.begin(57600);');
  generator.addSetupBegin('finger_image2Tz', 'finger.image2Tz(' + slot + ');');
  return ['finger.image2Tz(' + slot + ')', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['fingerprint_create_model'] = function (block, generator) {
  return ['finger.createModel()', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['fingerprint_store_model'] = function (block, generator) {
  var id = block.getFieldValue('ID');
  return 'finger.storeModel(' + id + ');\n';
};

Arduino.forBlock['fingerprint_delete_model'] = function (block, generator) {
  var id = block.getFieldValue('ID');
  return 'finger.deleteModel(' + id + ');\n';
};

Arduino.forBlock['fingerprint_finger_fast_search'] = function (block, generator) {
  return ['finger.fingerFastSearch()', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['fingerprint_LEDcontrol'] = function (block, generator) {
  var state = block.getFieldValue('STATE');
  var on = (state === 'ON') ? 'true' : 'false';
  return 'finger.LEDcontrol(' + on + ');\n';
};

Arduino.forBlock['fingerprint_get_template_count'] = function (block, generator) {
  return ['finger.getTemplateCount()', Arduino.ORDER_ATOMIC];
};