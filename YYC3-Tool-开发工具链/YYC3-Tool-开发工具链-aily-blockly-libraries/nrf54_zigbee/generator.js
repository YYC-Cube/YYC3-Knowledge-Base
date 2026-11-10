// ============================================================
// nrf54_zigbee Blockly Generator
// Zigbee Home Automation library for nRF54L15
// ============================================================

// --- 辅助函数 ---

function ensureZigbeeLibraries(generator) {
  generator.addLibrary('zigbee_arduino', '#include <Arduino.h>');
  generator.addLibrary('zigbee_string', '#include <string.h>');
  generator.addLibrary('zigbee_hal', '#include "nrf54l15_hal.h"');
  generator.addLibrary('zigbee_stack', '#include "zigbee_stack.h"');
  generator.addLibrary('zigbee_commissioning', '#include "zigbee_commissioning.h"');
  generator.addLibrary('zigbee_persistence', '#include "zigbee_persistence.h"');
  generator.addLibrary('zigbee_security', '#include "zigbee_security.h"');
}

// 设备类型到configure方法名和集群的映射
const ZIGBEE_DEVICE_TYPE_MAP = {
  'ON_OFF_LIGHT':               { method: 'configureOnOffLight',               deviceId: '0x0100', powerSource: '0x01' },
  'DIMMABLE_LIGHT':             { method: 'configureDimmableLight',            deviceId: '0x0101', powerSource: '0x01' },
  'COLOR_LIGHT':                { method: 'configureColorDimmableLight',       deviceId: '0x0102', powerSource: '0x01' },
  'EXTENDED_COLOR_LIGHT':       { method: 'configureExtendedColorLight',       deviceId: '0x010D', powerSource: '0x01' },
  'ON_OFF_SWITCH':              { method: 'configureOnOffLightSwitch',         deviceId: '0x0103', powerSource: '0x01' },
  'TEMPERATURE_SENSOR':         { method: 'configureTemperatureSensor',        deviceId: '0x0302', powerSource: '0x03' },
  'TEMPERATURE_HUMIDITY_SENSOR':{ method: 'configureTemperatureHumiditySensor',deviceId: '0x0302', powerSource: '0x03' }
};

// 集群ID映射
const ZIGBEE_CLUSTER_MAP = {
  'ON_OFF':        { clusterId: '0x0006', attrDataType: 'ZigbeeZclDataType::kBoolean' },
  'LEVEL_CONTROL': { clusterId: '0x0008', attrDataType: 'ZigbeeZclDataType::kUint8' },
  'COLOR_CONTROL': { clusterId: '0x0300', attrDataType: 'ZigbeeZclDataType::kUint8' },
  'TEMPERATURE':   { clusterId: '0x0402', attrDataType: 'ZigbeeZclDataType::kInt16' },
  'HUMIDITY':      { clusterId: '0x0405', attrDataType: 'ZigbeeZclDataType::kUint16' },
  'POWER_CONFIG':  { clusterId: '0x0001', attrDataType: 'ZigbeeZclDataType::kUint8' }
};

// 变量重命名监听封装
function setupZigbeeVarMonitor(block, fieldName, varType) {
  const monitorKey = '_zigbeeVarMonitor_' + fieldName;
  if (block[monitorKey]) return;
  block[monitorKey] = true;

  const lastNameKey = '_zigbeeVarLastName_' + fieldName;
  block[lastNameKey] = block.getFieldValue(fieldName) || 'zigbee';
  registerVariableToBlockly(block[lastNameKey], varType);

  const field = block.getField(fieldName);
  if (field && field.onFinishEditing_) {
    const orig = field.onFinishEditing_;
    field.onFinishEditing_ = function(newName) {
      if (typeof orig === 'function') orig.call(this, newName);
      const oldName = block[lastNameKey];
      if (newName && newName !== oldName) {
        renameVariableInBlockly(block, oldName, newName, varType);
        block[lastNameKey] = newName;
      }
    };
  }
}

// ============================================================
// 初始化块
// ============================================================

