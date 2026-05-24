FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_NDK_HOME=$ANDROID_HOME/ndk/23.0.7599858
ENV TOOLCHAINS_PATH=$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64
ENV PATH="$TOOLCHAINS_PATH/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
RUN apt update && apt install -y \
    curl unzip openjdk-11-jdk cmake ninja-build build-essential \
    git python3 wget autoconf automake libtool pkg-config file && \
    ln -sf /usr/bin/python3 /usr/bin/python && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://raw.githubusercontent.com/tj/n/master/bin/n | bash -s install 17.1.0 && npm install -g yarn
RUN mkdir -p $ANDROID_HOME/cmdline-tools && cd /tmp && \
    curl -sO https://dl.google.com/android/repository/commandlinetools-linux-8512546_latest.zip && \
    unzip -q commandlinetools-linux-8512546_latest.zip && \
    mkdir -p $ANDROID_HOME/cmdline-tools/latest && \
    mv cmdline-tools/* $ANDROID_HOME/cmdline-tools/latest/ && rm -rf /tmp/* && \
    yes | sdkmanager --licenses 2>/dev/null || true && \
    sdkmanager "platforms;android-29" "build-tools;29.0.2" "platform-tools" "ndk;23.0.7599858" "cmake;3.22.1"
RUN touch $TOOLCHAINS_PATH/sysroot/usr/include/xlocale.h
WORKDIR /build
