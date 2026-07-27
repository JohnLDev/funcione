# Frontend Error Feedback Design

## Objective

Create a consistent error feedback strategy for Funcione so expected errors shown in the frontend are mapped, translated, and presented through an animated sport-themed toast instead of raw provider/API messages.

## Decisions

- Every frontend-visible error must pass through a normalization layer before it reaches UI copy.
- Components must not render raw `error.message`, Supabase messages, backend technical messages, stack traces, or provider text directly.
- Expected errors are mapped by stable `code` first, then by known external-message patterns only when a provider does not expose stable codes.
- Unknown errors use a safe translated fallback and may keep technical text only as internal/debug data.
- The backend/API error envelope should converge to a common shape:

```ts
type AppErrorResponse = {
  error: {
    code: string;
    message: string;
    userMessageKey?: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
};
```

- Frontend gateways may keep technical `message` for diagnostics, but UI consumers must use a normalized frontend error:

```ts
type NormalizedAppError = {
  key: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  source: 'auth' | 'registration' | 'training' | 'network' | 'unknown';
  code?: string;
  debugMessage?: string;
};
```

## Toast UX

- Add a global toast provider under the root app providers.
- Toasts appear fixed near the top on mobile and top-right on wider screens.
- Error toasts use Funcione dark/blue styling with a small animated sport ball indicator.
- Toasts are accessible with `role="status"` and `aria-live="polite"`.
- Toasts auto-dismiss after a short delay and include a close button.
- Keep inline banners only where the screen needs contextual recovery actions, such as the training retry action. Banner copy must also use mapped i18n messages.

## Initial Error Catalog

Auth:

- `AUTH_INVALID_CREDENTIALS` -> invalid email or password.
- `AUTH_SESSION_EXPIRED`, `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_MISSING` -> session expired.
- `AUTH_SUPABASE_NOT_CONFIGURED` -> authentication setup unavailable.
- `AUTH_EMAIL_CONFIRMATION_REQUIRED` -> confirm account email.
- `AUTH_SIGN_OUT_FAILED` -> could not sign out.

Registration:

- `REGISTRATION_PROFILE_REQUEST_FAILED` -> could not load/save registration.
- `REGISTRATION_PROFILE_INVALID_PAYLOAD` -> registration data could not be accepted.
- `REGISTRATION_PROFILE_AUTH_REQUIRED` -> sign in again to complete registration.

Training:

- `TRAINING_PLAN_REQUEST_FAILED` -> could not update training plan.
- `TRAINING_GENERATION_FAILED` -> workout generation failed.
- `TRAINING_MONTHLY_PLAN_ALREADY_ACTIVE` -> monthly plan already active.
- `TRAINING_GENERATION_UNAVAILABLE` -> generation status not available.

Common:

- `NETWORK_REQUEST_FAILED` -> connection unavailable.
- `COMMON_UNEXPECTED` -> unexpected safe fallback.

## Agent Guideline

Update `AGENTS.md` so future development follows this rule:

- Every error exposed in frontend UI must be mapped and translated before display.
- New API/frontend error paths require i18n keys and automated tests proving raw external messages are not rendered.
- REST APIs should use the common `error` envelope with stable `code`, technical `message`, optional `userMessageKey`, optional safe `details`, and optional `requestId`.

## Testing

- Add E2E coverage for invalid login credentials showing translated toast and not showing the raw Supabase text.
- Add E2E coverage for training errors showing the translated toast while preserving retry behavior.
- Add E2E coverage for responsive toast placement without horizontal overflow in a mobile viewport.
- Run frontend typecheck, targeted E2E, full E2E, and build before completion.
