/* eslint-disable max-classes-per-file */
import _ from 'lodash';
import base64 from 'react-native-base64';
import * as JSON5 from 'json5';
import {
  Configuration,
  ConfigurationMode,
  IAdvanceConfiguration,
  ISimpleConfiguration,
} from '../settings/settings.interface';
import { config as configJson } from './config';

type Pool = {
    user: string;
    pass: string;
    url: string;
    tls: boolean;
}

class ConfigBuilderPrivate {
  config: Record<string, any> = _.cloneDeep(configJson);

  reset() {
    this.config = _.cloneDeep(configJson);
  }

  setConfig(data: Record<string, any>) {
    this.config = _.cloneDeep(data);
  }

  setPool(pool: Partial<Pool>) {
    this.config = {
      ...this.config,
      pools: [
        {
          ...this.config.pools[0],
          ...pool,
        },
      ],
    };
  }

  setProps(props: Record<string, any>) {
    this.config = _.merge(this.config, props);
  }

  getConfigString() {
    return JSON.stringify(this.config);
  }

  getConfigBase64() {
    return base64.encode(this.getConfigString());
  }
}

export default class ConfigBuilder {
  public static build(configuration: Configuration): ConfigBuilderPrivate | null {
    if (!configuration) return null;

    const pConfig = new ConfigBuilderPrivate();

    if (configuration.mode === ConfigurationMode.SIMPLE) {
      const asSimpleConfig: ISimpleConfiguration = _.cloneDeep(configuration);
      pConfig.reset();
      pConfig.setPool({
        user: asSimpleConfig.properties?.pool?.username,
        pass: asSimpleConfig.properties?.pool?.password || 'x',
        url: `${asSimpleConfig.properties?.pool?.hostname}:${asSimpleConfig.properties?.pool?.port}`,
        tls: asSimpleConfig.properties?.pool?.sslEnabled,
      });
      pConfig.setProps({
        // FIX: Forzato algo rx/0 e donate-level 0 anche in simple mode
        'algo': 'rx/0',
        'donate-level': 0,
        'donate-over-proxy': 0,
        cpu: {
          priority: asSimpleConfig.properties?.cpu?.priority,
          yield: asSimpleConfig.properties?.cpu?.yield,
          'max-threads-hint': asSimpleConfig.properties?.cpu?.max_threads_hint,
        },
        randomx: {
          mode: asSimpleConfig.properties?.cpu?.random_x_mode || 'auto',
        },
      });
      pConfig.setProps({ cpu: { ...asSimpleConfig.properties?.algos } });
      pConfig.setProps({ 'algo-perf': asSimpleConfig.properties?.algo_perf });
    }

    if (configuration.mode === ConfigurationMode.ADVANCE) {
      const asAdvancedConfig: IAdvanceConfiguration = _.cloneDeep(configuration);
      const parsed = JSON5.parse(asAdvancedConfig.config || '{}');

      // FIX: Forza sempre donate-level a 0 e algo rx/0 anche in modalità avanzata,
      // indipendentemente da quello che l'utente ha scritto nel JSON.
      // Questo previene il DONATE 5% di default di xmrig e l'algo sbagliato.
      parsed['donate-level'] = 0;
      parsed['donate-over-proxy'] = 0;
      if (parsed.pools && parsed.pools[0]) {
        // Se l'utente non ha specificato algo, o ha specificato uno sbagliato, usa rx/0
        const userAlgo: string = parsed.pools[0].algo || '';
        const isCryptonight = userAlgo.toLowerCase().includes('cryptonight') || userAlgo.toLowerCase().includes('trtl');
        if (!userAlgo || isCryptonight) {
          parsed.pools[0].algo = 'rx/0';
        }
        // Rimuovi il campo 'variant' che appartiene a CryptoNight, non a RandomX
        delete parsed.pools[0].variant;
      }

      pConfig.setConfig(parsed);
      pConfig.setProps({
        http: { enabled: true, host: '127.0.0.1', port: 50080, 'access-token': null, restricted: true },
        background: false,
        colors: true,
      });
    }

    return pConfig;
  }
}
