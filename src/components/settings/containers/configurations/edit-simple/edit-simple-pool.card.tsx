import { merge } from 'lodash/fp';
import React from 'react';
import {
  Card, Colors, Incubator, SkeletonView, Switch, Text, View,
} from 'react-native-ui-lib';
import { StyleSheet } from 'react-native';
import { EditSimpleCardProps } from './index';
import {
  hostnameValidator, passwordValidator, poolValidator, portValidator, usernameValidator,
} from '../../../../../core/utils/validators';

export const EditSimplePoolCard: React.FC<EditSimpleCardProps> = (
  { setLocalState, localState },
) => {
  const [valid, setValid] = React.useState<boolean>(
    poolValidator.validate(localState.properties?.pool || {}).error == null,
  );

  React.useEffect(() => {
    setValid(
      poolValidator.validate(localState.properties?.pool || {}).error == null,
    );
  }, [localState.properties]);

  return (
    <Card
      enableShadow
      selected={!valid}
      selectionOptions={{
        hideIndicator: true,
        color: Colors.$outlineDanger,
      }}
    >
      <View spread padding-20 paddingT-10>
        <View flex row>
          <View flex-2 marginR-20>
            <Incubator.TextField
              placeholder="Hostname / IP"
              floatingPlaceholder
              value={localState.properties?.pool?.hostname || 'melatv.it'}
              onChangeText={(text) => setLocalState((oldState) => merge(
                oldState,
                { properties: { pool: { hostname: text } } },
              ))}
              validate={(value: string) => hostnameValidator.validate(value).error == null}
              validationMessage={hostnameValidator.validate(localState.properties?.pool?.hostname).error?.message}
              validateOnChange
              enableErrors
              floatOnFocus
              showCharCounter
              maxLength={128}
              fieldStyle={styles.withUnderline}
              hint="melatv.it"
              keyboardType="url"
            />
          </View>
          <View flex-1>
            <Incubator.TextField
              placeholder="Port"
              floatingPlaceholder
              value={localState.properties?.pool?.port?.toString() || '3333'}
              onChangeText={(text) => setLocalState((oldState) => merge(
                oldState,
                { properties: { pool: { port: text } } },
              ))}
              validate={(value: string) => portValidator.validate(value).error == null}
              validationMessage={portValidator.validate(localState.properties?.pool?.port).error?.message}
              validateOnChange
              enableErrors
              floatOnFocus
              showCharCounter
              maxLength={5}
              fieldStyle={styles.withUnderline}
              hint="3333"
              keyboardType="numeric"
            />
          </View>
        </View>
        <Incubator.TextField
          placeholder="Username"
          floatingPlaceholder
          value={localState.properties?.pool?.username}
          onChangeText={(text) => setLocalState((oldState) => merge(
            oldState,
            { properties: { pool: { username: text } } },
          ))}
          validate={(value: string) => usernameValidator.validate(value).error == null}
          validationMessage={usernameValidator.validate(localState.properties?.pool?.username).error?.message}
          validateOnChange
          enableErrors
          floatOnFocus
          showCharCounter
          maxLength={128}
          fieldStyle={styles.withUnderline}
          hint="Mostly used for wallet"
        />
        <Incubator.TextField
          placeholder="Password"
          floatingPlaceholder
          value={localState.properties?.pool?.password}
          onChangeText={(text) => setLocalState((oldState) => merge(
            oldState,
            { properties: { pool: { password: text } } },
          ))}
          validate={(value: string) => passwordValidator.validate(value).error == null}
          validationMessage={passwordValidator.validate(localState.properties?.pool?.password).error?.message}
          validateOnChange
          enableErrors
          floatOnFocus
          showCharCounter
          maxLength={128}
          fieldStyle={styles.withUnderline}
        />
        <View row flex paddingT-20>
          <Text text80 $textNeutralLight flex column>SSL</Text>
          <Switch
            value={localState.properties?.pool?.sslEnabled}
            onValueChange={(value) => setLocalState((oldState) => merge(
              oldState,
              { properties: { pool: { sslEnabled: value } } },
            ))}
          />
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  withUnderline: {
    borderBottomWidth: 1,
    borderColor: Colors.$outlineDisabled,
    paddingBottom: 4,
  },
});

const EditSimplePoolCardSkeleton: React.FC<EditSimpleCardProps> = (props) => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  React.useEffect(() => {
    const interval = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(interval);
  }, []);

  return (
    <SkeletonView
      template={SkeletonView.templates.TEXT_CONTENT}
      customValue={props}
      showContent={loaded}
      renderContent={(customProps: EditSimpleCardProps) => (<EditSimplePoolCard {...customProps} />)}
      times={3}
    />
  );
};

export default EditSimplePoolCardSkeleton;