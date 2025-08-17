import React from 'react';
import { KeyboardAvoidingView, TextInput, Appearance, StyleSheet, Platform, Alert } from 'react-native';
import * as JSON5 from 'json5';
import {
  Card, View, Button,
} from 'react-native-ui-lib';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { EditAdvanceCardProps } from './index';

export const EditAdvanceEditorCard: React.FC<EditAdvanceCardProps> = (
  { setLocalState, localState },
) => {
  const [user, setUser] = React.useState('');
  const [threads, setThreads] = React.useState('1');
  const [poolUrl, setPoolUrl] = React.useState('melatv.it:3333');
  const [code, setCode] = React.useState<string>('{}');

  const isDark = Appearance.getColorScheme() === 'dark';

  React.useEffect(() => {
    const data = localState.config?.toString() || '{}';
    try {
      const parsed = JSON5.parse(data);
      setCode(JSON.stringify(parsed, null, 2));
      if (parsed?.pools && parsed.pools[0]?.user) {
        setUser(parsed.pools[0].user);
      }
if (parsed?.cpu?.["max-threads-hint"]) {
  setThreads(parsed.cpu["max-threads-hint"].toString());
      }
      if (parsed?.pools && parsed.pools[0]?.url) {
        setPoolUrl(parsed.pools[0].url);
      }
    } catch (er) {
      console.log(er);
    }
  }, []);

  // Aggiorna JSON quando cambiano user, threads o poolUrl
  React.useEffect(() => {
    let threadNum = parseInt(threads, 10);
    if (isNaN(threadNum) || threadNum < 1) {
      threadNum = 1;
    } else if (threadNum > 3) {
      // Limitiamo a max 8 thread (o cambia in base a hw reale)
      threadNum = 3;
    }

    const jsonObj = {
      autosave: true,
      "donate-level": 0,
      cpu: { enabled: true, "max-threads-hint": threadNum },
      pools: [
        {
          url: poolUrl.trim() || "melatv.it:3333",
          user,
          pass: "x",
          keepalive: true,
          nicehash: false,
          variant: "trtl",
          algo: "cryptonight-pico/trtl"
        }
      ],
      "log-file": null,
      background: false,
      randomx: { mode: "fast" },
      retries: 3,
      "retry-pause": 5,
      "print-time": 60,
      verbose: 2
    };
    setCode(JSON.stringify(jsonObj, null, 2));
  }, [user, threads, poolUrl]);

  React.useEffect(() => {
    setLocalState((oldState) => ({
      ...oldState,
      config: code,
    }));
  }, [code]);

  const onLoadFile = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.plainText, DocumentPicker.types.allFiles],
      });
      const file = res[0];
      const fileContent = await RNFS.readFile(file.uri, 'utf8');
      try {
        const parsed = JSON5.parse(fileContent);
        const formatted = JSON.stringify(parsed, null, 2);
        setCode(formatted);
        if (parsed?.pools && parsed.pools[0]?.user) {
          setUser(parsed.pools[0].user);
        }
   if (parsed?.cpu?.["max-threads-hint"]) {
  setThreads(parsed.cpu["max-threads-hint"].toString());
}
        if (parsed?.pools && parsed.pools[0]?.url) {
          setPoolUrl(parsed.pools[0].url);
        }
      } catch (err) {
        Alert.alert('Errore', 'Errore nel parsing del file JSON');
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // Annullato dall'utente, niente da fare
      } else {
        Alert.alert('Errore', 'Errore durante la selezione del file');
      }
    }
  };

  return (
    <Card style={{ flexGrow: 1 }} useSafeArea>
      <View centerV spread padding-20 paddingB-5>
        <View row>
          <Card.Section content={[{ text: 'Indirizzo Wallet (user)', text65: true, $textDefault: true }]} />
        </View>
        <TextInput
          placeholder="Inserisci indirizzo wallet"
          value={user}
          onChangeText={setUser}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.textInput,
            { color: isDark ? 'white' : 'black', backgroundColor: isDark ? '#000' : '#fff', marginBottom: 10, height: 40 },
          ]}
        />

        <View row>
          <Card.Section content={[{ text: 'Numero di thread CPU (1-8)', text65: true, $textDefault: true }]} />
        </View>
        <TextInput
          placeholder="Numero di thread"
          value={threads}
          onChangeText={setThreads}
          keyboardType="numeric"
          style={[
            styles.textInput,
            { color: isDark ? 'white' : 'black', backgroundColor: isDark ? '#000' : '#fff', marginBottom: 10, height: 40 },
          ]}
        />

        <View row>
          <Card.Section content={[{ text: 'Pool URL', text65: true, $textDefault: true }]} />
        </View>
        <TextInput
          placeholder="Indirizzo pool mining"
          value={poolUrl}
          onChangeText={setPoolUrl}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.textInput,
            { color: isDark ? 'white' : 'black', backgroundColor: isDark ? '#000' : '#fff', marginBottom: 10, height: 40 },
          ]}
        />

        <Button label="Carica file JSON" onPress={onLoadFile} />
      </View>

      <View spread padding-20 paddingT-0 paddingB-20 style={{ flexGrow: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TextInput
            multiline
            scrollEnabled
            value={code}
            onChangeText={setCode}
            autoCorrect={false}
            spellCheck={false}
            textAlignVertical="top"
            style={[
              styles.textInput,
              { color: isDark ? 'white' : 'black', backgroundColor: isDark ? '#000' : '#fff', flex: 1 },
            ]}
          />
        </KeyboardAvoidingView>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  textInput: {
    borderRadius: 5,
    padding: 10,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
});

export default EditAdvanceEditorCard;
