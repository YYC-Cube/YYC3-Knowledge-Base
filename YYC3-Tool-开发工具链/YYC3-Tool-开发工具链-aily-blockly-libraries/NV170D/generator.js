// 初始化
Arduino.forBlock['nv170d_init'] = function(block, generator) {
  const nvname = block.getFieldValue("NV_NAME") || "";
  const nvpin = block.getFieldValue("NV_PIN");

  generator.addLibrary('NV170D', '#include <NV170D.h>');
  generator.addVariable(`NV170D_TYPE_NAME`, `NV170D ${nvname}(${nvpin});`);

  return '';

};

// 语音播报
Arduino.forBlock['nv170d_play'] = function(block, generator) {
  const nvname = block.getFieldValue("NV_NAME") || "";
  const nvtext = block.getFieldValue("NV_PLAYNUM");
  
  const code = `${nvname}.sendDWS(${nvtext});\n`;
    
  return code;
};

// 设置音量等
Arduino.forBlock['nv170d_set'] = function(block, generator) {
  const nvname = block.getFieldValue("NV_NAME") || "";
  const nvset = block.getFieldValue("NV_SET");

  const code = `${nvname}.sendDWS(${nvset});\n`;

  return code;
};

// 语音连码播报
Arduino.forBlock['nv170d_playcon'] = function(block, generator) {
  const nvname = block.getFieldValue("NV_NAME") || "";
  const nvtextcon = parseInt(block.getFieldValue("NV_PLAYCONNUM"), 16); // 将值转换为十六进制数

  let code = ``;
  if (nvtextcon === 0xF1) { // 判断是否为 0xF1
    code = `${nvname}.sendDWS(0x${nvtextcon.toString(16).toUpperCase()});\n`; // 格式化为十六进制
  } else {
    code = `${nvname}.sendData(0x${nvtextcon.toString(16).toUpperCase()});\n`; // 格式化为十六进制
  }
      
  return code;
};