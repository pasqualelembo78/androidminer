import React from 'react';
import { ScrollView, Animated, Easing } from 'react-native';
import { View, Text, Colors } from 'react-native-ui-lib';
import { Battery } from '@brightlayer-ui/react-native-progress-icons';
import chroma from 'chroma-js';
import { SessionDataContext } from '../../../../core/session-data/session-data.context';
import { XMRigView } from '../../containers/xmrig-view';
import { MinerControl } from '../../components/miner-control.component';
import { PowerContext } from '../../../../core/power/power.context';

// Soglie di temperatura
const TEMP_WARNING = 45;   // ⚠️ giallo
const TEMP_CRITICAL = 55;  // 🔴 rosso + lampeggio

const MinerScreen = () => {
  const {
    workingState, minerData, hashrateTotals, CPUTemp,
  } = React.useContext(SessionDataContext);
  const powerContext = React.useContext(PowerContext);

  // Animazione lampeggio per temperatura critica
  const blinkAnim = React.useRef(new Animated.Value(1)).current;
  const blinkRef = React.useRef<Animated.CompositeAnimation | null>(null);

  React.useEffect(() => {
    if (CPUTemp >= TEMP_CRITICAL) {
      blinkRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.linear }),
          Animated.timing(blinkAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.linear }),
        ]),
      );
      blinkRef.current.start();
    } else {
      blinkRef.current?.stop();
      blinkAnim.setValue(1);
    }
    return () => blinkRef.current?.stop();
  }, [CPUTemp >= TEMP_CRITICAL]);

  const battryColor = React.useMemo(() => {
    const cScale = chroma.scale([
      Colors.$backgroundDangerHeavy,
      Colors.$backgroundWarningHeavy,
      Colors.$backgroundSuccessHeavy,
    ]);
    return cScale(powerContext.batteryLevel / 100).hex();
  }, [powerContext.batteryLevel]);

  // Colore termometro basato sulla temperatura
  const tempColor = React.useMemo(() => {
    if (CPUTemp >= TEMP_CRITICAL) return Colors.$backgroundDangerHeavy || '#e53935';
    if (CPUTemp >= TEMP_WARNING) return Colors.$backgroundWarningHeavy || '#fb8c00';
    return Colors.$textNeutral || undefined;
  }, [CPUTemp]);

  const isCritical = CPUTemp >= TEMP_CRITICAL;
  const isWarning = CPUTemp >= TEMP_WARNING;

  return (
    <View bg-screenBG flex>
      <View paddingV-10 paddingH-10>
        <MinerControl />
      </View>
      <View flex paddingH-10>
        <ScrollView nestedScrollEnabled>
          <View flex row spread centerV>
            <Text text60>Statistiche</Text>

            {/* Sezione temperatura */}
            <View flex flex-1 right paddingH-10 row centerV>
              {/* Esclamativo critico lampeggiante */}
              {isCritical && (
                <Animated.Text
                  style={{
                    opacity: blinkAnim,
                    color: Colors.$backgroundDangerHeavy || '#e53935',
                    fontSize: 18,
                    fontWeight: 'bold',
                    marginRight: 4,
                  }}
                >
                  {'⚠️'}
                </Animated.Text>
              )}
              {/* Esclamativo warning fisso (non critico) */}
              {isWarning && !isCritical && (
                <Text
                  style={{
                    color: Colors.$backgroundWarningHeavy || '#fb8c00',
                    fontSize: 16,
                    fontWeight: 'bold',
                    marginRight: 4,
                  }}
                >
                  {'!'}
                </Text>
              )}
              <Text
                text80
                style={{ color: tempColor, fontWeight: isWarning ? 'bold' : 'normal' }}
              >
                {CPUTemp > 0 ? CPUTemp.toFixed(1) : '---'}
                {' ℃'}
              </Text>
            </View>

            <View padding-0 margin-0>
              <Battery
                percent={powerContext.batteryLevel}
                size={40}
                color={battryColor}
                charging={powerContext.isPowerConnected}
                outlined={false}
              />
            </View>
          </View>

          <XMRigView
            workingState={workingState}
            minerData={minerData}
            hashrateHistory={hashrateTotals}
          />
        </ScrollView>
      </View>
    </View>
  );
};

export default MinerScreen;
