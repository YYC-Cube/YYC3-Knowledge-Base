// AnimatedGIF Blockly 代码生成器
// 用于在TFT显示屏上播放GIF动画

// GIFDraw回调函数代码（用于将GIF帧渲染到TFT显示屏）
var _gifDrawFunctionDef =
'void _GIFDraw(GIFDRAW *pDraw) {\n' +
'  uint8_t *s;\n' +
'  uint16_t *d, *usPalette, usTemp[320];\n' +
'  int x, y, iWidth;\n' +
'  iWidth = pDraw->iWidth;\n' +
'  if (iWidth + pDraw->iX > tft.width())\n' +
'    iWidth = tft.width() - pDraw->iX;\n' +
'  usPalette = pDraw->pPalette;\n' +
'  y = pDraw->iY + pDraw->y + _gif_yOffset;\n' +
'  if (y >= tft.height() || pDraw->iX + _gif_xOffset >= tft.width() || iWidth < 1)\n' +
'    return;\n' +
'  s = pDraw->pPixels;\n' +
'  if (pDraw->ucDisposalMethod == 2) {\n' +
'    for (x = 0; x < iWidth; x++) {\n' +
'      if (s[x] == pDraw->ucTransparent)\n' +
'        s[x] = pDraw->ucBackground;\n' +
'    }\n' +
'    pDraw->ucHasTransparency = 0;\n' +
'  }\n' +
'  if (pDraw->ucHasTransparency) {\n' +
'    uint8_t *pEnd, c, ucTransparent = pDraw->ucTransparent;\n' +
'    int x, iCount;\n' +
'    pEnd = s + iWidth;\n' +
'    x = 0;\n' +
'    iCount = 0;\n' +
'    while (x < iWidth) {\n' +
'      c = ucTransparent - 1;\n' +
'      d = usTemp;\n' +
'      while (c != ucTransparent && s < pEnd) {\n' +
'        c = *s++;\n' +
'        if (c == ucTransparent) {\n' +
'          s--;\n' +
'        } else {\n' +
'          *d++ = usPalette[c];\n' +
'          iCount++;\n' +
'        }\n' +
'      }\n' +
'      if (iCount) {\n' +
'        tft.startWrite();\n' +
'        tft.setAddrWindow(pDraw->iX + x + _gif_xOffset, y, iCount, 1);\n' +
'        tft.writePixels(usTemp, iCount, false, false);\n' +
'        tft.endWrite();\n' +
'        x += iCount;\n' +
'        iCount = 0;\n' +
'      }\n' +
'      c = ucTransparent;\n' +
'      while (c == ucTransparent && s < pEnd) {\n' +
'        c = *s++;\n' +
'        if (c == ucTransparent)\n' +
'          iCount++;\n' +
'        else\n' +
'          s--;\n' +
'      }\n' +
'      if (iCount) {\n' +
'        x += iCount;\n' +
'        iCount = 0;\n' +
'      }\n' +
'    }\n' +
'  } else {\n' +
'    s = pDraw->pPixels;\n' +
'    for (x = 0; x < iWidth; x++)\n' +
'      usTemp[x] = usPalette[*s++];\n' +
'    tft.startWrite();\n' +
'    tft.setAddrWindow(pDraw->iX + _gif_xOffset, y, iWidth, 1);\n' +
'    tft.writePixels(usTemp, iWidth, false, false);\n' +
'    tft.endWrite();\n' +
'  }\n' +
'}\n';

// SD卡文件回调函数
var _gifSDOpenFunctionDef =
'void *_GIFOpenFile(const char *fname, int32_t *pSize) {\n' +
'  _gif_sd_file = SD.open(fname);\n' +
'  if (_gif_sd_file) {\n' +
'    *pSize = _gif_sd_file.size();\n' +
'    return (void *)&_gif_sd_file;\n' +
'  }\n' +
'  return NULL;\n' +
'}\n';

var _gifSDCloseFunctionDef =
'void _GIFCloseFile(void *pHandle) {\n' +
'  File *f = static_cast<File *>(pHandle);\n' +
'  if (f) f->close();\n' +
'}\n';

var _gifSDReadFunctionDef =
'int32_t _GIFReadFile(GIFFILE *pFile, uint8_t *pBuf, int32_t iLen) {\n' +
'  int32_t iBytesRead = iLen;\n' +
'  File *f = static_cast<File *>(pFile->fHandle);\n' +
'  if ((pFile->iSize - pFile->iPos) < iLen)\n' +
'    iBytesRead = pFile->iSize - pFile->iPos - 1;\n' +
'  if (iBytesRead <= 0) return 0;\n' +
'  iBytesRead = (int32_t)f->read(pBuf, iBytesRead);\n' +
'  pFile->iPos = f->position();\n' +
'  return iBytesRead;\n' +
'}\n';

var _gifSDSeekFunctionDef =
'int32_t _GIFSeekFile(GIFFILE *pFile, int32_t iPosition) {\n' +
'  File *f = static_cast<File *>(pFile->fHandle);\n' +
'  f->seek(iPosition);\n' +
'  pFile->iPos = (int32_t)f->position();\n' +
'  return pFile->iPos;\n' +
'}\n';