Arduino.forBlock['zigbee_init'] = function(block, generator) {
  const isConnected = isBlockConnected(block);

  // 变量管理
  setupZigbeeVarMonitor(block, 'VAR', 'ZigbeeDevice');

  const varName = block.getFieldValue('VAR') || 'zigbee';
  const role = block.getFieldValue('ROLE');
  const deviceType = block.getFieldValue('DEVICE_TYPE');
  const channel = generator.valueToCode(block, 'CHANNEL', generator.ORDER_ATOMIC) || '15';
  const panId = generator.valueToCode(block, 'PAN_ID', generator.ORDER_ATOMIC) || '0x1234';

  ensureZigbeeLibraries(generator);

  const deviceInfo = ZIGBEE_DEVICE_TYPE_MAP[deviceType];
  const logicalType = (role === 'ROUTER') ? 'ZigbeeLogicalType::kRouter' : 'ZigbeeLogicalType::kEndDevice';
  const routerDevice = (role === 'ROUTER') ? '1' : '0';

  // 全局变量声明
  generator.addVariable('zigbee_namespace', 'using namespace xiao_nrf54l15;');
  generator.addObject(varName + '_radio', 'ZigbeeRadio ' + varName + '_radio;');
  generator.addObject(varName + '_device', 'ZigbeeHomeAutomationDevice ' + varName + '_device;');
  generator.addObject(varName + '_store', 'ZigbeePersistentStateStore ' + varName + '_store;');
  generator.addObject(varName + '_network', 'ZigbeeEndDeviceCommonState ' + varName + '_network{};');
  generator.addVariable(varName + '_macSeq', 'uint8_t ' + varName + '_macSeq = 1U;');
  generator.addVariable(varName + '_zclSeq', 'uint8_t ' + varName + '_zclSeq = 1U;');
  generator.addVariable(varName + '_zdoSeq', 'uint8_t ' + varName + '_zdoSeq = 1U;');
  generator.addVariable(varName + '_localIeee', 'uint64_t ' + varName + '_localIeee = 0ULL;');
  generator.addVariable(varName + '_joined', 'bool ' + varName + '_joined = false;');
  generator.addVariable(varName + '_prevOnOff', 'bool ' + varName + '_prevOnOff = false;');
  generator.addVariable(varName + '_prevLevel', 'uint8_t ' + varName + '_prevLevel = 0;');
  generator.addVariable(varName + '_prevHue', 'uint8_t ' + varName + '_prevHue = 0;');
  generator.addVariable(varName + '_prevSat', 'uint8_t ' + varName + '_prevSat = 0;');
  generator.addVariable(varName + '_channel', 'static constexpr uint8_t ' + varName + '_channel = ' + channel + ';');
  generator.addVariable(varName + '_panId', 'static constexpr uint16_t ' + varName + '_panId = ' + panId + ';');
  generator.addVariable(varName + '_routerDevice', '#define NRF54L15_CLEAN_ZIGBEE_ROUTER_DEVICE ' + routerDevice);
  generator.addVariable(varName + '_logicalType', 'static constexpr ZigbeeLogicalType ' + varName + '_logicalType = ' + logicalType + ';');
  generator.addVariable(varName + '_localEndpoint', 'static constexpr uint8_t ' + varName + '_localEndpoint = 1U;');
  generator.addVariable(varName + '_tempShort', 'static constexpr uint16_t ' + varName + '_tempShort = 0x7E01U;');
  generator.addVariable(varName + '_coordShort', 'static constexpr uint16_t ' + varName + '_coordShort = 0x0000U;');

  // 存储设备类型，供后续块使用
  if (!Arduino.zigbeeDeviceTypeMap) Arduino.zigbeeDeviceTypeMap = {};
  Arduino.zigbeeDeviceTypeMap[varName] = deviceType;

  // 生成commissioningPolicy辅助函数
  generator.addFunction(varName + '_commissioningPolicy',
    'ZigbeeCommissioningPolicy ' + varName + '_commissioningPolicy() {\n' +
    '  ZigbeeCommissioningPolicy policy{};\n' +
    '  policy.primaryChannelMask = 0x07FFF800UL;\n' +
    '  policy.secondaryChannelMask = 0U;\n' +
    '  policy.activeScanWindowMs = 400UL;\n' +
    '  policy.associationResponseTimeoutMs = 4000UL;\n' +
    '  policy.associationPollListenMs = 120UL;\n' +
    '  policy.associationPollRetryDelayMs = 40UL;\n' +
    '  policy.coordinatorRealignmentTimeoutMs = 400UL;\n' +
    '  policy.nwkRejoinResponseTimeoutMs = 1500UL;\n' +
    '  policy.preferredPanId = ' + varName + '_panId;\n' +
    '  policy.allowWellKnownKey = true;\n' +
    '  policy.allowInstallCodeKey = true;\n' +
    '  policy.requireEncryptedTransportKey = true;\n' +
    '  policy.requireEncryptedUpdateDevice = true;\n' +
    '  policy.requireEncryptedSwitchKey = true;\n' +
    '  return policy;\n' +
    '}\n');

  // 生成configureDevice辅助函数
  generator.addFunction(varName + '_configureDevice',
    'void ' + varName + '_configureDevice() {\n' +
    '  ZigbeeBasicClusterConfig basic{};\n' +
    '  basic.manufacturerName = ' + varName + '_manufacturer;\n' +
    '  basic.modelIdentifier = ' + varName + '_model;\n' +
    '  basic.swBuildId = ' + varName + '_version;\n' +
    '  basic.powerSource = ' + deviceInfo.powerSource + ';\n' +
    '  ' + varName + '_device.' + deviceInfo.method + '(' + varName + '_localEndpoint, ' +
        varName + '_localIeee, ' + varName + '_network.localShort, ' +
        varName + '_network.panId, basic, 0x0000U, ' + varName + '_logicalType);\n' +
    '}\n');

  // 默认基本信息变量
  generator.addVariable(varName + '_manufacturer', 'const char* ' + varName + '_manufacturer = "Aily";');
  generator.addVariable(varName + '_model', 'const char* ' + varName + '_model = "ZigbeeDevice";');
  generator.addVariable(varName + '_version', 'const char* ' + varName + '_version = "1.0.0";');

  // 生成发送APS帧辅助函数
  generator.addFunction(varName + '_sendApsData',
    'bool ' + varName + '_sendApsData(uint16_t dstShort, uint8_t dstEp, uint16_t clusterId,\n' +
    '                              uint16_t profileId, uint8_t srcEp, const uint8_t* payload,\n' +
    '                              uint8_t payloadLen) {\n' +
    '  if (!' + varName + '_network.joined) return false;\n' +
    '  ZigbeeApsDataFrame aps{};\n' +
    '  aps.frameType = ZigbeeApsFrameType::kData;\n' +
    '  aps.deliveryMode = 0;\n' +
    '  aps.ackRequested = true;\n' +
    '  aps.clusterId = clusterId;\n' +
    '  aps.profileId = profileId;\n' +
    '  aps.destinationEndpoint = dstEp;\n' +
    '  aps.sourceEndpoint = srcEp;\n' +
    '  aps.counter = ' + varName + '_network.apsCounter++;\n' +
    '  uint8_t apsFrame[127]; uint8_t apsLen = 0;\n' +
    '  if (!ZigbeeCodec::buildApsDataFrame(aps, payload, payloadLen, apsFrame, &apsLen)) return false;\n' +
    '  ZigbeeNetworkFrame nwk{};\n' +
    '  nwk.frameType = ZigbeeNwkFrameType::kData;\n' +
    '  nwk.securityEnabled = ' + varName + '_network.securityEnabled && ' + varName + '_network.haveActiveNetworkKey;\n' +
    '  nwk.destinationShort = dstShort;\n' +
    '  nwk.sourceShort = ' + varName + '_network.localShort;\n' +
    '  nwk.radius = 30U;\n' +
    '  nwk.sequence = ' + varName + '_network.nwkSequence++;\n' +
    '  uint8_t nwkFrame[127]; uint8_t nwkLen = 0;\n' +
    '  if (nwk.securityEnabled) {\n' +
    '    ZigbeeNwkSecurityHeader sec{};\n' +
    '    sec.valid = true;\n' +
    '    sec.securityControl = 0x05;\n' +
    '    sec.frameCounter = ' + varName + '_network.nwkSecurityFrameCounter++;\n' +
    '    sec.sourceIeee = ' + varName + '_localIeee;\n' +
    '    sec.keySequence = ' + varName + '_network.activeNetworkKeySequence;\n' +
    '    if (!ZigbeeSecurity::buildSecuredNwkFrame(nwk, sec, ' + varName + '_network.activeNetworkKey,\n' +
    '        apsFrame, apsLen, nwkFrame, &nwkLen)) return false;\n' +
    '  } else {\n' +
    '    if (!ZigbeeCodec::buildNwkFrame(nwk, apsFrame, apsLen, nwkFrame, &nwkLen)) return false;\n' +
    '  }\n' +
    '  uint8_t psdu[127]; uint8_t psduLen = 0;\n' +
    '  if (!ZigbeeRadio::buildDataFrameShort(' + varName + '_macSeq++, ' + varName + '_network.panId,\n' +
    '      dstShort, ' + varName + '_network.localShort, nwkFrame, nwkLen, psdu, &psduLen, true)) return false;\n' +
    '  return ' + varName + '_radio.transmit(psdu, psduLen, true, 1200000UL);\n' +
    '}\n');

  // 生成Zigbee主循环辅助函数
  generator.addFunction(varName + '_processLoop',
    'void ' + varName + '_processLoop() {\n' +
    '  uint32_t nowMs = millis();\n' +
    '  // 入网状态机\n' +
    '  if (!' + varName + '_network.joined) {\n' +
    '    ZigbeeCommissioningAction action = ZigbeeCommissioning::nextAction(&' + varName + '_network, nowMs);\n' +
    '    if (action == ZigbeeCommissioningAction::kJoin) {\n' +
    '      ZigbeeCommissioning::performJoin(' + varName + '_radio, &' + varName + '_macSeq,\n' +
    '        ' + varName + '_localIeee, ' + varName + '_device.macCapabilityFlags(), &' + varName + '_network);\n' +
    '    } else if (action == ZigbeeCommissioningAction::kSecureRejoin) {\n' +
    '      ZigbeeCommissioning::performSecureRejoin(' + varName + '_radio, &' + varName + '_macSeq,\n' +
    '        ' + varName + '_localIeee, ' + varName + '_device.macCapabilityFlags(), &' + varName + '_network);\n' +
    '    } else if (action == ZigbeeCommissioningAction::kSendDeviceAnnounce) {\n' +
    '      uint8_t daPayload[127]; uint8_t daLen = 0;\n' +
    '      if (' + varName + '_device.buildDeviceAnnounce(' + varName + '_zdoSeq++, daPayload, &daLen)) {\n' +
    '        // 广播设备公告\n' +
    '      }\n' +
    '      ZigbeeCommissioning::completeDeviceAnnounce(&' + varName + '_network);\n' +
    '    }\n' +
    '    return;\n' +
    '  }\n' +
    '  // 已入网：接收和处理帧\n' +
    '  ZigbeeFrame frame{};\n' +
    '  uint32_t listenUs = (' + varName + '_logicalType == ZigbeeLogicalType::kRouter) ? 4000UL : 500UL;\n' +
    '  if (' + varName + '_radio.receive(&frame, listenUs)) {\n' +
    '    ZigbeeDataFrameView macData{};\n' +
    '    if (ZigbeeRadio::parseDataFrameShort(frame.psdu, frame.length, &macData)) {\n' +
    '      ZigbeeNetworkFrame nwk{};\n' +
    '      ZigbeeNwkSecurityHeader sec{};\n' +
    '      uint8_t nwkPayload[127]; uint8_t nwkPayloadLen = 0;\n' +
    '      bool parsed = false;\n' +
    '      if (' + varName + '_network.haveActiveNetworkKey) {\n' +
    '        parsed = ZigbeeSecurity::parseSecuredNwkFrame(macData.payload, macData.payloadLength,\n' +
    '          ' + varName + '_network.activeNetworkKey, &nwk, &sec, nwkPayload, &nwkPayloadLen);\n' +
    '      }\n' +
    '      if (!parsed) {\n' +
    '        parsed = ZigbeeCodec::parseNwkFrame(macData.payload, macData.payloadLength, &nwk);\n' +
    '        if (parsed) { memcpy(nwkPayload, nwk.payload, nwk.payloadLength); nwkPayloadLen = nwk.payloadLength; }\n' +
    '      }\n' +
    '      if (parsed && nwk.frameType == ZigbeeNwkFrameType::kData) {\n' +
    '        ZigbeeApsDataFrame aps{};\n' +
    '        if (ZigbeeCodec::parseApsDataFrame(nwkPayload, nwkPayloadLen, &aps)) {\n' +
    '          if (aps.profileId == 0x0000) {\n' +
    '            // ZDO请求处理\n' +
    '            uint16_t respCluster; uint8_t zdoResp[127]; uint8_t zdoRespLen = 0;\n' +
    '            if (' + varName + '_device.handleZdoRequest(aps.clusterId, aps.payload, aps.payloadLength,\n' +
    '                &respCluster, zdoResp, &zdoRespLen)) {\n' +
    '              ' + varName + '_sendApsData(nwk.sourceShort, 0, respCluster, 0x0000, 0, zdoResp, zdoRespLen);\n' +
    '            }\n' +
    '          } else if (aps.profileId == 0x0104) {\n' +
    '            // ZCL请求处理\n' +
    '            uint8_t zclResp[127]; uint8_t zclRespLen = 0;\n' +
    '            if (' + varName + '_device.handleZclRequest(aps.clusterId, aps.payload, aps.payloadLength,\n' +
    '                zclResp, &zclRespLen)) {\n' +
    '              ' + varName + '_sendApsData(nwk.sourceShort, aps.sourceEndpoint, aps.clusterId,\n' +
    '                0x0104, ' + varName + '_localEndpoint, zclResp, zclRespLen);\n' +
    '            }\n' +
    '          }\n' +
    '        }\n' +
    '      }\n' +
    '    }\n' +
    '  }\n' +
    '  // 到期属性报告\n' +
    '  uint16_t reportCluster; uint8_t reportFrame[127]; uint8_t reportLen = 0;\n' +
    '  if (' + varName + '_device.buildDueAttributeReport(nowMs, ' + varName + '_zclSeq++,\n' +
    '      &reportCluster, reportFrame, &reportLen)) {\n' +
    '    uint64_t dstIeee; uint8_t dstEp;\n' +
    '    if (' + varName + '_device.resolveBindingDestination(' + varName + '_localEndpoint, reportCluster,\n' +
    '        &dstIeee, &dstEp)) {\n' +
    '      // TODO: resolve IEEE to short address and send\n' +
    '    }\n' +
    '    ' + varName + '_device.commitDueAttributeReport(nowMs);\n' +
    '  }\n' +
    '  // Parent polling for end devices\n' +
    '  if (ZigbeeCommissioning::usesParentPolling(' + varName + '_network) &&\n' +
    '      ZigbeeCommissioning::shouldPollParent(' + varName + '_network)) {\n' +
    '    uint8_t pollPsdu[127]; uint8_t pollLen = 0;\n' +
    '    ZigbeeRadio::buildMacCommandFrameShort(' + varName + '_macSeq++, ' + varName + '_network.panId,\n' +
    '      ' + varName + '_network.parentShort, ' + varName + '_network.localShort, 0x04,\n' +
    '      nullptr, 0, pollPsdu, &pollLen, true);\n' +
    '    ' + varName + '_radio.transmit(pollPsdu, pollLen, true, 500000UL);\n' +
    '  }\n' +
    '}\n');

  if (!isConnected) return '';

  // 生成初始化代码
  let code = '';
  code += '// 读取设备IEEE地址\n';
  code += 'if (' + varName + '_localIeee == 0ULL) ' + varName + '_localIeee = zigbeeFactoryEui64();\n';
  code += '// 初始化入网状态\n';
  code += 'ZigbeeCommissioning::initializeEndDeviceState(&' + varName + '_network,\n';
  code += '  ' + varName + '_commissioningPolicy(), ' + varName + '_channel, ' + varName + '_panId,\n';
  code += '  ' + varName + '_tempShort, ' + varName + '_coordShort, ' + varName + '_logicalType);\n';
  code += '// 初始化持久化存储\n';
  code += varName + '_store.begin("zigbee");\n';
  code += '{\n';
  code += '  ZigbeePersistentState state{};\n';
  code += '  if (' + varName + '_store.load(&state) && state.ieeeAddress == ' + varName + '_localIeee) {\n';
  code += '    ZigbeeCommissioning::restoreEndDeviceState(&' + varName + '_network, state, ' + varName + '_localIeee);\n';
  code += '  }\n';
  code += '}\n';
  code += '// 配置设备\n';
  code += varName + '_configureDevice();\n';

  return code;
};

