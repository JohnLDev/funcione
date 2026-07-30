export type AdsSlotKey =
  | 'desktopSidebar'
  | 'preFooter'
  | 'trainingPreparation';

export type AdsFormat = 'auto' | 'autorelaxed';

export type AdsSlotConfig = {
  format: AdsFormat;
  fullWidthResponsive: boolean;
  id: string;
  label: AdsSlotKey;
  testId: string;
};

export type AdsConfig = {
  clientId: string;
  enabled: boolean;
  slots: Record<AdsSlotKey, AdsSlotConfig>;
  testMode: boolean;
};

export type AdsEnv = Partial<
  Pick<
    ImportMetaEnv,
    | 'VITE_ADS_ENABLED'
    | 'VITE_ADSENSE_CLIENT_ID'
    | 'VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR'
    | 'VITE_ADSENSE_SLOT_PRE_FOOTER'
    | 'VITE_ADSENSE_SLOT_TRAINING_PREPARATION'
    | 'VITE_ADS_TEST_MODE'
  >
>;

function readEnvValue(value: string | undefined) {
  return value?.trim() ?? '';
}

function readEnabled(value: string | undefined) {
  return readEnvValue(value).toLowerCase() === 'true';
}

function buildSlot(
  label: AdsSlotKey,
  id: string | undefined,
  format: AdsFormat,
  fullWidthResponsive: boolean,
): AdsSlotConfig {
  return {
    format,
    fullWidthResponsive,
    id: readEnvValue(id),
    label,
    testId: `adsense-slot-${label.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`,
  };
}

export function readAdsConfig(env: AdsEnv = import.meta.env): AdsConfig {
  const clientId = readEnvValue(env.VITE_ADSENSE_CLIENT_ID);
  const slots = {
    desktopSidebar: buildSlot(
      'desktopSidebar',
      env.VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR,
      'auto',
      true,
    ),
    preFooter: buildSlot(
      'preFooter',
      env.VITE_ADSENSE_SLOT_PRE_FOOTER,
      'autorelaxed',
      false,
    ),
    trainingPreparation: buildSlot(
      'trainingPreparation',
      env.VITE_ADSENSE_SLOT_TRAINING_PREPARATION,
      'auto',
      true,
    ),
  };
  const enabled =
    readEnabled(env.VITE_ADS_ENABLED) &&
    clientId.length > 0 &&
    Object.values(slots).some((slot) => slot.id.length > 0);

  return {
    clientId,
    enabled,
    slots,
    testMode: readEnabled(env.VITE_ADS_TEST_MODE),
  };
}

export const adsConfig = readAdsConfig();
