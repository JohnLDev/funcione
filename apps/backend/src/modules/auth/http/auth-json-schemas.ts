import { userProfileNameMaxLength } from '../domain/user-profile.js';

export const authenticatedUserJsonSchema = {
  type: 'object',
  required: ['id', 'email', 'provider'],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    email: { type: ['string', 'null'], format: 'email' },
    provider: { type: ['string', 'null'] },
  },
} as const;

export const currentUserResponseJsonSchema = {
  type: 'object',
  required: ['user'],
  additionalProperties: false,
  properties: {
    user: authenticatedUserJsonSchema,
  },
} as const;

export const requiredUserProfileFieldJsonSchema = {
  type: 'string',
  enum: [
    'firstName',
    'lastName',
    'cpf',
    'birthDate',
    'phoneNumber',
    'email',
  ],
} as const;

export const completeUserProfileBodyJsonSchema = {
  type: 'object',
  required: [
    'firstName',
    'lastName',
    'cpf',
    'birthDate',
    'phoneNumber',
    'email',
  ],
  additionalProperties: false,
  properties: {
    firstName: {
      type: 'string',
      minLength: 2,
      maxLength: userProfileNameMaxLength,
    },
    lastName: {
      type: 'string',
      minLength: 2,
      maxLength: userProfileNameMaxLength,
    },
    cpf: {
      type: 'string',
      description: 'Brazilian CPF. Punctuation is accepted but stored as digits.',
      minLength: 11,
    },
    birthDate: { type: 'string', format: 'date' },
    phoneNumber: {
      type: 'string',
      description: 'Phone number. Punctuation is accepted but stored as digits.',
      minLength: 10,
    },
    email: { type: 'string', format: 'email' },
  },
} as const;

export const userProfileJsonSchema = {
  type: 'object',
  required: [
    'userId',
    'firstName',
    'lastName',
    'cpf',
    'birthDate',
    'phoneNumber',
    'email',
    'createdAt',
    'updatedAt',
  ],
  additionalProperties: false,
  properties: {
    userId: { type: 'string' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    cpf: { type: 'string' },
    birthDate: { type: 'string', format: 'date' },
    phoneNumber: { type: 'string' },
    email: { type: 'string', format: 'email' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const userProfileStateResponseJsonSchema = {
  type: 'object',
  required: ['completed', 'profile', 'requiredFields'],
  additionalProperties: false,
  properties: {
    completed: { type: 'boolean' },
    profile: {
      anyOf: [userProfileJsonSchema, { type: 'null' }],
    },
    requiredFields: {
      type: 'array',
      items: requiredUserProfileFieldJsonSchema,
    },
  },
} as const;

export const completeUserProfileResponseJsonSchema = {
  type: 'object',
  required: ['completed', 'profile'],
  additionalProperties: false,
  properties: {
    completed: { type: 'boolean', const: true },
    profile: userProfileJsonSchema,
  },
} as const;
