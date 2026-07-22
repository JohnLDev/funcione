import { z } from 'zod';

export const requiredUserProfileFields = [
  'firstName',
  'lastName',
  'cpf',
  'birthDate',
  'phoneNumber',
  'email',
] as const;

export type RequiredUserProfileField = (typeof requiredUserProfileFields)[number];

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calculateDigit = (digits: string, factor: number) => {
    const total = digits
      .split('')
      .reduce((sum, digit) => sum + Number(digit) * factor--, 0);
    const remainder = (total * 10) % 11;

    return remainder === 10 ? 0 : remainder;
  };

  const firstDigit = calculateDigit(cpf.slice(0, 9), 10);
  const secondDigit = calculateDigit(cpf.slice(0, 10), 11);

  return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
}

function isPastDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date < new Date();
}

export const CompleteUserProfileInputSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  cpf: z.string().transform(onlyDigits).refine(isValidCpf, 'Invalid CPF.'),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isPastDate),
  phoneNumber: z.string().transform(onlyDigits).refine(
    (value) => value.length >= 10 && value.length <= 15,
    'Invalid phone number.',
  ),
  email: z.string().trim().email().toLowerCase(),
});

export type CompleteUserProfileInput = z.infer<
  typeof CompleteUserProfileInputSchema
>;

export type UserProfile = CompleteUserProfileInput & {
  createdAt: string;
  updatedAt: string;
  userId: string;
};
