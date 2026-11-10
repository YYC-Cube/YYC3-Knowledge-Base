Arduino.forBlock["time_delay"] = function (block, generator) {
  var delayTime = generator.valueToCode(block, 'DELAY_TIME', generator.ORDER_ATOMIC) || '0';
  return "delay(" + delayTime + ");\n";
};

Arduino.forBlock["time_millis"] = function (block, generator) {
  return ["millis()", generator.ORDER_ATOMIC];
};

Arduino.forBlock["system_time"] = function (block, generator) {
  return ["__TIME__", generator.ORDER_ATOMIC];
};

Arduino.forBlock["system_date"] = function (block, generator) {
  return ["__DATE__", generator.ORDER_ATOMIC];
};

Arduino.forBlock["time_delay_microseconds"] = function (block, generator) {
  var delayTime = generator.valueToCode(block, 'DELAY_TIME', generator.ORDER_ATOMIC) || '0';
  return "delayMicroseconds(" + delayTime + ");\n";
};

Arduino.forBlock["time_micros"] = function (block, generator) {
  return ["micros()", generator.ORDER_ATOMIC];
};
