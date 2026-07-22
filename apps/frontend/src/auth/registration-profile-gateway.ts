import { createApiRegistrationProfileGateway } from './api-registration-profile-gateway.js';
import { createMockRegistrationProfileGateway } from './mock-registration-profile-gateway.js';
import type { RegistrationProfileGateway } from './registration-profile.js';

export function createRegistrationProfileGateway(): RegistrationProfileGateway {
  if (import.meta.env.VITE_AUTH_MODE === 'mock') {
    return createMockRegistrationProfileGateway();
  }

  return createApiRegistrationProfileGateway();
}
