import React from 'react';
import {
  KeyboardAvoidingView,
  TextInput,
  Appearance,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import * as JSON5 from 'json5';
import {
  Card, View, Button, Text, Switch, Slider,
} from 'react-native-ui-lib';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { EditAdvanceCardProps } from './index';

const DEFAULT_POOL_URL  = 'pool.mevacoin.com:3333';
const DEFAULT_ALGO      = 'rx/0';
// Indirizzo RPC del nodo MevaCoin per il solo mining
const DEFAULT_NODE_URL  = '82.165.218.56:18081';
// Max core disponibili su Android (limite conservativo)
const MAX_CORES = 8;

function threadsToHint(threads: number): number {
  return Math.max(1, Math.min(100, Math.ceil((threads / MAX_CORES) * 100)));
}
function hintToThreads(hint: number): number {
  return Math.max(1, Math.min(MAX_CORES, Math.round((hint / 100) * MAX_CORES)));
}

export const EditAdvanceEditorCard: React.FC<EditAdvanceCardProps> = (
  { setLocalState, localState },
) => {
  const isDark = Appearance.getColorScheme() === 'dark';

  const [user,      setUser]      = React.useState('');
  const [threads,   setThreads]   = React.useState(2);       // numero di thread (1-8)
  const [poolUrl,   setPoolUrl]   = React.useState(DEFAULT_POOL_URL);
  const [soloMode,  setSoloMode]  = React.useState(false);   // true = solo mining
  const [nodeUrl,   setNodeUrl]   = React.useState(DEFAULT_NODE_URL);
  const [code,      setCode]      = React.useState<string>('{}');

  // --- Carica config esistente all'avvio ---
  React.useEffect(() => {
    const data = localState.config?.toString() || '{}';
    try {
      const parsed = JSON5.parse(data);
      if (parsed?.pools?.[0]?.user)  setUser(parsed.pools[0].user);
      if (parsed?.pools?.[0]?.url) {
        const savedUrl: string = parsed.pools[0].url;
        if (parsed.pools[0].daemon === true) {
          setSoloMode(true);
          setNodeUrl(savedUrl.includes('melatv') ? DEFAULT_NODE_URL : savedUrl);
        } else {
          setSoloMode(false);
          setPoolUrl(savedUrl.includes('melatv') ? DEFAULT_POOL_URL : savedUrl);
        }
      }
      // Legge thread count: prima dai profili espliciti rx, poi da max-threads-hint
      const rxProfile = parsed?.cpu?.['rx/0'] ?? parsed?.cpu?.rx;
      if (Array.isArray(rxProfile) && rxProfile.length > 0) {
        setThreads(Math.max(1, Math.min(MAX_CORES, rxProfile.length)));
      } else if (parsed?.cpu?.['max-threads-hint']) {
        const hint = Number(parsed.cpu['max-threads-hint']);
        setThreads(hintToThreads(hint));
      }
    } catch (er) {
      console.log(er);
    }
  }, []);

  // --- Rigenera il JSON ogni volta che cambia un campo ---
  React.useEffect(() => {
    const hint = threadsToHint(threads);

    const poolEntry = soloMode
      ? {
          // Solo mining: punta direttamente al nodo RPC di MevaCoin
          url: nodeUrl.trim() || DEFAULT_NODE_URL,
          user,
          pass: 'x',
          algo: DEFAULT_ALGO,
          daemon: true,       // <-- chiave che attiva il solo mining in xmrig
          keepalive: true,
          nicehash: false,
          tls: false,
          enabled: true,
        }
      : {
          // Pool mining normale
          url: poolUrl.trim() || DEFAULT_POOL_URL,
          user,
          pass: 'x',
          algo: DEFAULT_ALGO,
          daemon: false,
          keepalive: true,
          nicehash: false,
          tls: false,
          enabled: true,
        };

    // Costruisce il profilo thread esplicito per rx/0.
    // Ogni entry è [thread_index, affinity (-1 = no pin)].
    // Questo bypassa max-threads-hint che xmrig ignora in slow RandomX mode.
    const rxThreadProfile = Array.from({ length: threads }, () => [1, -1]);

    const jsonObj = {
      autosave: true,
      'donate-level': 0,
      'donate-over-proxy': 0,
      cpu: {
        enabled: true,
        'max-threads-hint': hint, // fallback per altri algoritmi
        priority: 1,
        'memory-pool': true,
        yield: true,
        // Profili espliciti per RandomX — override diretto del conteggio thread
        'rx/0': rxThreadProfile,
        rx: rxThreadProfile,
        'rx/wow': rxThreadProfile,
        'rx/arq': rxThreadProfile,
        'rx/sfx': rxThreadProfile,
        'rx/keva': rxThreadProfile,
      },
      randomx: {
        mode: 'light',
        init: 1,   // usa 1 thread per init dataset (risparmia RAM)
        numa: false, // disabilita NUMA su mobile (causa rallentamenti)
      },
      pools: [poolEntry],
      'log-file': null,
      background: false,
      retries: 5,
      'retry-pause': 5,
      'print-time': 60,
      verbose: 1,
    };
    setCode(JSON.stringify(jsonObj, null, 2));
  }, [user, threads, poolUrl, soloMode, nodeUrl]);

  // --- Sincronizza col genitore ---
  React.useEffect(() => {
    setLocalState((oldState) => ({ ...oldState, config: code }));
  }, [code]);

  // --- Carica file JSON esterno ---
  const onLoadFile = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.plainText, DocumentPicker.types.allFiles],
      });
      const fileContent = await RNFS.readFile(res[0].uri, 'utf8');
      try {
        const parsed = JSON5.parse(fileContent);
        if (parsed?.pools?.[0]?.user) setUser(parsed.pools[0].user);
        if (parsed?.pools?.[0]?.url) {
          const isSolo = parsed.pools[0].daemon === true;
          setSoloMode(isSolo);
          if (isSolo) setNodeUrl(parsed.pools[0].url);
          else        setPoolUrl(parsed.pools[0].url);
        }
        // Legge thread count: prima dai profili espliciti rx, poi da max-threads-hint
        const rxProfileFile = parsed?.cpu?.['rx/0'] ?? parsed?.cpu?.rx;
        if (Array.isArray(rxProfileFile) && rxProfileFile.length > 0) {
          setThreads(Math.max(1, Math.min(MAX_CORES, rxProfileFile.length)));
        } else if (parsed?.cpu?.['max-threads-hint']) {
          setThreads(hintToThreads(Number(parsed.cpu['max-threads-hint'])));
        }
      } catch {
        Alert.alert('Errore', 'Errore nel parsing del file JSON');
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Errore', 'Errore durante la selezione del file');
      }
    }
  };

  const inputStyle = [
    styles.textInput,
    {
      color: isDark ? 'white' : 'black',
      backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
      marginBottom: 12,
      height: 44,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 80 : 0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* === LEVETTA SOLO / POOL === */}
        <View
          style={{
            borderRadius: 10,
            padding: 14,
            marginBottom: 16,
            backgroundColor: soloMode
              ? (isDark ? '#1a2a1a' : '#f0fff4')
              : (isDark ? '#1a1a2a' : '#f0f4ff'),
          }}
        >
          <View row centerV marginB-6>
            <View flex>
              <Text text70 style={{ fontWeight: 'bold', color: isDark ? '#fff' : '#111' }}>
                {soloMode ? '⛏️  Solo Mining' : '🏊  Pool Mining'}
              </Text>
              <Text text100 style={{ color: isDark ? '#aaa' : '#555', marginTop: 2 }}>
                {soloMode
                  ? 'Metti al tuo nodo direttamente. Blocchi rari ma guadagno intero.'
                  : 'Condividi il lavoro col pool. Guadagno frequente ma diviso.'}
              </Text>
            </View>
            <Switch
              value={soloMode}
              onValueChange={setSoloMode}
            />
          </View>

          {soloMode && (
            <View
              style={{
                borderRadius: 6,
                padding: 10,
                backgroundColor: isDark ? '#0d1f0d' : '#d4edda',
                marginTop: 4,
              }}
            >
              <Text text100 style={{ color: isDark ? '#90ee90' : '#155724', fontSize: 11 }}>
                ℹ️ In solo mining devi puntare a un nodo MevaCoin con RPC attivo.
                Puoi usare il nodo del server ({DEFAULT_NODE_URL}) oppure il tuo nodo locale.
              </Text>
            </View>
          )}
        </View>

        {/* === WALLET === */}
        <Text text75 $textDefault marginB-4>Indirizzo Wallet</Text>
        <TextInput
          placeholder="M9KEn... (il tuo indirizzo MevaCoin)"
          value={user}
          onChangeText={setUser}
          autoCapitalize="none"
          autoCorrect={false}
          style={inputStyle}
        />

        {/* === URL POOL o NODO === */}
        <Text text75 $textDefault marginB-4>
          {soloMode ? 'URL Nodo RPC' : 'URL Pool'}
        </Text>
        <TextInput
          placeholder={soloMode ? DEFAULT_NODE_URL : DEFAULT_POOL_URL}
          value={soloMode ? nodeUrl : poolUrl}
          onChangeText={soloMode ? setNodeUrl : setPoolUrl}
          autoCapitalize="none"
          autoCorrect={false}
          style={inputStyle}
        />

        {/* === THREAD CPU === */}
        <Text text75 $textDefault marginB-4>
          Thread CPU: <Text style={{ fontWeight: 'bold' }}>{threads}</Text>
          <Text text100 style={{ color: isDark ? '#aaa' : '#777' }}>
            {' '}(hint: {threadsToHint(threads)}%)
          </Text>
        </Text>
        <View row centerV marginB-16>
          <Text text100 $textNeutralLight marginR-8>1</Text>
          <Slider
            containerStyle={{ flex: 1 }}
            minimumValue={1}
            maximumValue={MAX_CORES}
            step={1}
            value={threads}
            onValueChange={(v) => setThreads(v)}
          />
          <Text text100 $textNeutralLight marginL-8>{MAX_CORES}</Text>
        </View>

        <Button label="Carica file JSON" onPress={onLoadFile} style={{ marginBottom: 16 }} />

        {/* === JSON EDITOR === */}
        <Text text75 $textDefault marginB-4>Config JSON (sola lettura / modifica libera)</Text>
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
              color: isDark ? '#00ff88' : '#1a1a1a',
              backgroundColor: isDark ? '#0d0d0d' : '#f0f0f0',
              minHeight: 400,
              fontSize: 11,
              lineHeight: 16,
            },
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
});

export default EditAdvanceEditorCard;
