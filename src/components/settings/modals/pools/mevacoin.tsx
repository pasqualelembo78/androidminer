import React from 'react';
import { Incubator } from 'react-native-ui-lib';
import { IPool, sharedStyles } from '.';
import { validateWalletAddress } from '../../../../core/utils';

const hostname = 'pool.mevacoin.com';
const port = 3333;

export const MevaCoin: React.FC<IPool> = ({ onChange }) => {
  const [wallet, setWallet] = React.useState<string>('');

  React.useEffect(() => {
    onChange({
      hostname,
      port,
      username: wallet.trim(),
      password: 'x',
    });
  }, [wallet]);

  return (
    <Incubator.TextField
      label="Wallet Address MevaCoin"
      value={wallet}
      onChangeText={(v: string) => setWallet(v.trim())}
      validate={['required', (value: string) => validateWalletAddress(value)]}
      validationMessage={[
        'Obbligatorio',
        'Indirizzo non valido — deve iniziare con "M" (95 chars) o "b" (98 chars)',
      ]}
      validateOnChange
      enableErrors
      floatOnFocus
      showCharCounter
      maxLength={120}
      fieldStyle={sharedStyles.withUnderline}
      hint="M8Ua6vNrt8eRYPQ..."
      placeholder="M8Ua6vNrt8eRYPQ..."
      numberOfLines={1}
      textBreakStrategy="simple"
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
};
