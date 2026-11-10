Arduino.forBlock['lm35_read'] = function(block, generator) {
  const pin = block.getFieldValue('PIN') || 'A0'; // 默认引脚A0
  return [`analogRead(${pin}) * 0.488`, Arduino.ORDER_ATOMIC];
};