#!/bin/bash
# ══════════════════════════════════════════════════════════
# MevaCoin Miner — Build Completo Docker v9
# Pool mining + config.ts integrato + blur fix
# Idempotente: rilancia quante volte vuoi, riparte da dove serve
# Solo ARM + ARM64 (telefoni reali)
# ══════════════════════════════════════════════════════════

PROJECT_DIR="$HOME/androidminer"
cd "$PROJECT_DIR"

# ── Config MevaCoin ──
MEVA_ALGO="rx/0"
MEVA_POOL="82.165.218.56:3333"
MEVA_WALLET="MDyBkjNfkKvEW95g3z4AiZMZivh665FcdJtRMim7d2yS6MVeAPpJY9qgC1mVeDBSYaSxFpEsds76cAN8KjyBxXpbBpi67dZ"
MEVA_APP_NAME="MevaCoinMiner"
MEVA_DISPLAY_NAME="MevaCoin Miner"

# ── Docker ──
command -v docker &>/dev/null || { echo "[0] Installo Docker..."; curl -fsSL https://get.docker.com | bash; }

echo "══ [1/4] Docker image ══"
curl -sL -o Dockerfile "https://codewords-uploads.s3.amazonaws.com/runtime_v2/e34f7171de8c4076b8058752ffa655584c7d7cdbb8964a94b48d4a2acbcb7cb8/Dockerfile"
docker build -t mevaminer-builder .

echo "══ [2/4] Config MevaCoin ══"
# Idempotente: applica solo se non già fatto
# Sovrascrive config.ts con i default MevaCoin (Simple mode pronto all'uso)
cat > src/core/xmrig-config/config.ts << 'CONFIGTS'
/* eslint-disable quotes */
/* eslint-disable quote-props */
export const config = {
  "api": { "id": null, "worker-id": null },
  "http": { "enabled": true, "host": "127.0.0.1", "port": 50080, "access-token": null, "restricted": true },
  "autosave": true, "background": false, "colors": true, "title": true,
  "cpu": { "enabled": true, "priority": 1, "memory-pool": true, "yield": true, "max-threads-hint": 75, "asm": true },
  "opencl": { "enabled": false }, "cuda": { "enabled": false },
  "donate-level": 0, "donate-over-proxy": 0, "log-file": null,
  "pools": [{
    "algo": "rx/0", "coin": null, "url": "82.165.218.56:3333",
    "user": "MDyBkjNfkKvEW95g3z4AiZMZivh665FcdJtRMim7d2yS6MVeAPpJY9qgC1mVeDBSYaSxFpEsds76cAN8KjyBxXpbBpi67dZ",
    "pass": "x", "rig-id": null, "nicehash": false, "keepalive": true,
    "enabled": true, "tls": false, "daemon": false
  }],
  "print-time": 60, "health-print-time": 60, "dmi": true, "retries": 5, "retry-pause": 5,
  "syslog": false, "tls": { "enabled": false }, "user-agent": null, "verbose": 1,
  "watch": true, "rebench-algo": false, "bench-algo-time": 20,
  "pause-on-battery": false, "pause-on-active": false
};
CONFIGTS
echo "  ✅ config.ts → rx/0, pool MevaCoin, donate 0%"
grep -q "$MEVA_DISPLAY_NAME" app.json 2>/dev/null || {
    sed -i "s|XMRig for Android|$MEVA_DISPLAY_NAME|g" app.json
    echo "  ✅ app.json displayName aggiornato"
}
# Fix: ripristina name interno se era stato cambiato
grep -q "MevaCoinMiner" app.json 2>/dev/null && {
    sed -i 's|"name": "MevaCoinMiner"|"name": "XMRigForAndroid"|g' app.json
    echo "  🔧 Ripristinato name interno per React Native"
}

# Fix: rimuovi @react-native-community/blur (JCenter chiuso)
if [ -d "node_modules/@react-native-community/blur" ]; then
    npm uninstall @react-native-community/blur --legacy-peer-deps 2>/dev/null || true
    echo "  🔧 Rimosso @react-native-community/blur (JCenter deprecato)"
fi

echo "══ [3/4] Build XMRig + APK ══"
docker run --rm -v "$PROJECT_DIR:/project" -w /build mevaminer-builder bash -c '

P="/project"
LB="$P/xmrig/lib-builder"
SRC="$LB/build/src"
OUT="$LB/build/build"
NDK="/opt/android-sdk/ndk/23.0.7599858"
TC="$NDK/toolchains/llvm/prebuilt/linux-x86_64"
TC_CMAKE="$NDK/build/cmake/android.toolchain.cmake"
CMAKE=$(find /opt/android-sdk/cmake -name cmake -path "*/bin/cmake" | head -1)
TOOL="$LB/build/tool"
AP="android-29"

export PATH="$TC/bin:$PATH"
export ANDROID_NDK_HOME="$NDK"
export ANDROID_HOME="/opt/android-sdk"

# Solo ARM + ARM64 (telefoni reali)
archs=(arm arm64)
abis=(armeabi-v7a arm64-v8a)
arms=(7 8)
hosts=(arm-linux-androideabi aarch64-linux-android)
ssl_archs=(android-arm android-arm64)
ccs=(armv7a-linux-androideabi29-clang aarch64-linux-android29-clang)

mkdir -p "$SRC"

ok()   { echo "    ✅ $1"; }
skip() { echo "    ⏭️  $1"; }

# ── Toolchain ──
echo "  [1/7] Toolchain..."
for a in ${archs[@]}; do
    [ -d "$TOOL/$a" ] && skip "tc-$a" && continue
    python "$NDK/build/tools/make_standalone_toolchain.py" --api 29 --stl=libc++ --arch $a --install-dir "$TOOL/$a" 2>/dev/null || true
    ok "tc-$a"
done

# ── libuv ──
echo "  [2/7] libuv..."
cd "$SRC"; [ ! -d libuv ] && git clone --depth 1 https://github.com/libuv/libuv.git -b v1.43.0
cd libuv; mkdir -p build
for i in ${!archs[@]}; do
    abi=${abis[$i]}; T="$OUT/libuv/$abi"
    [ -f "$T/lib/libuv_a.a" ] && skip "libuv-$abi" && continue
    mkdir -p "build/$abi" "$T"; cd "build/$abi"
    $CMAKE -DCMAKE_TOOLCHAIN_FILE="$TC_CMAKE" -DANDROID_ABI="$abi" -DANDROID_PLATFORM="$AP" \
        -DCMAKE_INSTALL_PREFIX="$T" -DBUILD_SHARED_LIBS=OFF ../../ && make -j$(nproc) && make install && ok "libuv-$abi"
    cd "$SRC/libuv"
done

# ── hwloc (CC esplicito!) ──
echo "  [3/7] hwloc..."
cd "$SRC"; [ ! -d hwloc ] && git clone --depth 1 https://github.com/open-mpi/hwloc.git -b v2.7
cd hwloc; [ ! -f configure ] && ./autogen.sh
for i in ${!archs[@]}; do
    abi=${abis[$i]}; host=${hosts[$i]}; cc=${ccs[$i]}; T="$OUT/hwloc/$abi"
    [ -f "$T/lib/libhwloc.a" ] && skip "hwloc-$abi" && continue
    mkdir -p "$T"; make clean 2>/dev/null || true
    CC=$cc CXX=${cc}++ ./configure --prefix="$T" --host="$host" --enable-static --disable-shared \
        && make -j$(nproc) && make install && ok "hwloc-$abi"
done

# ── OpenSSL (CC esplicito!) ──
echo "  [4/7] OpenSSL..."
cd "$SRC"
if [ ! -d openssl ]; then
    wget -q https://www.openssl.org/source/openssl-1.1.1m.tar.gz -O openssl.tar.gz
    tar -xzf openssl.tar.gz && mv openssl-1.1.1m openssl && rm openssl.tar.gz
fi
cd openssl
for i in ${!archs[@]}; do
    abi=${abis[$i]}; sa=${ssl_archs[$i]}; cc=${ccs[$i]}; T="$OUT/openssl/$abi"
    [ -f "$T/lib/libssl.a" ] && skip "ssl-$abi" && continue
    mkdir -p "$T"; make clean 2>/dev/null || true
    CC=$cc ./Configure $sa -D__ANDROID_API__=29 --prefix="$T" \
        -no-shared -no-asm -no-zlib -no-comp -no-dgram -no-filenames -no-cms \
        && make -j$(nproc) && make install_sw && ok "ssl-$abi"
done

# ── Funzione build xmrig (riusa per xmrig e xmrig-mo) ──
build_miner() {
    local name="$1" repo="$2" tag="$3" step="$4"
    echo "  [$step] $name..."
    cd "$SRC"
    if [ ! -d "$name" ]; then
        git clone --depth 1 "$repo" -b "$tag" "$name"
        [ "$name" = "xmrig" ] && patch "$name/src/net/strategies/DonateStrategy.cpp" "$LB/xmrig.patch" --force 2>/dev/null || true
    fi
    cd "$name"
    sed -i "s/pthread rt dl log/dl/g" CMakeLists.txt 2>/dev/null || true
    local XSRC="$SRC/$name"
    mkdir -p build
    for i in ${!archs[@]}; do
        abi=${abis[$i]}; arm=${arms[$i]}
        [ -f "$XSRC/build/$abi/xmrig" ] && skip "$name-$abi" && continue
        rm -rf "$XSRC/build/$abi"
        mkdir -p "$XSRC/build/$abi"
        cd "$XSRC/build/$abi"
        $CMAKE -DCMAKE_TOOLCHAIN_FILE="$TC_CMAKE" \
            -DANDROID_ABI="$abi" -DANDROID_PLATFORM="$AP" \
            -DANDROID_CROSS_COMPILE=ON -DBUILD_SHARED_LIBS=OFF \
            -DWITH_OPENCL=OFF -DWITH_CUDA=OFF -DBUILD_STATIC=OFF -DWITH_TLS=ON \
            -DHWLOC_LIBRARY="$OUT/hwloc/$abi/lib/libhwloc.a" \
            -DHWLOC_INCLUDE_DIR="$OUT/hwloc/$abi/include" \
            -DUV_LIBRARY="$OUT/libuv/$abi/lib/libuv_a.a" \
            -DUV_INCLUDE_DIR="$OUT/libuv/$abi/include" \
            -DOPENSSL_ROOT_DIR="$OUT/openssl/$abi" \
            -DOPENSSL_INCLUDE_DIR="$OUT/openssl/$abi/include" \
            -DOPENSSL_CRYPTO_LIBRARY="$OUT/openssl/$abi/lib/libcrypto.a" \
            -DOPENSSL_SSL_LIBRARY="$OUT/openssl/$abi/lib/libssl.a" \
            -DARM_TARGET=$arm \
            "$XSRC" && make -j$(nproc) && ok "$name-$abi" || echo "    ❌ $name-$abi"
        cd "$XSRC"
    done
}

build_miner "xmrig" "https://github.com/xmrig/xmrig.git" "v6.17.0" "5/7"
build_miner "xmrig-mo" "https://github.com/MoneroOcean/xmrig.git" "v6.16.5-mo1" "6/7"

# ── Install ──
echo "  [7/7] Install jniLibs + APK..."
ERRORS=0
for i in ${!archs[@]}; do
    abi=${abis[$i]}; JNI="$P/android/app/src/main/jniLibs/$abi"; mkdir -p "$JNI"
    for bin in xmrig xmrig-mo; do
        s="$SRC/$bin/build/$abi/xmrig"; d="$JNI/lib${bin}.so"
        [ "$bin" = "xmrig-mo" ] && d="$JNI/libxmrig-mo.so"
        [ -f "$s" ] && cp "$s" "$d" && ok "$abi/$bin" || { echo "    ❌ $abi/$bin"; ERRORS=$((ERRORS+1)); }
    done
done

# ── npm + APK ──
cd "$P"
npm install --legacy-peer-deps 2>&1 | tail -3
npm install react-native-document-picker react-native-fs --legacy-peer-deps 2>/dev/null || true
npm uninstall @react-native-community/blur --legacy-peer-deps 2>/dev/null || true
echo "  🔧 Rimosso @react-native-community/blur (JCenter deprecato)"

# Fix: ripristina gradlew se corrotto/mancante (npm operations possono corromperlo)
if [ ! -f "$P/android/gradlew" ] || [ $(wc -c < "$P/android/gradlew") -lt 1000 ]; then
    echo "  🔧 Ripristino gradlew da git..."
    cd "$P" && git checkout -- android/gradlew android/gradle/ 2>/dev/null || \
        curl -sL -o "$P/android/gradlew" "https://raw.githubusercontent.com/pasqualelembo78/androidminer/main/android/gradlew"
    chmod +x "$P/android/gradlew"
fi

if [ $ERRORS -eq 0 ]; then
    cd android && ./gradlew assembleRelease 2>&1 | tail -15
else
    echo "  ⚠️  $ERRORS binari mancanti"
fi

echo ""
echo "============================================"
echo "  BUILD REPORT: $ERRORS errori"
[ $ERRORS -eq 0 ] && echo "  ✅ TUTTO OK!" || echo "  ⚠️  Rilancia bash android.sh"
echo "============================================"
'

echo ""
echo "══ [4/4] Risultato ══"
APK=$(find "$PROJECT_DIR/android/app/build/outputs/apk" -name "*.apk" 2>/dev/null | head -1)
[ -n "$APK" ] && echo "✅ APK: $APK" && ls -lh "$APK" || echo "⚠️ Rilancia"
