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

const profileNameMaxLength = 80;

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function limitProfileName(value: string) {
  return value.slice(0, profileNameMaxLength);
}

function formatCpfInput(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function formatBrazilianPhoneInput(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return digits.replace(/^(\d{2})(\d+)/, '($1) $2');
  }

  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
  }

  return digits.replace(/^(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
}

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
    firstName: limitProfileName(initialValues?.firstName ?? emptyProfile.firstName),
    lastName: limitProfileName(initialValues?.lastName ?? emptyProfile.lastName),
    cpf: formatCpfInput(initialValues?.cpf ?? emptyProfile.cpf),
    phoneNumber: formatBrazilianPhoneInput(
      initialValues?.phoneNumber ?? emptyProfile.phoneNumber,
    ),
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
      cpf: onlyDigits(values.cpf),
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      phoneNumber: onlyDigits(values.phoneNumber),
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
            maxLength={profileNameMaxLength}
            onChange={(event) =>
              updateValue('firstName', limitProfileName(event.target.value))
            }
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
            maxLength={profileNameMaxLength}
            onChange={(event) =>
              updateValue('lastName', limitProfileName(event.target.value))
            }
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
          onChange={(event) =>
            updateValue('cpf', formatCpfInput(event.target.value))
          }
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
        <div className="flex h-12 items-center rounded-2xl border border-input bg-background text-base text-foreground transition-shadow focus-within:ring-2 focus-within:ring-ring">
          <div className="flex h-full shrink-0 items-center gap-2 border-r border-border px-3">
            <span
              aria-label={t('registration.brazilFlag')}
              className="relative block h-4 w-6 shrink-0 overflow-hidden rounded-[3px] bg-[#009b3a]"
              role="img"
            >
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#ffdf00]"
              />
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#002776]"
              />
            </span>
            <span className="text-sm font-black text-foreground">+55</span>
          </div>
          <input
            autoComplete="tel-national"
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-base text-foreground outline-none"
            id={`${mode}-phoneNumber`}
            inputMode="tel"
            onChange={(event) =>
              updateValue(
                'phoneNumber',
                formatBrazilianPhoneInput(event.target.value),
              )
            }
            required
            type="tel"
            value={values.phoneNumber}
          />
        </div>
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
