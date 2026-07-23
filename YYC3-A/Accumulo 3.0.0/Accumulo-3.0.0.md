# 部署 Accumulo 3.0.0

基于M4 Max（16 核 + 128GB 超大内存）的高性能环境，**性能最大化**的部署命令清单，充分利用多核和大内存优势，同时保留全流程的易执行性：

### 适配 M4 Max (16核/128GB) 的完整部署命令
#### 一、环境准备（仅调整 Java 环境验证，其余不变）
```bash
# 1. 安装 Homebrew（已装跳过）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. 安装 JDK 11（Accumulo 3.x 推荐版本）
brew install openjdk@11

# 3. 配置 JAVA_HOME（永久生效，适配 zsh 终端）
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 11)' >> ~/.zshrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.zshrc
source ~/.zshrc

# 4. 验证 Java 环境（输出 11.x.x 即正常）
java -version

# 5. 安装 wget（手动下载可跳过）
brew install wget
```

#### 二、下载 & 解压 Accumulo 3.0.0
```bash
# 1. 创建工作目录
mkdir -p ~/accumulo && cd ~/accumulo

# 2. 下载二进制包（官方镜像）
wget https://archive.apache.org/dist/accumulo/3.0.0/accumulo-3.0.0-bin.tar.gz

# 3. 解压（校验完整性）
tar -zxvf accumulo-3.0.0-bin.tar.gz
cd accumulo-3.0.0
```

#### 三、高性能单节点配置（核心优化）
```bash
# 1. 复制单节点配置模板
cp conf/examples/standalone/conf/* conf/

# 2. 优化内存/多核参数（适配 128GB 内存 + 16 核 CPU）
# 调整 TServer（数据节点）内存为 8G，Master（主节点）为 4G，开启多核利用
sed -i '' 's/ACCUMULO_TSERVER_OPTS="-Xmx1g"/ACCUMULO_TSERVER_OPTS="-Xmx8g -XX:+UseParallelGC"/g' conf/accumulo-env.sh
sed -i '' 's/ACCUMULO_MASTER_OPTS="-Xmx1g"/ACCUMULO_MASTER_OPTS="-Xmx4g -XX:+UseParallelGC"/g' conf/accumulo-env.sh
# 额外优化 GC 和线程参数（利用 16 核优势）
echo 'ACCUMULO_GENERAL_OPTS="-Djava.awt.headless=true -XX:+UseG1GC -XX:ParallelGCThreads=8 -XX:ConcGCThreads=2"' >> conf/accumulo-env.sh

# 3. 初始化集群（设置 root 密码，示例为 123456，可自定义）
./bin/accumulo init --instance-name accumulo-m4max --password 123456
```

#### 四、启动 & 性能测试
```bash
# 1. 启动集群（利用多核，启动速度更快）
./bin/accumulo-cluster start

# 2. 验证集群状态（所有服务应显示 Running）
./bin/accumulo-cluster status

# 3. 进入 Shell 做高并发测试（适配大内存）
./bin/accumulo shell -u root

# --------------------------
# Shell 内高性能测试命令
# --------------------------
# 创建高性能表（开启预分区，适配多核）
create table big_table -splits 1,2,3,4,5,6,7,8,9
# 批量插入数据（测试 128GB 内存的写入性能）
for i in {1..10000}; do insert r$i cf1:cq$i "value_$i"; done
# 批量查询（验证多核读取）
scan big_table -b r1 -e r5000
# 退出 Shell
exit
```

#### 五、停止 & 清理（可选）
```bash
# 停止集群
./bin/accumulo-cluster stop

# （可选）重置集群（清理数据）
rm -rf ./data
```

### 关键优化说明（针对 M4 Max 环境）
1. **内存参数**：将 TServer 内存从 1G 提升到 8G、Master 从 1G 提升到 4G，充分利用 128GB 物理内存，避免内存瓶颈；
2. **GC 优化**：启用 G1GC（适合大内存），设置 `ParallelGCThreads=8` 适配 16 核 CPU，平衡垃圾回收效率和 CPU 占用；
3. **表分区**：创建表时设置预分区，让 16 核 CPU 能并行处理数据读写，最大化多核优势。

### 总结
1. M4 Max（16核/128GB）环境无需限制内存，核心是**调高 Accumulo 服务内存配额** + 优化 GC/线程参数，发挥硬件性能；
2. 关键命令：`sed` 调整内存/GC 参数、`create table -splits` 做表分区、`accumulo-cluster start` 启动集群；
3. 大内存环境下建议开启 G1GC 而非默认 GC，避免频繁 Full GC 影响性能。