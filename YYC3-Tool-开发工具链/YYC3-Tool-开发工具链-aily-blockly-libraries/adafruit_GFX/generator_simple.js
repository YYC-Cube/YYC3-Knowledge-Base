// 简化版本的图像文件扩展，避免事件系统问题

// 添加文件选择器扩展 - 简化版本
if (typeof Blockly !== 'undefined' && Blockly.Extensions) {
  Blockly.Extensions.register('tft_image_file_extension_simple', function() {
    const block = this;
    const fileField = this.getField('FILE_PATH');
    
    if (fileField) {
      // 初始化全局图片缓存
      if (!window.tftImageCache) {
        window.tftImageCache = {};
      }
      
      // 创建文件选择器
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      
      // 显示用户友好的消息
      function showUserMessage(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // 可选：显示在页面上
        if (typeof alert !== 'undefined' && type === 'error') {
          alert(message);
        }
      }
      
      // 处理文件选择
      input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
          console.log(`🔍 [文件选择] 选择文件: ${file.name}, 类型: ${file.type}, 大小: ${file.size}`);
          showUserMessage(`正在处理图片: ${file.name}...`, 'info');
          
          // 验证文件类型和大小
          if (!file.type.startsWith('image/')) {
            showUserMessage('请选择有效的图片文件！', 'error');
            return;
          }
          
          if (file.size > 5 * 1024 * 1024) { // 5MB限制
            showUserMessage('图片文件过大，请选择小于5MB的文件', 'error');
            return;
          }
          
          // 立即更新字段显示
          fileField.setValue(file.name);
          
          // 读取文件并转换
          const reader = new FileReader();
          reader.onload = function(event) {
            console.log(`📖 文件读取完成: ${file.name}`);
            
            const img = new Image();
            img.onload = function() {
              console.log(`🖼️ 图片加载完成: ${img.width}x${img.height}`);
              showUserMessage(`图片 ${file.name} 处理中...`, 'info');
              
              // 预处理多种常用尺寸
              const commonSizes = [16, 24, 32, 48, 64, 96, 128];
              const processedSizes = {};
              let processedCount = 0;
              
              commonSizes.forEach(size => {
                try {
                  // 创建canvas进行图像处理
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  canvas.width = size;
                  canvas.height = size;
                  
                  // 计算缩放和居中
                  const scale = Math.min(size / img.width, size / img.height);
                  const scaledWidth = img.width * scale;
                  const scaledHeight = img.height * scale;
                  const offsetX = (size - scaledWidth) / 2;
                  const offsetY = (size - scaledHeight) / 2;
                  
                  // 绘制图像
                  ctx.fillStyle = '#000000';
                  ctx.fillRect(0, 0, size, size);
                  ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
                  
                  // 获取像素数据
                  const pixelData = ctx.getImageData(0, 0, size, size);
                  const data = pixelData.data;
                  
                  // 转换为RGB565数组
                  const rgb565Array = [];
                  for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // 转换为RGB565
                    const r5 = (r >> 3) & 0x1F;
                    const g6 = (g >> 2) & 0x3F;
                    const b5 = (b >> 3) & 0x1F;
                    const rgb565 = (r5 << 11) | (g6 << 5) | b5;
                    
                    rgb565Array.push(`0x${rgb565.toString(16).padStart(4, '0').toUpperCase()}`);
                  }
                  
                  processedSizes[size] = rgb565Array;
                  processedCount++;
                  console.log(`✅ 处理尺寸 ${size}x${size}: ${rgb565Array.length} 像素`);
                  
                } catch (sizeError) {
                  console.error(`❌ 处理尺寸 ${size} 时出错:`, sizeError);
                }
              });
              
              // 存储到全局缓存
              const cacheKeys = [file.name, file.name.toLowerCase(), file.name.replace(/\s+/g, '_')];
              cacheKeys.forEach(key => {
                window.tftImageCache[key] = {
                  fileName: file.name,
                  originalWidth: img.width,
                  originalHeight: img.height,
                  processedSizes: processedSizes,
                  imageElement: img,
                  processedAt: Date.now(),
                  processedCount: processedCount
                };
              });
              
              // 简单地更新字段值，不触发复杂事件
              fileField.setValue(file.name);
              
              showUserMessage(`图片 ${file.name} 处理完成！支持尺寸: ${Object.keys(processedSizes).join(', ')}`, 'success');
              console.log(`🎯 图片缓存成功: ${file.name}`);
              console.log(`📊 可用尺寸: ${Object.keys(processedSizes).join(', ')}`);
              console.log(`🗂️ 缓存键: ${cacheKeys.join(', ')}`);
              
            };
            
            img.onerror = function() {
              console.error(`❌ 图片加载失败: ${file.name}`);
              showUserMessage(`图片 ${file.name} 加载失败！`, 'error');
            };
            
            img.src = event.target.result;
          };
          
          reader.onerror = function() {
            console.error(`❌ 文件读取失败: ${file.name}`);
            showUserMessage(`文件 ${file.name} 读取失败！`, 'error');
          };
          
          reader.readAsDataURL(file);
        }
      };
      
      // 点击字段时打开文件选择器
      fileField.onMouseDown_ = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // 清除之前的警告
        console.log('打开文件选择器...');
        
        input.click();
      };
       
       // 添加到DOM
       document.body.appendChild(input);
     }
   });
}
