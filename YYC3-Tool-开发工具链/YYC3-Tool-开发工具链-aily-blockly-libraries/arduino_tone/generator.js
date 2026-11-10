// 系统音效旋律数据
Arduino.systemSounds = {
  'startup': [
    {freq: 523, duration: 200},  // C5
    {freq: 659, duration: 200},  // E5
    {freq: 784, duration: 400}   // G5
  ],
  'success': [
    {freq: 523, duration: 150},  // C5
    {freq: 659, duration: 150},  // E5
    {freq: 784, duration: 300}   // G5
  ],
  'error': [
    {freq: 330, duration: 200},  // E4
    {freq: 294, duration: 200},  // D4
    {freq: 262, duration: 400}   // C4
  ],
  'warning': [
    {freq: 440, duration: 300},  // A4
    {freq: 0, duration: 100},    // 静音
    {freq: 440, duration: 300}   // A4
  ],
  'notification': [
    {freq: 880, duration: 150},  // A5
    {freq: 1047, duration: 150} // C6
  ],
  'beep': [
    {freq: 1000, duration: 100}  // 1kHz短嘟声
  ],
  'doorbell': [
    {freq: 523, duration: 300},  // C5
    {freq: 392, duration: 300}   // G4
  ],
  'alarm': [
    {freq: 800, duration: 200},  // 高频
    {freq: 600, duration: 200},  // 中频
    {freq: 800, duration: 200},  // 高频
    {freq: 600, duration: 200}   // 中频
  ],
  'coin': [
    {freq: 988, duration: 100},  // B5
    {freq: 1175, duration: 300}  // D6
  ],
  'powerdown': [
    {freq: 523, duration: 200},  // C5
    {freq: 392, duration: 200},  // G4
    {freq: 262, duration: 400}   // C4
  ]
};

// 经典简短音乐数据
Arduino.musicMelodies = {
  'twinkle': [
    {freq: 262, duration: 500},  // C
    {freq: 262, duration: 500},  // C
    {freq: 392, duration: 500},  // G
    {freq: 392, duration: 500},  // G
    {freq: 440, duration: 500},  // A
    {freq: 440, duration: 500},  // A
    {freq: 392, duration: 1000}, // G
    {freq: 349, duration: 500},  // F
    {freq: 349, duration: 500},  // F
    {freq: 330, duration: 500},  // E
    {freq: 330, duration: 500},  // E
    {freq: 294, duration: 500},  // D
    {freq: 294, duration: 500},  // D
    {freq: 262, duration: 1000}  // C
  ],
  'birthday': [
    {freq: 262, duration: 375},  // C
    {freq: 262, duration: 125},  // C
    {freq: 294, duration: 500},  // D
    {freq: 262, duration: 500},  // C
    {freq: 349, duration: 500},  // F
    {freq: 330, duration: 1000}, // E
    {freq: 262, duration: 375},  // C
    {freq: 262, duration: 125},  // C
    {freq: 294, duration: 500},  // D
    {freq: 262, duration: 500},  // C
    {freq: 392, duration: 500},  // G
    {freq: 349, duration: 1000}  // F
  ],
  'castle': [
    {freq: 659, duration: 500},  // E5
    {freq: 698, duration: 500},  // F5
    {freq: 784, duration: 1000}, // G5
    {freq: 659, duration: 500},  // E5
    {freq: 698, duration: 500},  // F5
    {freq: 880, duration: 1500}, // A5
    {freq: 784, duration: 500},  // G5
    {freq: 659, duration: 1000}, // E5
    {freq: 523, duration: 500},  // C5
    {freq: 587, duration: 500},  // D5
    {freq: 659, duration: 1000}  // E5
  ],
  'mary': [
    {freq: 330, duration: 500},  // E4
    {freq: 294, duration: 500},  // D4
    {freq: 262, duration: 500},  // C4
    {freq: 294, duration: 500},  // D4
    {freq: 330, duration: 500},  // E4
    {freq: 330, duration: 500},  // E4
    {freq: 330, duration: 1000}, // E4
    {freq: 294, duration: 500},  // D4
    {freq: 294, duration: 500},  // D4
    {freq: 294, duration: 1000}, // D4
    {freq: 330, duration: 500},  // E4
    {freq: 392, duration: 500},  // G4
    {freq: 392, duration: 1000}  // G4
  ],
  'joy': [
    {freq: 330, duration: 500},  // E4
    {freq: 330, duration: 500},  // E4
    {freq: 349, duration: 500},  // F4
    {freq: 392, duration: 500},  // G4
    {freq: 392, duration: 500},  // G4
    {freq: 349, duration: 500},  // F4
    {freq: 330, duration: 500},  // E4
    {freq: 294, duration: 500},  // D4
    {freq: 262, duration: 500},  // C4
    {freq: 262, duration: 500},  // C4
    {freq: 294, duration: 500},  // D4
    {freq: 330, duration: 500},  // E4
    {freq: 330, duration: 750},  // E4
    {freq: 294, duration: 250},  // D4
    {freq: 294, duration: 1000}  // D4
  ],
  'mother': [
    {freq: 262, duration: 750},  // C4
    {freq: 349, duration: 250},  // F4
    {freq: 349, duration: 500},  // F4
    {freq: 349, duration: 500},  // F4
    {freq: 392, duration: 500},  // G4
    {freq: 349, duration: 500},  // F4
    {freq: 330, duration: 750},  // E4
    {freq: 262, duration: 250},  // C4
    {freq: 294, duration: 1000}, // D4
    {freq: 262, duration: 750},  // C4
    {freq: 349, duration: 250},  // F4
    {freq: 349, duration: 500},  // F4
    {freq: 392, duration: 500},  // G4
    {freq: 440, duration: 1000}  // A4
  ],
  'bee': [
    {freq: 392, duration: 500},  // G4
    {freq: 330, duration: 500},  // E4
    {freq: 330, duration: 500},  // E4
    {freq: 349, duration: 500},  // F4
    {freq: 294, duration: 1000}, // D4
    {freq: 330, duration: 500},  // E4
    {freq: 349, duration: 500},  // F4
    {freq: 392, duration: 500},  // G4
    {freq: 392, duration: 500},  // G4
    {freq: 392, duration: 1000}  // G4
  ],
  'tiger': [
    {freq: 262, duration: 500},  // C4
    {freq: 294, duration: 500},  // D4
    {freq: 330, duration: 500},  // E4
    {freq: 262, duration: 500},  // C4
    {freq: 262, duration: 500},  // C4
    {freq: 294, duration: 500},  // D4
    {freq: 330, duration: 500},  // E4
    {freq: 262, duration: 500},  // C4
    {freq: 330, duration: 500},  // E4
    {freq: 349, duration: 500},  // F4
    {freq: 392, duration: 1000}, // G4
    {freq: 330, duration: 500},  // E4
    {freq: 349, duration: 500},  // F4
    {freq: 392, duration: 1000}  // G4
  ]
};

