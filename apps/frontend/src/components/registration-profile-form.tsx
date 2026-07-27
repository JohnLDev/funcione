import { Save, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { RegistrationProfileInput } from '@/auth/registration-profile.js';
import { Button } from './ui/button.js';

type RegistrationProfileFormValues = RegistrationProfileInput & {
  password?: string;
};

type RegistrationProfileFormProps = {
  emailReadonly?: boolean;
  initialValues?: Partial<RegistrationProfileInput>;
  isSubmitting: boolean;
  mode: 'complete' | 'signup';
  onSubmit: (values: RegistrationProfileFormValues) => Promise<void>;
  submitLabel: string;
};

const emptyProfile: RegistrationProfileInput = {
  birthDate: '',
  cpf: '',
  email: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
};

export function RegistrationProfileForm({
  emailReadonly = false,
  initialValues,
  isSubmitting,
  mode,
  onSubmit,
  submitLabel,
}: RegistrationProfileFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<RegistrationProfileFormValues>({
    ...emptyProfile,
    ...initialValues,
    password: '',
  });

  const updateValue = (key: keyof RegistrationProfileFormValues, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const profileValues: RegistrationProfileInput = {
      birthDate: values.birthDate,
      cpf: values.cpf,
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      phoneNumber: values.phoneNumber,
    };

    await onSubmit(
      mode === 'signup'
        ? {
            ...profileValues,
            password: values.password,
          }
        : profileValues,
    );
  };

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold" htmlFor={`${mode}-firstName`}>
          {t('registration.firstName')}
          <input
            autoComplete="given-name"
            className="h-12 rounded-2xl border border-input bg-background px-4 text-base text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
            id={`${mode}-firstName`}
            onChange={(event) => updateValue('firstName', event.target.value)}
            required
            type="text"
            value={values.firstName}
          />
        </label>

        <label className="grid gap-2 text-sm font-bold" htmlFor={`${mode}-lastName`}>
          {t('registration.lastName')}
          <input
            autoComplete="family-name"
            className="h-12 rounded-2xl border border-input bg-background px-4 text-base text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
            id={`${mode}-lastName`}
            onChange={(event) => updateValue('lastName', event.target.value)}
            required
            type="text"
            value={values.lastName}
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-bold" htmlFor={`${mode}-cpf`}>
        {t('registration.cpf')}
        <input
          autoComplete="off"
          className="h-12 rounded-2xl border border-input bg-background px-4 text-base text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
          id={`${mode}-cpf`}
          inputMode="numeric"
          onChange={(event) => updateValue('cpf', event.target.value)}
          required
          type="text"
          value={values.cpf}
        />
      </label>

      <label className="grid gap-2 text-sm font-bold" htmlFor={`${mode}-birthDate`}>
        {t('registration.birthDate')}
        <input
          autoComplete="bday"
          className="h-12 rounded-2xl border border-input bg-background px-4 text-base text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
          id={`${mode}-birthDate`}
          onChange={(event) => updateValue('birthDate', event.target.value)}
          required
          type="date"
          value={values.birthDate}
        />
      </label>

      <label className="grid gap-2 text-sm font-bold" htmlFor={`${mode}-phoneNumber`}>
        {t('registration.phoneNumber')}
        <input
          autoComplete="tel"
          className="h-12 rounded-2xl border border-input bg-background px-4 text-base text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
          id={`${mode}-phoneNumber`}
          inputMode="tel"
          onChange={(event) => updateValue('phoneNumber', event.target.value)}
          required
          type="tel"
          value={values.phoneNumber}
        />
      </label>

      <label className="grid gap-2 text-sm font-bold" htmlFor={`${mode}-email`}>
        {t('registration.email')}
        <input
          autoComplete="email"
          className="h-12 rounded-2xl border border-input bg-background px-4 text-base text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring disabled:text-muted-foreground"
          disabled={emailReadonly}
          id={`${mode}-email`}
          inputMode="email"
          onChange={(event) => updateValue('email', event.target.value)}
          required
          type="email"
          value={values.email}
        />
      </label>

      {mode === 'signup' ? (
        <label className="grid gap-2 text-sm font-bold" htmlFor={`${mode}-password`}>
          {t('registration.password')}
          <input
            autoComplete="new-password"
            className="h-12 rounded-2xl border border-input bg-background px-4 text-base text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
            id={`${mode}-password`}
            minLength={8}
            onChange={(event) => updateValue('password', event.target.value)}
            required
            type="password"
            value={values.password}
          />
        </label>
      ) : null}

      <Button className="mt-2" disabled={isSubmitting} type="submit">
        {mode === 'signup' ? (
          <UserPlus aria-hidden="true" size={18} />
        ) : (
          <Save aria-hidden="true" size={18} />
        )}
        {submitLabel}
      </Button>
    </form>
  );
}
