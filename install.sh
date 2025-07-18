#!/bin/bash

# === CONFIG ===
GITHUB_REPO="https://github.com/pasqualelembo78/androidminer.git"
APP_DIR="androidminer"

# === FUNZIONI DI LOG ===
echo_info() { echo -e "\e[34m[INFO]\e[0m $1"; }
echo_err()  { echo -e "\e[31m[ERRORE]\e[0m $1"; }

# === 1. CLONA IL PROGETTO ===
echo_info "Clonazione del repository..."
git clone "$GITHUB_REPO" || { echo_err "Errore durante il clone"; exit 1; }
cd "$APP_DIR" || exit 1

# === 2. INSTALLA DIPENDENZE SISTEMA ===
echo_info "Installazione dipendenze di sistema..."
apt update
apt install -y curl git cmake unzip make openjdk-17-jdk build-essential

# === 3. INSTALLA NODE.JS 17.1.0 ===
echo_info "Installazione Node.js 17.1.0..."
curl -fsSL https://deb.nodesource.com/setup_17.x | bash -
apt install -y nodejs
npm install -g yarn

# === 4. CONTROLLA O INSTALLA ANDROID SDK/NDK ===
echo_info "Verifica Android SDK/NDK..."
if [ -z "$ANDROID_HOME" ]; then
  echo_err "Variabile ANDROID_HOME non impostata. Interrompo."
  exit 1
fi

# === 5. COMPILA XMRig E LIBRERIE ===
echo_info "Compilazione lib-builder (xmrig, hwloc, libuv)..."
cd xmrig/lib-builder || { echo_err "lib-builder non trovato"; exit 1; }
make install || { echo_err "Errore make install"; exit 1; }
cd ../../

# === 6. INSTALLA DIPENDENZE REACT NATIVE ===
echo_info "Installazione dipendenze yarn..."
yarn install || { echo_err "Errore yarn install"; exit 1; }

# === 7. INSTALLA E CONFIGURA PM2 ===
echo_info "Installazione e avvio server con PM2..."
npm install -g pm2
pm2 start "yarn start" --name androidminer
pm2 save
pm2 startup systemd -u root --hp /root | bash

# === 8. GENERA KEYSTORE E FILE DI FIRMA ===
cd android || { echo_err "Cartella android non trovata"; exit 1; }

echo_info "Rimozione keystore vecchio (se esiste)..."
rm -f app/release.keystore

echo_info "Generazione nuovo keystore..."
keytool -genkeypair -v \
  -keystore app/release.keystore \
  -alias mevakey \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass mevapass \
  -keypass mevapass \
  -dname "CN=Pasquale, OU=Meva, O=MevaCoin, L=Italia, S=BA, C=IT"

echo_info "Scrittura file gradle.properties..."
cat <<EOF > gradle.properties
MYAPP_RELEASE_STORE_FILE=release.keystore
MYAPP_RELEASE_KEY_ALIAS=mevakey
MYAPP_RELEASE_STORE_PASSWORD=mevapass
MYAPP_RELEASE_KEY_PASSWORD=mevapass
EOF

echo_info "Controllo configurazione firma in app/build.gradle..."
if ! grep -q "signingConfigs" app/build.gradle; then
  sed -i '/^android {/a\
    signingConfigs {\n\
        release {\n\
            storeFile file(MYAPP_RELEASE_STORE_FILE)\n\
            storePassword MYAPP_RELEASE_STORE_PASSWORD\n\
            keyAlias MYAPP_RELEASE_KEY_ALIAS\n\
            keyPassword MYAPP_RELEASE_KEY_PASSWORD\n\
        }\n\
    }\n\
    buildTypes {\n\
        release {\n\
            signingConfig signingConfigs.release\n\
            shrinkResources false\n\
            minifyEnabled false\n\
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"\n\
        }\n\
    }' app/build.gradle
else
  echo_info "✅ Configurazione firma già presente in build.gradle"
fi

# === 9. COMPILA APK FIRMATA RELEASE ===
echo_info "Compilazione APK firmata release..."
./gradlew clean
./gradlew assembleRelease || { echo_err "Errore durante la compilazione APK"; exit 1; }

APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
  echo_info "✅ APK creata con successo: $APK_PATH"
else
  echo_err "❌ APK non trovata dopo la compilazione"
fi

echo_info "Tutto completato!"
