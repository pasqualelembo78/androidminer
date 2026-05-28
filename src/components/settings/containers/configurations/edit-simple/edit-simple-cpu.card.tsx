import { merge } from 'lodash/fp';
import React from 'react';
import {
  Card, Colors, Slider, Switch, Text, View, SkeletonView,
} from 'react-native-ui-lib';
import { EditSimpleCardProps } from './index';
import { cpuValidator } from '../../../../../core/utils/validators';

// Converte "numero di thread desiderati" in "max-threads-hint %" per xmrig.
// xmrig usa max-threads-hint come percentuale dei core fisici del dispositivo.
// Su un dispositivo con N core: threads_hint = ceil(desiredThreads / N * 100)
// Usiamo 8 come massimo sicuro (valore più comune su Android).
// Il valore viene clampato a [1, 100].
const MAX_CORES = 8;
function threadsToHint(threads: number): number {
  const pct = Math.ceil((threads / MAX_CORES) * 100);
  return Math.max(1, Math.min(100, pct));
}
function hintToThreads(hint: number): number {
  return Math.max(1, Math.round((hint / 100) * MAX_CORES));
}

export const EditSimpleCPUCard: React.FC<EditSimpleCardProps> = (
  { setLocalState, localState },
) => {
  const [valid, setValid] = React.useState<boolean>(
    cpuValidator.validate(localState.properties?.cpu || {}).error == null,
  );

  React.useEffect(() => {
    setValid(
      cpuValidator.validate(localState.properties?.cpu || {}).error == null,
    );
  }, [localState.properties]);

  // Thread correnti: ricaviamo dal hint salvato, default 2
  const currentHint: number = localState.properties?.cpu?.max_threads_hint
    ? Number(localState.properties.cpu.max_threads_hint)
    : threadsToHint(2);
  const currentThreads: number = hintToThreads(currentHint);

  const onThreadsChange = (threads: number) => {
    const hint = threadsToHint(threads);
    setLocalState((oldState) => merge(
      oldState,
      { properties: { cpu: { max_threads_hint: hint } } },
    ));
  };

  return (
    <Card
      enableShadow
      selected={!valid}
      selectionOptions={{ hideIndicator: true, color: Colors.$outlineDanger }}
    >
      <View centerV spread padding-20 paddingB-5>
        <Card.Section
          style={{ flexShrink: 1 }}
          content={[{ text: 'CPU', text65: true, $textDefault: true }]}
        />
      </View>
      <View spread padding-20 paddingT-10>

        {/* Thread — slider semplice 1-8 */}
        <View marginB-20>
          <Text text75 $textDefault marginB-4>
            Thread CPU: <Text style={{ fontWeight: 'bold' }}>{currentThreads}</Text>
          </Text>
          <Text text100 $textNeutralLight marginB-8>
            Quanti core usare per il mining. Meno thread = telefono più reattivo.
            Consigliato: 1-2 per uso normale, 4+ se il telefono è in carica.
          </Text>
          <View row centerV>
            <Text text100 $textNeutralLight marginR-8>1</Text>
            <Slider
              containerStyle={{ flex: 1 }}
              minimumValue={1}
              maximumValue={MAX_CORES}
              step={1}
              value={currentThreads}
              onValueChange={(v) => onThreadsChange(v)}
            />
            <Text text100 $textNeutralLight marginL-8>{MAX_CORES}</Text>
          </View>
        </View>

        {/* Yield */}
        <View marginB-10>
          <View row flex>
            <Text text80 $textNeutralLight flex column marginB-5>
              Risparmia risorse di sistema (Yield)
            </Text>
            <Switch
              value={localState.properties?.cpu?.yield !== false}
              onValueChange={(value) => setLocalState((oldState) => merge(
                oldState,
                { properties: { cpu: { yield: value } } },
              ))}
            />
          </View>
          <Text text100 $textNeutralLight row>
            ON = il miner cede la CPU ad altre app quando necessario (consigliato).
            OFF = massimo hashrate ma il telefono rallenta.
          </Text>
        </View>

      </View>
    </Card>
  );
};

const EditSimpleCPUCardSkeleton: React.FC<EditSimpleCardProps> = (props) => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  React.useEffect(() => {
    const interval = setTimeout(() => setLoaded(true), 800);
    return () => {
      clearTimeout(interval);
      setLoaded(false);
    };
  }, []);

  return (
    <SkeletonView
      template={SkeletonView.templates.TEXT_CONTENT}
      customValue={props}
      showContent={loaded}
      renderContent={
        (customProps: EditSimpleCardProps) => (<EditSimpleCPUCard {...customProps} />)
      }
      times={3}
    />
  );
};

export default EditSimpleCPUCardSkeleton;