// ============================================================
// 设置基本信息
// ============================================================

Arduino.forBlock['zigbee_set_basic_info'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const manufacturer = generator.valueToCode(block, 'MANUFACTURER', generator.ORDER_ATOMIC) || '"Aily"';
  const model = generator.valueToCode(block, 'MODEL', generator.ORDER_ATOMIC) || '"ZigbeeDevice"';
  const version = generator.valueToCode(block, 'VERSION', generator.ORDER_ATOMIC) || '"1.0.0"';

  ensureZigbeeLibraries(generator);

  // 覆盖默认值
  generator.addVariable(varName + '_manufacturer', 'const char* ' + varName + '_manufacturer = ' + manufacturer + ';');
  generator.addVariable(varName + '_model', 'const char* ' + varName + '_model = ' + model + ';');
  generator.addVariable(varName + '_version', 'const char* ' + varName + '_version = ' + version + ';');

  return '';
};

// ============================================================
// 设置安装码
// ============================================================

Arduino.forBlock['zigbee_set_install_code'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const installCode = generator.valueToCode(block, 'INSTALL_CODE', generator.ORDER_ATOMIC) || '""';

  ensureZigbeeLibraries(generator);

  // 生成解析安装码的辅助函数
  generator.addFunction(varName + '_parseInstallCode',
    'bool ' + varName + '_parseInstallCode(const char* hexStr, uint8_t* outBytes, uint8_t* outLen) {\n' +
    '  uint8_t len = 0;\n' +
    '  for (uint8_t i = 0; hexStr[i] && hexStr[i+1] && len < 18; i += 2) {\n' +
    '    uint8_t hi = (hexStr[i] >= \'a\') ? hexStr[i] - \'a\' + 10 : (hexStr[i] >= \'A\') ? hexStr[i] - \'A\' + 10 : hexStr[i] - \'0\';\n' +
    '    uint8_t lo = (hexStr[i+1] >= \'a\') ? hexStr[i+1] - \'a\' + 10 : (hexStr[i+1] >= \'A\') ? hexStr[i+1] - \'A\' + 10 : hexStr[i+1] - \'0\';\n' +
    '    outBytes[len++] = (hi << 4) | lo;\n' +
    '  }\n' +
    '  *outLen = len;\n' +
    '  return len >= 8;\n' +
    '}\n');

  generator.addVariable(varName + '_installCodeBytes', 'uint8_t ' + varName + '_installCodeBytes[18];');
  generator.addVariable(varName + '_installCodeLen', 'uint8_t ' + varName + '_installCodeLen = 0;');
  generator.addVariable(varName + '_installCodeKey', 'uint8_t ' + varName + '_installCodeKey[16];');
  generator.addVariable(varName + '_hasInstallCode', 'bool ' + varName + '_hasInstallCode = false;');

  let code = '';
  code += varName + '_parseInstallCode(' + installCode + ', ' + varName + '_installCodeBytes, &' + varName + '_installCodeLen);\n';
  code += varName + '_hasInstallCode = ZigbeeSecurity::deriveInstallCodeLinkKey(' + varName + '_installCodeBytes, ' + varName + '_installCodeLen, ' + varName + '_installCodeKey);\n';

  return code;
};