// ===== gif_init: 初始化GIF播放器 =====
Arduino.forBlock['gif_init'] = function(block, generator) {
  // 变量重命名监听器
  if (!block._gifVarMonitorAttached) {
    block._gifVarMonitorAttached = true;
    block._gifVarLastName = block.getFieldValue('VAR') || 'gif';
    registerVariableToBlockly(block._gifVarLastName, 'AnimatedGIF');
    var varField = block.getField('VAR');
    if (varField) {
      var originalFinishEditing = varField.onFinishEditing_;
      varField.onFinishEditing_ = function(newName) {
        if (typeof originalFinishEditing === 'function') {
          originalFinishEditing.call(this, newName);
        }
        var workspace = block.workspace || (typeof Blockly !== 'undefined' && Blockly.getMainWorkspace && Blockly.getMainWorkspace());
        var oldName = block._gifVarLastName;
        if (workspace && newName && newName !== oldName) {
          renameVariableInBlockly(block, oldName, newName, 'AnimatedGIF');
          block._gifVarLastName = newName;
        }
      };
    }
  }

  var varName = block.getFieldValue('VAR') || 'gif';

  // 添加库
  generator.addLibrary('AnimatedGIF', '#include <AnimatedGIF.h>');

  // 注册变量
  registerVariableToBlockly(varName, 'AnimatedGIF');

  // 添加全局对象
  generator.addObject('AnimatedGIF_' + varName, 'AnimatedGIF ' + varName + ';');

  // 添加GIF位置偏移全局变量
  generator.addVariable('_gif_xOffset', 'int _gif_xOffset = 0;');
  generator.addVariable('_gif_yOffset', 'int _gif_yOffset = 0;');

  // 添加GIFDraw回调函数
  generator.addFunction('_GIFDraw', _gifDrawFunctionDef);

  // 生成初始化代码
  return varName + '.begin(GIF_PALETTE_RGB565_LE);\n';
};

// ===== gif_open_memory: 从内存打开GIF =====
Arduino.forBlock['gif_open_memory'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'gif';
  var header = block.getFieldValue('HEADER') || 'image.h';
  var array = block.getFieldValue('ARRAY') || 'ucImage';
  var x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';

  // 添加GIF数据头文件
  generator.addLibrary('gif_data_' + header.replace(/[^a-zA-Z0-9]/g, '_'), '#include "' + header + '"');

  // 生成代码
  var code = '_gif_xOffset = ' + x + ';\n';
  code += '_gif_yOffset = ' + y + ';\n';
  code += varName + '.open((uint8_t *)' + array + ', sizeof(' + array + '), _GIFDraw);\n';

  return code;
};

// ===== gif_open_sd: 从SD卡打开GIF =====
Arduino.forBlock['gif_open_sd'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'gif';
  var filename = generator.valueToCode(block, 'FILENAME', generator.ORDER_ATOMIC) || '"/animation.gif"';
  var x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';

  // 添加SD库
  generator.addLibrary('SD', '#include <SD.h>');

  // 添加SD文件全局变量
  generator.addVariable('_gif_sd_file', 'File _gif_sd_file;');

  // 添加SD文件回调函数
  generator.addFunction('_GIFOpenFile', _gifSDOpenFunctionDef);
  generator.addFunction('_GIFCloseFile', _gifSDCloseFunctionDef);
  generator.addFunction('_GIFReadFile', _gifSDReadFunctionDef);
  generator.addFunction('_GIFSeekFile', _gifSDSeekFunctionDef);

  // 确保SD初始化
  generator.addSetupBegin('sd_begin', 'SD.begin();');

  // 生成代码
  var code = '_gif_xOffset = ' + x + ';\n';
  code += '_gif_yOffset = ' + y + ';\n';
  code += varName + '.open(' + filename + ', _GIFOpenFile, _GIFCloseFile, _GIFReadFile, _GIFSeekFile, _GIFDraw);\n';

  return code;
};

// ===== gif_play_frame: 播放一帧 =====
Arduino.forBlock['gif_play_frame'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'gif';
  var sync = block.getFieldValue('SYNC') || 'true';

  return [varName + '.playFrame(' + sync + ', NULL)', generator.ORDER_ATOMIC];
};

// ===== gif_play_all: 播放全部帧 =====
Arduino.forBlock['gif_play_all'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'gif';

  return 'while (' + varName + '.playFrame(true, NULL)) {}\n';
};

// ===== gif_close: 关闭GIF =====
Arduino.forBlock['gif_close'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'gif';

  return varName + '.close();\n';
};

// ===== gif_get_width: 获取画布宽度 =====
Arduino.forBlock['gif_get_width'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'gif';

  return [varName + '.getCanvasWidth()', generator.ORDER_ATOMIC];
};

// ===== gif_get_height: 获取画布高度 =====
Arduino.forBlock['gif_get_height'] = function(block, generator) {
  var varField = block.getField('VAR');
  var varName = varField ? varField.getText() : 'gif';

  return [varName + '.getCanvasHeight()', generator.ORDER_ATOMIC];
};
