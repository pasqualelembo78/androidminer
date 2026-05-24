import React from 'react';
import {
  KeyboardAvoidingView,
  TextInput,
  Appearance,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import * as JSON5 from 'json5';
import {
  Card, View, Button,
} from 'react-native-ui-lib';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { EditAdvanceCardProps } from './index';

const DEFAULT_POOL = 'pool.mevacoin.com:3333';
const DEFAULT_ALGO = 'rx/0';

export const EditAdvanceEditorCard: React.FC<EditAdvanceCardProps> = (
  { setLocalState, localState },
) => {
  const [user, setUser] = React.useState('');
  const [threads, setThreads] = React.useState('1');
  const [poolUrl, setPoolUrl] = React.useState(DEFAULT_POOL);
  const [code, setCode] = React.useState<string>('{}');

  const isDark = Appearance.getColorScheme() === 'dark';

  // Carica la config esistente all'avvio
  React.useEffect(() => {
    const data = localState.config?.toString() || '{}';
    try {
      const parsed = JSON5.parse(data);
      if (parsed?.pools && parsed.pools[0]?.user) {
        setUser(parsed.pools[0].user);
      }
      if (parsed?.cpu?.['max-threads-hint']) {
        setThreads(parsed.cpu['max-threads-hint'].toString());
      }
      if (parsed?.pools && parsed.pools[0]?.url) {
        // FIX: sostituisce automaticamente melatv.it col pool corretto
        const savedUrl: string = parsed.pools[0].url;
        setPoolUrl(savedUrl.includes('melatv') ? DEFAULT_POOL : savedUrl);
      }
      // Rigenera subito un JSON pulito (rimuove campi legacy come variant/cryptonight)
    } catch (er) {
      console.log(er);
    }
  }, []);

  // FIX: Rigenera il JSON quando cambiano user, threads o poolUrl
  // Usa SOLO rx/0 e parametri RandomX corretti - niente CryptoNight/variant/trtl
  React.useEffect(() => {
    let threadNum = parseInt(threads, 10);
    if (isNaN(threadNum) || threadNum < 1) threadNum = 1;
    if (threadNum > 8) threadNum = 8;

    const resolvedUrl = (poolUrl.trim() === '' || poolUrl.includes('melatv'))
      ? DEFAULT_POOL
      : poolUrl.trim();

    const jsonObj = {
      autosave: true,
      'donate-level': 0,
      'donate-over-proxy': 0,
      cpu: {
        enabled: true,
        'max-threads-hint': threadNum,
        priority: 1,
        'memory-pool': true,
        yield: true,
      },
      randomx: {
        mode: 'light',
        'init': -1,
        'numa': true,
      },
      pools: [
        {
          url: resolvedUrl,
          user,
          pass: 'x',
          algo: DEFAULT_ALGO,
          keepalive: true,
          nicehash: false,
          tls: false,
          enabled: true,
        },
      ],
      'log-file': null,
      background: false,
      retries: 5,
      'retry-pause': 5,
      'print-time': 60,
      verbose: 1,
    };
    setCode(JSON.stringify(jsonObj, null, 2));
  }, [user, threads, poolUrl]);

  // Sincronizza il JSON con lo stato genitore
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
        if (parsed?.pools && parsed.pools[0]?.user) setUser(parsed.pools[0].user);
        if (parsed?.cpu?.['max-threads-hint']) setThreads(parsed.cpu['max-threads-hint'].toString());
        if (parsed?.pools && parsed.pools[0]?.url) {
          const loadedUrl: string = parsed.pools[0].url;
          setPoolUrl(loadedUrl.includes('melatv') ? DEFAULT_POOL : loadedUrl);
        }
      } catch (err) {
        Alert.alert('Errore', 'Errore nel parsing del file JSON');
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Errore', 'Errore durante la selezione del file');
      }
    }
  };

  return (
    // FIX: TouchableWithoutFeedback + ScrollView per chiudere la keyboard
    // senza bloccare lo scroll della pagina sottostante.
    // KeyboardAvoidingView con behavior="height" su Android funziona meglio
    // di undefined, ma per il form superiore (input piccoli) usiamo ScrollView
    // con keyboardShouldPersistTaps="handled" così i tap passano ai figli
    // anche con la tastiera aperta (es. bottone "Carica file JSON").
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 80 : 0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        scrollEnabled
      >
        {/* Indirizzo Wallet */}
        <Card.Section content={[{ text: 'Indirizzo Wallet (user)', text65: true, $textDefault: true }]} />
        <TextInput
          placeholder="Inserisci indirizzo wallet"
          value={user}
          onChangeText={setUser}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.textInput,
            { color: isDark ? 'white' : 'black', backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', marginBottom: 12, height: 44 },
          ]}
        />

        {/* Thread CPU */}
        <Card.Section content={[{ text: 'Numero di thread CPU (1-8)', text65: true, $textDefault: true }]} />
        <TextInput
          placeholder="Numero di thread"
          value={threads}
          onChangeText={setThreads}
          keyboardType="numeric"
          style={[
            styles.textInput,
            { color: isDark ? 'white' : 'black', backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', marginBottom: 12, height: 44 },
          ]}
        />

        {/* Pool URL */}
        <Card.Section content={[{ text: 'Pool URL', text65: true, $textDefault: true }]} />
        <TextInput
          placeholder={DEFAULT_POOL}
          value={poolUrl}
          onChangeText={setPoolUrl}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.textInput,
            { color: isDark ? 'white' : 'black', backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', marginBottom: 16, height: 44 },
          ]}
        />

        <Button label="Carica file JSON" onPress={onLoadFile} style={{ marginBottom: 16 }} />

        {/* Editor JSON completo - scrollabile internamente */}
        <Card.Section content={[{ text: 'Config JSON completo (avanzata)', text65: true, $textDefault: true }]} />
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
            styles.codeEditor,
            { color: isDark ? '#00ff88' : '#1a1a1a', backgroundColor: isDark ? '#0d0d0d' : '#f0f0f0' },
          ]}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  textInput: {
    borderRadius: 6,
    padding: 10,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#444',
  },
  codeEditor: {
    minHeight: 400,
    fontSize: 11,
    lineHeight: 16,
  },
});

export default EditAdvanceEditorCard;
