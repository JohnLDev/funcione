export type AuthenticatedUser = {
  id: string;
  email: string | null;
  provider: string | null;
};