// ============================================================
// 启动Zigbee网络
// ============================================================

Arduino.forBlock['zigbee_start'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';

  ensureZigbeeLibraries(generator);

  let code = '';
  code += '// 启动Zigbee无线电\n';
  code += varName + '_radio.begin(' + varName + '_channel, 8);\n';
  code += '// 请求入网\n';
  code += 'if (!' + varName + '_network.joined) {\n';
  code += '  ZigbeeCommissioning::requestNetworkSteering(&' + varName + '_network);\n';
  code += '}\n';

  return code;
};

// ============================================================
// Zigbee轮询处理（放在loop()中）
// ============================================================

Arduino.forBlock['zigbee_loop'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';

  ensureZigbeeLibraries(generator);

  let code = '';
  code += varName + '_processLoop();\n';
  code += varName + '_device.updateIdentify(millis());\n';

  return code;
};

// ============================================================
// 是否已加入网络
// ============================================================

Arduino.forBlock['zigbee_is_joined'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';

  ensureZigbeeLibraries(generator);
  return [varName + '_network.joined', generator.ORDER_MEMBER];
};

// ============================================================
// 设置开关状态
// ============================================================

Arduino.forBlock['zigbee_set_on_off'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const state = block.getFieldValue('STATE');

  ensureZigbeeLibraries(generator);
  return varName + '_device.setOnOff(' + (state === 'TRUE' ? 'true' : 'false') + ');\n';
};

