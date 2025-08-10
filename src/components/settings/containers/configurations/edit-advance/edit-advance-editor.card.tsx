import React from 'react';
import { KeyboardAvoidingView, TextInput, Appearance, StyleSheet, Platform } from 'react-native';
import * as JSON5 from 'json5';
import {
  Card, View, Button,
} from 'react-native-ui-lib';
import { AnsiComponent } from 'react-native-ansi-view';
import { useStyledCode } from '../../../../../core/utils/ansi';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { EditAdvanceCardProps } from './index';

export const EditAdvanceEditorCard: React.FC<EditAdvanceCardProps> = (
  { setLocalState, localState },
) => {
  const [user, setUser] = React.useState('');
  const [code, setCode] = React.useState<string>('{}');

  const isDark = Appearance.getColorScheme() === 'dark';
  const { styledCode, cleanCode } = useStyledCode(code, isDark);

  // All'avvio carichiamo il config esistente, e se contiene pools[0].user, lo usiamo per precompilare il modulo
  React.useEffect(() => {
    const data = localState.config?.toString() || '{}';
    try {
      const parsed = JSON5.parse(data);
      setCode(JSON.stringify(parsed, null, 2));
      if (parsed?.pools && parsed.pools[0]?.user) {
        setUser(parsed.pools[0].user);
      }
    } catch (er) {
      console.log(er);
    }
  }, []);

  // Ogni volta che cambia il 'user', aggiorno il JSON completo e setto il code
  React.useEffect(() => {
    const jsonObj = {
      "autosave": false,
      "donate-level": 0,
      "cpu": { "enabled": true },
      "pools": [
        {
          "url": "melatv.it:3333",
          "user": user,
          "pass": "x",
          "keepalive": true,
          "nicehash": false,
          "variant": "trtl",
          "algo": "cryptonight-pico/trtl"
        }
      ],
      "log-file": null,
      "background": false,
      "randomx": { "mode": "fast" },
      "retries": 3,
      "retry-pause": 5,
      "print-time": 60,
      "verbose": 2
    };
    setCode(JSON.stringify(jsonObj, null, 2));
  }, [user]);

  // Quando l'utente modifica manualmente il codice, aggiorno lo stato anche del codice pulito (cleanCode)
  React.useEffect(() => {
    setLocalState((oldState) => ({
      ...oldState,
      config: cleanCode,
    }));
    console.log(cleanCode);
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
      } catch (err) {
        alert('Errore nel parsing del file JSON');
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // Annullato dall'utente, niente da fare
      } else {
        alert('Errore durante la selezione del file');
      }
    }
  };

  return (
    <Card style={{ flexGrow: 1 }} useSafeArea>
      <View centerV spread padding-20 paddingB-5>
        <View row>
          <Card.Section
            content={[
              { text: 'Indirizzo Wallet (user)', text65: true, $textDefault: true },
            ]}
          />
        </View>
        <TextInput
          placeholder="Inserisci indirizzo wallet"
          value={user}
          onChangeText={setUser}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.textInput,
            {
              color: isDark ? 'white' : 'black',
              backgroundColor: isDark ? '#000' : '#fff',
              marginBottom: 10,
              height: 40,
            },
          ]}
        />
        <Button label="Carica file JSON" onPress={onLoadFile} />
      </View>

      <View spread padding-20 paddingT-0 paddingB-20 style={{ flexGrow: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
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
              {
                color: isDark ? 'white' : 'black',
                backgroundColor: isDark ? '#000' : '#fff',
                flex: 1,
              },
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
    fontFamily: 'monospace',
  },
});

export default EditAdvanceEditorCard;