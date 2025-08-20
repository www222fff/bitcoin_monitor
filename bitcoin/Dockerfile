FROM ubuntu:22.04

# 1. 先以root安装系统依赖和创建用户
RUN apt-get update && apt-get install -y \
    libboost-filesystem1.74.0 \
    libboost-thread1.74.0 \
    libevent-2.1-7 \
    libevent-pthreads-2.1-7 \
    libzmq5 \
    libminiupnpc17 \
    libsodium23 \
    libsqlite3-0 \
    libpgm-5.3-0 \
    libbsd0 \
    krb5-user \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 2. 创建bitcoin用户
RUN useradd -r -m -u 1000 -s /bin/bash bitcoin

# 3. 创建比特币数据目录并设置权限
RUN mkdir -p /home/bitcoin/.bitcoin && \
    chown bitcoin:bitcoin /home/bitcoin/.bitcoin

# 4. 复制系统文件（需要root权限）
COPY libdb_cxx-4.8.so /usr/local/lib/
COPY bitcoind /usr/local/bin/
RUN ldconfig

# 5. 复制配置文件并设置正确所有者
COPY --chown=bitcoin:bitcoin bitcoin.conf /home/bitcoin/.bitcoin/bitcoin.conf

# 6. 切换到bitcoin用户
USER bitcoin
WORKDIR /home/bitcoin/.bitcoin

# 暴露端口
EXPOSE 8332 8333

# 7. 使用完整路径启动bitcoind
CMD ["/usr/local/bin/bitcoind", "-conf=/home/bitcoin/.bitcoin/bitcoin.conf", "-printtoconsole"]