// ============================================================
// 获取开关状态
// ============================================================

Arduino.forBlock['zigbee_get_on_off'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';

  ensureZigbeeLibraries(generator);
  return [varName + '_device.onOff()', generator.ORDER_FUNCTION_CALL];
};

// ============================================================
// 设置亮度
// ============================================================

Arduino.forBlock['zigbee_set_level'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const level = generator.valueToCode(block, 'LEVEL', generator.ORDER_ATOMIC) || '128';

  ensureZigbeeLibraries(generator);
  return varName + '_device.setLevel(' + level + ');\n';
};

// ============================================================
// 获取亮度
// ============================================================

Arduino.forBlock['zigbee_get_level'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';

  ensureZigbeeLibraries(generator);
  return [varName + '_device.level()', generator.ORDER_FUNCTION_CALL];
};

// ============================================================
// 设置色相和饱和度
// ============================================================

Arduino.forBlock['zigbee_set_color_hs'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const hue = generator.valueToCode(block, 'HUE', generator.ORDER_ATOMIC) || '0';
  const saturation = generator.valueToCode(block, 'SATURATION', generator.ORDER_ATOMIC) || '0';

  ensureZigbeeLibraries(generator);
  return varName + '_device.setColorHueSaturation(' + hue + ', ' + saturation + ');\n';
};

