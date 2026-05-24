import 'text-encoding-polyfill';
import Joi from 'joi';
import { ConfigurationMode, RandomXMode } from '../settings/settings.interface';

export const hostnameValidator = Joi.string().min(3).max(100).required();
export const usernameValidator = Joi.optional();
export const passwordValidator = Joi.optional();
export const portValidator = Joi.number().integer().min(10).max(65550).required();

export const poolValidator = Joi.object({
  hostname: hostnameValidator,
  username: usernameValidator,
  password: passwordValidator,
  port: portValidator,
  sslEnabled: Joi.boolean(),
});

// MevaCoin genera indirizzi con prefisso 27 (base58 = 'M...', lunghezza 95 chars).
// La versione precedente del pool usava prefisso 47 ('b...', lunghezza 98 chars).
// Supportiamo entrambi i formati.
export const validateWalletAddress = (addr?: string): boolean => {
  if (addr == null || addr.trim() === '') return false;
  const a = addr.trim();
  // M... (prefisso 27) — lunghezza esatta 95
  if (/^M[1-9A-HJ-NP-Za-km-z]{94}$/.test(a)) return true;
  // b... (prefisso 47) — lunghezza 91-116
  if (/^b[1-9A-HJ-NP-Za-km-z]{90,115}$/.test(a)) return true;
  return false;
};

export const yieldValidator = Joi.boolean().required();
export const priorityValidator = Joi.number().min(1).max(5).optional();
export const maxThreadsHintValidator = Joi.number().min(1).max(100).required();
export const randomXModedValidator = Joi
  .string()
  .valid(RandomXMode.AUTO, RandomXMode.FAST, RandomXMode.LIGHT)
  .required();

export const cpuValidator = Joi.object({
  yield: yieldValidator,
  priority: priorityValidator,
  max_threads_hint: maxThreadsHintValidator,
  random_x_mode: randomXModedValidator,
});

export const configurationModeValidator = Joi
  .string()
  .valid(ConfigurationMode.SIMPLE, ConfigurationMode.ADVANCE)
  .required();

export const getConfigurationNameValidator = (names: string[]) => Joi
  .string().min(1).max(30)
  .custom((value, helper: Joi.CustomHelpers) => {
    if (names.includes(value)) {
      return helper.message({ '*': 'Configuration name already exists' });
    }
    return value;
  })
  .required();

export const getConfigurationValidator = (names: string[]) => Joi.object({
  name: getConfigurationNameValidator(names),
  mode: configurationModeValidator,
});
