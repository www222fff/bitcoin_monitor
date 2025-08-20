FROM ubuntu:22.04

# 安装运行所需依赖
RUN apt-get update && apt-get install -y \
    libevent-2.1-7 \
    libboost-system1.74.0 \
    libboost-filesystem1.74.0 \
    libboost-thread1.74.0 \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*


RUN apt-get update && apt-get install -y git git-lfs
RUN git lfs install

WORKDIR /src
# 克隆代码（包含 LFS 文件）
RUN git clone https://github.com/www222fff/bitcoin_monitor.git .
RUN git lfs pull

RUN ls -lh

# 创建目录
RUN mkdir -p /usr/local/bin /root/.bitcoin

# 拷贝编译好的二进制
COPY bitcoind /usr/local/bin/
COPY bitcoin-cli /usr/local/bin/

# 拷贝配置文件
COPY bitcoin.conf /root/.bitcoin/bitcoin.conf

# 暴露端口
EXPOSE 8332 8333

# 启动 bitcoind
CMD ["bitcoind", "-conf=/root/.bitcoin/bitcoin.conf", "-printtoconsole"]