// ============================================================
// 设置色温
// ============================================================

Arduino.forBlock['zigbee_set_color_temp'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const colorTemp = generator.valueToCode(block, 'COLOR_TEMP', generator.ORDER_ATOMIC) || '250';

  ensureZigbeeLibraries(generator);
  return varName + '_device.setColorTemperatureMireds(' + colorTemp + ');\n';
};

// ============================================================
// 设置温度
// ============================================================

Arduino.forBlock['zigbee_set_temperature'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const temperature = generator.valueToCode(block, 'TEMPERATURE', generator.ORDER_ATOMIC) || '25.0';

  ensureZigbeeLibraries(generator);
  // 转换为厘度 (centidegrees)
  return varName + '_device.setTemperatureState((int16_t)(' + temperature + ' * 100), -4000, 8500, 10);\n';
};

// ============================================================
// 设置湿度
// ============================================================

Arduino.forBlock['zigbee_set_humidity'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const humidity = generator.valueToCode(block, 'HUMIDITY', generator.ORDER_ATOMIC) || '50.0';

  ensureZigbeeLibraries(generator);
  // 转换为厘百分比 (centipercent)
  return varName + '_device.setHumidityState((uint16_t)(' + humidity + ' * 100), 0, 10000, 10);\n';
};

// ============================================================
// 设置电池状态
// ============================================================

