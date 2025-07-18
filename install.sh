#!/bin/bash

# === CONFIG ===
GITHUB_REPO="https://github.com/pasqualelembo78/androidminer.git"
APP_DIR="androidminer"

# === FUNZIONI DI LOG ===
echo_info() { echo -e "\e[34m[INFO]\e[0m $1"; }
echo_err()  { echo -e "\e[31m[ERRORE]\e[0m $1"; }

# === 0. IMPOSTA VARIABILE ANDROID_HOME E SISTEMA CMDLINE-TOOLS ===
echo_info "Impostazione variabili Android SDK..."

unset ANDROID_SDK_ROOT   # <-- QUI rimuoviamo la variabile che crea conflitti

export ANDROID_HOME="/root/Android/Sdk"
export CMDLINE_PATH="$ANDROID_HOME/cmdline-tools"

# Se il link 'latest' non esiste, crealo
if [ ! -f "$CMDLINE_PATH/latest/bin/sdkmanager" ]; then
  if [ -d "$CMDLINE_PATH" ]; then
    LATEST_VERSION=$(ls "$CMDLINE_PATH" | grep -E '^[0-9]+\.[0-9]+$' | sort -V | tail -n 1)
    if [ -n "$LATEST_VERSION" ]; then
      mkdir -p "$CMDLINE_PATH/cmdline-tools"
      cp -r "$CMDLINE_PATH/$LATEST_VERSION/" "$CMDLINE_PATH/cmdline-tools"
      ln -sfn "$CMDLINE_PATH/cmdline-tools" "$CMDLINE_PATH/latest"
      echo_info "✅ Link simbolico 'latest' creato -> $LATEST_VERSION"
    else
      echo_err "❌ Nessuna versione trovata in $CMDLINE_PATH"
      exit 1
    fi
  else
    echo_err "❌ cmdline-tools non trovato in $CMDLINE_PATH"
    exit 1
  fi
else
  echo_info "✅ sdkmanager già configurato"
fi

# Aggiorna PATH
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/emulator:$PATH"

# === 1. CLONA IL PROGETTO SE NON ESISTE ===
if [ -d "$APP_DIR" ]; then
  echo_info "Directory $APP_DIR già esistente. Salto clonazione."
  cd "$APP_DIR" || { echo_err "Errore nell'accesso alla directory $APP_DIR"; exit 1; }
else
  echo_info "Clonazione del repository..."
  git clone "$GITHUB_REPO" || { echo_err "Errore durante il clone"; exit 1; }
  cd "$APP_DIR" || exit 1
fi

# === 2. INSTALLA DIPENDENZE SISTEMA ===
echo_info "Installazione dipendenze di sistema..."
apt update
apt install -y curl git cmake unzip make openjdk-17-jdk build-essential python-is-python3

# Usa sdkmanager senza conflitti
sdkmanager --install "ndk;25.1.8937393"

# === 3. INSTALLA NODE.JS 17.1.0 CON N ===
echo_info "Installazione Node.js con 'n'..."
apt install -y nodejs npm
npm install -g n
n 17.1.0
ln -sf /usr/local/bin/node /usr/bin/node
ln -sf /usr/local/bin/npm /usr/bin/npm
npm install -g yarn

# === 4. CONTROLLA ANDROID SDK ===
echo_info "Verifica Android SDK/NDK..."
if [ -z "$ANDROID_HOME" ]; then
  echo_err "Variabile ANDROID_HOME non impostata. Interrompo."
  exit 1
fi

# === 5. COMPILA XMRig E LIBRERIE ===
# (qui eventualmente scommenta se serve)
# echo_info "Compilazione lib-builder (xmrig, hwloc, libuv)..."
# cd /opt/androidminer/xmrig/lib-builder || { echo_err "lib-builder non trovato"; exit 1; }
# make install || { echo_err "Errore make install"; exit 1; }
# cd ../../

# === 6. INSTALLA DIPENDENZE REACT NATIVE ===
echo_info "Installazione dipendenze yarn..."
yarn install || { echo_err "Errore yarn install"; exit 1; }

# === 7. INSTALLA E CONFIGURA PM2 ===
echo_info "Installazione e avvio server con PM2..."
npm install -g pm2
pm2 start "yarn start" --name androidminer
pm2 save

startup_cmd=$(pm2 startup systemd -u root --hp /root | grep sudo)
if [ -n "$startup_cmd" ]; then
  echo_info "Configurazione systemd per PM2 in corso..."
  eval "$startup_cmd"
else
  echo_err "Impossibile ottenere il comando di startup PM2 da eseguire."
fi

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

android.useAndroidX=true
android.enableJetifier=true

org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8
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
# se non funziona cambiare in build.gradle /opt/androidminer/node_modules/@react-native-community/blur/android - blurview:1.6.6 con implementation 'com.github.Dimezis:BlurView:version-# 1.6.6'
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
