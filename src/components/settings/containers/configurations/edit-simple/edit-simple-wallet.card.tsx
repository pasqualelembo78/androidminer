import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, View, Button } from 'react-native-ui-lib';
import { EditSimpleCardProps } from './index';

export const EditSimpleWalletCard: React.FC<EditSimpleCardProps> = ({ localState, setLocalState }) => {

  const createWallet = async () => {
    try {
      const res = await fetch('http://195.231.65.38:17082/json_rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'createAddress',
          params: {}
        })
      });

      const data = await res.json();
      console.log('Risposta RPC:', data);

      if (data.result?.address) {
        const nuovoWallet = {
          address: data.result.address,
          createdAt: new Date().toISOString(),
        };

        setLocalState({
          ...localState,
          wallet: nuovoWallet
        });

      } else {
        console.error('Errore: Nessun address nella risposta RPC');
      }

    } catch (error) {
      console.error('Errore creazione wallet:', error);
    }
  };

  return (
    <Card enableShadow>
      <View padding-20>
        <Text text65 $textDefault>Wallet</Text>
        <Text text90 $textNeutral marginT-5>
          Crea un nuovo wallet personale e gestisci i dati di accesso.
        </Text>
        <View marginT-20>
          <Button label="Crea Wallet" onPress={createWallet} />
        </View>
        {localState.wallet?.address && (
          <View marginT-15>
            <Text text80 $textSuccess>Wallet attuale:</Text>
            <Text text90>{localState.wallet.address}</Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({});
export default EditSimpleWalletCard;