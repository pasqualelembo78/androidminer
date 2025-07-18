#!/bin/bash

# Imposta JAVA_HOME nel .bashrc se non già presente
JAVA_HOME_PATH="/usr/lib/jvm/java-11-openjdk-amd64"
BASHRC="$HOME/.bashrc"

if ! grep -q "export JAVA_HOME=$JAVA_HOME_PATH" "$BASHRC"; then
    echo "export JAVA_HOME=$JAVA_HOME_PATH" >> "$BASHRC"
    echo 'export PATH=$JAVA_HOME/bin:$PATH' >> "$BASHRC"
    echo "JAVA_HOME aggiunto a $BASHRC"
else
    echo "JAVA_HOME già presente in $BASHRC"
fi

# Ricarica la configurazione
source "$BASHRC"

# Verifica java
echo "JAVA_HOME è ora: $JAVA_HOME"
java -version

# Vai nella cartella android e builda
cd /opt/androidminer/android || exit
./gradlew assembleDebug
