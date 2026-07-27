import type {
  AthleticProfile,
  AthleticProfileInput,
} from '../domain/monthly-plan.js';

export type AthleticProfileRepository = {
  findByUserId: (userId: string) => Promise<AthleticProfile | null>;
  upsert: (
    userId: string,
    profile: AthleticProfileInput,
  ) => Promise<AthleticProfile>;
};
