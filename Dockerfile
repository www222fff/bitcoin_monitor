FROM ubuntu:22.04

# 安装 bitcoind 依赖的系统库
RUN apt-get update && apt-get install -y \
    libboost-filesystem1.74.0 \
    libboost-thread1.74.0 \
    libevent-2.1-7 \
    libzmq5 \
    libminiupnpc17 \
    libsodium23 \
    libsqlite3-0 \
    libpgm-5.3-0 \
    libbsd0 \
    krb5-user \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 创建目录
RUN mkdir -p /usr/local/bin /root/.bitcoin /usr/local/lib

COPY libdb_cxx-4.8.so /usr/local/lib/
RUN ldconfig

# 拷贝编译好的二进制
COPY bitcoind /usr/local/bin/
COPY bitcoin-cli /usr/local/bin/

# 拷贝配置文件
COPY bitcoin.conf /root/.bitcoin/bitcoin.conf

# 暴露端口
EXPOSE 8332 8333

# 启动 bitcoind
CMD ["bitcoind", "-conf=/root/.bitcoin/bitcoin.conf", "-printtoconsole"]
