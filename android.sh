#!/bin/bash
set -e

echo "Aggiorno pacchetti di sistema..."
sudo apt update
sudo apt upgrade -y

echo "Installo dipendenze base"
sudo apt install -y curl unzip openjdk-11-jdk cmake ninja-build nodejs npm


echo "Installo n per gestire NodeJS"
sudo npm install -g n

echo "Installo NodeJS v17.1.0 con n"
sudo n 17.1.0


npm install react-native-document-picker

npm install react-native-fs

# se non funziona aggiungi  --legacy-peer-deps
echo "Verifico Node e npm"
node -v
npm -v

echo "Configuro SDK Android"
rm -rf /root/Android/Sdk/cmdline-tools/latest
ANDROID_SDK_ROOT="$HOME/Android/Sdk"
mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools"

echo "Scarico Android SDK Command-line Tools 5.0"
cd /tmp
curl -O https://dl.google.com/android/repository/commandlinetools-linux-8512546_latest.zip
unzip -q commandlinetools-linux-8512546_latest.zip
mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools/latest"
mv cmdline-tools/* "$ANDROID_SDK_ROOT/cmdline-tools/latest/"

export PATH=$PATH:"$ANDROID_SDK_ROOT/cmdline-tools/latest/bin"

echo "Accetto licenze Android SDK"
yes | "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" --licenses

echo "Aggiorno SDK manager"
"$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" --update

echo "Installo SDK Platform 29, Build-tools 29.0.2, Platform-tools 31.0.3, NDK 23.0.7599858, CMake"
"$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" \
    "platforms;android-29" \
    "build-tools;29.0.2" \
    "platform-tools" \
    "ndk;23.0.7599858" \
    "cmake;3.22.1"

echo "Aggiungo variabili ambiente temporaneamente per questa sessione"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export PATH=$PATH:"$ANDROID_HOME/platform-tools"
export PATH=$PATH:"$ANDROID_HOME/build-tools/29.0.2"
export PATH=$PATH:"$ANDROID_HOME/ndk/23.0.7599858"
export PATH=$PATH:"$ANDROID_HOME/cmdline-tools/latest/bin"

echo "Verifica installazioni"
node -v
npm -v
adb --version
cmake --version
"$ANDROID_SDK_ROOT/ndk/23.0.7599858/ndk-build" --version

# Aggiunta variabili permanenti nel .bashrc con controllo
if ! grep -q 'Variabili ambiente Android SDK' ~/.bashrc; then
  cat >> ~/.bashrc <<EOF

# Variabili ambiente Android SDK
export ANDROID_HOME="\$HOME/Android/Sdk"
export PATH="\$PATH:\$ANDROID_HOME/platform-tools"
export PATH="\$PATH:\$ANDROID_HOME/build-tools/29.0.2"
export PATH="\$PATH:\$ANDROID_HOME/ndk/23.0.7599858"
export PATH="\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin"
EOF
  echo "Blocco variabili ambiente aggiunto a ~/.bashrc"
else
  echo "Blocco variabili ambiente già presente in ~/.bashrc, nessuna modifica fatta."
fi

echo "Installazione completata!"
echo "Sto eseguendo 'source ~/.bashrc' per applicare subito le variabili ambiente..."

# Provo a fare source, ma se lo script è eseguito in modo che non funziona, utente lo rifarà manualmente
if [ "$SHELL" = "/bin/bash" ]; then
  source ~/.bashrc && echo "Variabili ambiente applicate."
else
  echo "Attenzione: shell diversa da bash, esegui manualmente 'source ~/.bashrc' o riavvia il terminale."
fi
