import React from 'react';
import {
  Card, Slider, Text, View, Switch, TouchableOpacity,
} from 'react-native-ui-lib';
import { Linking, Alert } from 'react-native';
import { useDebouncedCallback } from 'use-debounce';
import { SettingsCardProps } from '.';
import { ISettings } from '../../../../core/settings/settings.interface';

// Wallet del pool MevaCoin — le donazioni vanno qui, non a xmrig
const POOL_DONATION_WALLET = 'MCT8yaZmJu68Wk1ZeauyRh1r6DQ8HXhqNhXjpMDZEBQYNJ526gXAMpMYopxp59ovDchXx23jVGTcHc7mANuumdZm8JLEY6f';
const POOL_DONATION_URL = 'pool.mevacoin.com:3333';

const SettingsOthersCard: React.FC<SettingsCardProps<ISettings>> = ({
  settings,
  onUpdate,
}) => {
  const debouncedUpdate = useDebouncedCallback(onUpdate, 1000);

  const showDonationInfo = () => {
    Alert.alert(
      'Donazione volontaria al Pool',
      `Se abiliti la donazione, una percentuale del tuo hashrate minerà per il wallet del pool MevaCoin.\n\nWallet:\n${POOL_DONATION_WALLET}\n\nPool: ${POOL_DONATION_URL}\n\nNessuna donazione viene inviata a sviluppatori terzi (xmrig o altri).`,
      [{ text: 'OK' }],
    );
  };

  return (
    <Card enableShadow>
      {/* Print Time */}
      <View centerV spread padding-20 paddingB-5>
        <Card.Section
          style={{ flexShrink: 1 }}
          content={[{ text: 'Altro', text65: true, $textDefault: true }]}
        />
      </View>
      <View spread padding-20 paddingT-10>
        <View marginB-20>
          <View flex marginB-5>
            <Text text75 $textDefault>Frequenza report hashrate</Text>
            <Text text100 $textDefault>
              Stampa il rapporto di hashrate ogni N secondi
            </Text>
          </View>
          <View row flex centerV>
            <Slider
              containerStyle={{ flex: 1 }}
              minimumValue={0}
              maximumValue={300}
              step={10}
              value={settings.printTime}
              onValueChange={(value) => debouncedUpdate({ printTime: value })}
            />
            <Text marginL-10>{settings.printTime}s</Text>
          </View>
        </View>

        {/* Donazione volontaria al pool */}
        <View marginB-10>
          <View row flex centerV marginB-5>
            <View flex>
              <Text text75 $textDefault>Donazione volontaria al Pool MevaCoin</Text>
              <Text text100 $textDefault>
                Destina una parte del tuo hashrate al wallet del pool (0% = nessuna donazione)
              </Text>
            </View>
            <TouchableOpacity onPress={showDonationInfo} marginL-8>
              <Text style={{ fontSize: 18 }}>ℹ️</Text>
            </TouchableOpacity>
          </View>

          <View row flex centerV marginB-5>
            <Slider
              containerStyle={{ flex: 1 }}
              minimumValue={0}
              maximumValue={10}
              step={1}
              value={settings.donation ?? 0}
              onValueChange={(value) => debouncedUpdate({ donation: value })}
            />
            <Text marginL-10 style={{ minWidth: 36 }}>
              {(settings.donation ?? 0) === 0 ? 'OFF' : `${settings.donation}%`}
            </Text>
          </View>

          {(settings.donation ?? 0) > 0 && (
            <View backgroundColor="#f0fff4" padding-10 style={{ borderRadius: 8, marginTop: 4 }}>
              <Text text100 style={{ color: '#276749', fontSize: 11 }}>
                ✅ Il {settings.donation}% del tuo hashrate andrà al pool MevaCoin.
              </Text>
              <Text text100 style={{ color: '#276749', fontSize: 10, marginTop: 2 }}>
                {POOL_DONATION_WALLET.slice(0, 32)}...
              </Text>
            </View>
          )}

          {(settings.donation ?? 0) === 0 && (
            <View backgroundColor="#fff8f0" padding-10 style={{ borderRadius: 8, marginTop: 4 }}>
              <Text text100 style={{ color: '#744210', fontSize: 11 }}>
                ℹ️ Nessuna donazione attiva. Porta lo slider a destra per supportare il pool.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

export default SettingsOthersCard;