Arduino.forBlock['zigbee_set_battery'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const voltage = generator.valueToCode(block, 'VOLTAGE', generator.ORDER_ATOMIC) || '30';
  const percentage = generator.valueToCode(block, 'PERCENTAGE', generator.ORDER_ATOMIC) || '100';

  ensureZigbeeLibraries(generator);
  // percentage需要乘以2（协议定义为half-percentage）
  return varName + '_device.setBatteryStatus(' + voltage + ', (uint8_t)(' + percentage + ' * 2));\n';
};

// ============================================================
// 是否正在识别
// ============================================================

Arduino.forBlock['zigbee_is_identifying'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';

  ensureZigbeeLibraries(generator);
  return [varName + '_device.identifying()', generator.ORDER_FUNCTION_CALL];
};

// ============================================================
// 配置属性报告
// ============================================================

Arduino.forBlock['zigbee_configure_reporting'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const cluster = block.getFieldValue('CLUSTER');
  const attrId = generator.valueToCode(block, 'ATTR_ID', generator.ORDER_ATOMIC) || '0x0000';
  const minInterval = generator.valueToCode(block, 'MIN_INTERVAL', generator.ORDER_ATOMIC) || '1';
  const maxInterval = generator.valueToCode(block, 'MAX_INTERVAL', generator.ORDER_ATOMIC) || '30';

  ensureZigbeeLibraries(generator);
  const clusterInfo = ZIGBEE_CLUSTER_MAP[cluster];

  return varName + '_device.configureReporting(' + clusterInfo.clusterId + ', ' +
    attrId + ', ' + clusterInfo.attrDataType + ', ' + minInterval + ', ' + maxInterval + ', 0);\n';
};

// ============================================================
// 事件回调块 - 开关状态变化
// ============================================================

Arduino.forBlock['zigbee_on_state_change'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const handlerCode = generator.statementToCode(block, 'DO');

  ensureZigbeeLibraries(generator);

  const callbackName = varName + '_onStateChange';
  generator.addFunction(callbackName,
    'void ' + callbackName + '() {\n' +
    handlerCode +
    '}\n');

  // 在loop函数生成中插入状态变化检测
  generator.addFunction(varName + '_checkStateChange',
    'void ' + varName + '_checkStateChange() {\n' +
    '  bool currentOnOff = ' + varName + '_device.onOff();\n' +
    '  if (currentOnOff != ' + varName + '_prevOnOff) {\n' +
    '    ' + varName + '_prevOnOff = currentOnOff;\n' +
    '    ' + callbackName + '();\n' +
    '  }\n' +
    '}\n');

  return '';
};

// ============================================================
// 事件回调块 - 亮度变化
// ============================================================

Arduino.forBlock['zigbee_on_level_change'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const handlerCode = generator.statementToCode(block, 'DO');

  ensureZigbeeLibraries(generator);

  const callbackName = varName + '_onLevelChange';
  generator.addFunction(callbackName,
    'void ' + callbackName + '() {\n' +
    handlerCode +
    '}\n');

  generator.addFunction(varName + '_checkLevelChange',
    'void ' + varName + '_checkLevelChange() {\n' +
    '  uint8_t currentLevel = ' + varName + '_device.level();\n' +
    '  if (currentLevel != ' + varName + '_prevLevel) {\n' +
    '    ' + varName + '_prevLevel = currentLevel;\n' +
    '    ' + callbackName + '();\n' +
    '  }\n' +
    '}\n');

  return '';
};