Arduino.forBlock["io_tone"] = function (block) {
  const pin = block.getFieldValue("TONEPIN");
  const freq = Arduino.valueToCode(block, "FREQUENCY", Arduino.ORDER_ATOMIC);
  // const freq = Arduino.valueToCode(block, "FREQUENCY", Arduino.ORDER_ATOMIC);
  // Arduino.reservePin(block, pin, "OUTPUT", "Tone Pin");

  const pinSetupCode = "pinMode(" + pin + ", OUTPUT);\n";
  Arduino.addSetupBegin("io_" + pin, pinSetupCode, false);

  return `tone(${pin},${freq});\n`;
};

Arduino.forBlock["io_tone_duration"] = function (block) {
  const pin = block.getFieldValue("TONEPIN");
  const freq = Arduino.valueToCode(block, "FREQUENCY", Arduino.ORDER_ATOMIC);
  const duration = Arduino.valueToCode(block, "DURATION", Arduino.ORDER_ATOMIC);
  
  const pinSetupCode = "pinMode(" + pin + ", OUTPUT);\n";
  Arduino.addSetupBegin("io_" + pin, pinSetupCode, false);

  // 使用tone播放音调并添加延时以确保旋律正确播放
  return `tone(${pin},${freq},${duration});\ndelay(${duration});\n`;
};

Arduino.forBlock["io_system_sound"] = function (block) {
  const pin = block.getFieldValue("TONEPIN");
  const soundType = block.getFieldValue("SOUND_TYPE");
  
  const pinSetupCode = "pinMode(" + pin + ", OUTPUT);\n";
  Arduino.addSetupBegin("io_" + pin, pinSetupCode, false);

  // 获取音效数据
  const soundData = Arduino.systemSounds[soundType] || [];
  let code = '';
  
  // 为每个音符生成代码
  soundData.forEach(note => {
    if (note.freq === 0) {
      // 静音/休止符
      code += `noTone(${pin});\ndelay(${note.duration});\n`;
    } else {
      // 播放音符
      code += `tone(${pin},${note.freq},${note.duration});\ndelay(${note.duration});\n`;
    }
  });
  
  // 最后停止音调
  code += `noTone(${pin});\n`;
  
  return code;
};

Arduino.forBlock["io_music"] = function (block) {
  const pin = block.getFieldValue("TONEPIN");
  const musicType = block.getFieldValue("MUSIC_TYPE");
  
  const pinSetupCode = "pinMode(" + pin + ", OUTPUT);\n";
  Arduino.addSetupBegin("io_" + pin, pinSetupCode, false);

  // 获取音乐数据
  const musicData = Arduino.musicMelodies[musicType] || [];
  let code = '';
  
  // 为每个音符生成代码
  musicData.forEach(note => {
    if (note.freq === 0) {
      // 静音/休止符
      code += `noTone(${pin});\ndelay(${note.duration});\n`;
    } else {
      // 播放音符
      code += `tone(${pin},${note.freq},${note.duration});\ndelay(${note.duration});\n`;
    }
  });
  
  // 最后停止音调
  code += `noTone(${pin});\n`;
  
  return code;
};

Arduino.forBlock["io_note"] = function (block) {
  const note = block.getFieldValue("NOTE");
  return [note, Arduino.ORDER_ATOMIC];
};

Arduino.forBlock["io_notone"] = function (block) {
  const pin = block.getFieldValue("TONEPIN");
  // Arduino.reservePin(block, pin, "OUTPUT", "Tone Pin");

  const pinSetupCode = "pinMode(" + pin + ", OUTPUT);\n";
  Arduino.addSetupBegin("io_" + pin, pinSetupCode, false);

  return `noTone(${pin});\n`;
};