// ============================================================
// 事件回调块 - 颜色变化
// ============================================================

Arduino.forBlock['zigbee_on_color_change'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const handlerCode = generator.statementToCode(block, 'DO');

  ensureZigbeeLibraries(generator);

  const callbackName = varName + '_onColorChange';
  generator.addFunction(callbackName,
    'void ' + callbackName + '() {\n' +
    handlerCode +
    '}\n');

  generator.addFunction(varName + '_checkColorChange',
    'void ' + varName + '_checkColorChange() {\n' +
    '  const ZigbeeHomeAutomationConfig& cfg = ' + varName + '_device.config();\n' +
    '  uint8_t h = cfg.colorControl.currentHue;\n' +
    '  uint8_t s = cfg.colorControl.currentSaturation;\n' +
    '  if (h != ' + varName + '_prevHue || s != ' + varName + '_prevSat) {\n' +
    '    ' + varName + '_prevHue = h;\n' +
    '    ' + varName + '_prevSat = s;\n' +
    '    ' + callbackName + '();\n' +
    '  }\n' +
    '}\n');

  return '';
};

// ============================================================
// 事件回调块 - 加入网络
// ============================================================

Arduino.forBlock['zigbee_on_join'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';
  const handlerCode = generator.statementToCode(block, 'DO');

  ensureZigbeeLibraries(generator);

  const callbackName = varName + '_onJoin';
  generator.addFunction(callbackName,
    'void ' + callbackName + '() {\n' +
    handlerCode +
    '}\n');

  generator.addFunction(varName + '_checkJoinChange',
    'void ' + varName + '_checkJoinChange() {\n' +
    '  bool currentJoined = ' + varName + '_network.joined;\n' +
    '  if (currentJoined && !' + varName + '_joined) {\n' +
    '    ' + varName + '_joined = true;\n' +
    '    ' + callbackName + '();\n' +
    '  } else if (!currentJoined) {\n' +
    '    ' + varName + '_joined = false;\n' +
    '  }\n' +
    '}\n');

  return '';
};

// ============================================================
// 保存网络状态
// ============================================================

Arduino.forBlock['zigbee_persist_save'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';

  ensureZigbeeLibraries(generator);

  generator.addFunction(varName + '_persistState',
    'bool ' + varName + '_persistState() {\n' +
    '  ZigbeePersistentState state{};\n' +
    '  ZigbeeCommissioning::populatePersistentState(' + varName + '_network,\n' +
    '    ' + varName + '_localIeee, ' + varName + '_logicalType, 0x0000U, &state);\n' +
    '  state.onOffState = ' + varName + '_device.onOff();\n' +
    '  // 保存报告配置\n' +
    '  const ZigbeeReportingConfiguration* rpt = ' + varName + '_device.reportingConfigurations();\n' +
    '  uint8_t cnt = 0;\n' +
    '  for (uint8_t i = 0; i < 8 && cnt < 8; ++i) {\n' +
    '    if (rpt[i].used) state.reporting[cnt++] = rpt[i];\n' +
    '  }\n' +
    '  state.reportingCount = cnt;\n' +
    '  // 保存绑定\n' +
    '  const ZigbeeBindingEntry* bind = ' + varName + '_device.bindings();\n' +
    '  cnt = 0;\n' +
    '  for (uint8_t i = 0; i < 8 && cnt < 8; ++i) {\n' +
    '    if (bind[i].used) state.bindings[cnt++] = bind[i];\n' +
    '  }\n' +
    '  state.bindingCount = cnt;\n' +
    '  return ' + varName + '_store.save(state);\n' +
    '}\n');

  return varName + '_persistState();\n';
};

// ============================================================
// 清除网络状态
// ============================================================

Arduino.forBlock['zigbee_persist_clear'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';

  ensureZigbeeLibraries(generator);
  return varName + '_store.clear();\n';
};

// ============================================================
// 重新加入网络
// ============================================================

Arduino.forBlock['zigbee_rejoin'] = function(block, generator) {
  const varField = block.getField('VAR');
  const varName = varField ? varField.getText() : 'zigbee';

  ensureZigbeeLibraries(generator);

  let code = '';
  code += 'ZigbeeCommissioning::requestSecureRejoin(&' + varName + '_network);\n';
  return code;
};
