import { apiPost, apiGet, ApiError } from './api';
import type { User } from '../types';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080';

interface BackendUser {
  id: number;
  name: string;
  email: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

interface AuthData {
  token: string;
  user: BackendUser;
}

export interface AuthResult {
  token: string;
  user: User;
}

function toUser(bu: BackendUser): User {
  return { id: bu.id, name: bu.name, email: bu.email, provider: bu.provider ?? 'local' };
}

function translateError(err: unknown): never {
  if (err instanceof ApiError) {
    const msg = err.message.toLowerCase();
    if (msg.includes('email already in use')) throw new ApiError('Este email já está em uso.', err.status);
    if (msg.includes('invalid email or password')) throw new ApiError('Email ou senha incorretos.', err.status);
    if (msg.includes('user not found')) throw new ApiError('Usuário não encontrado.', err.status);
    if (msg.includes('uses email/password')) throw new ApiError('Esta conta usa email e senha. Faça login com sua senha.', err.status);
  }
  throw err;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const data = await apiPost<AuthData>('/api/v1/auth/login', { email, password });
    return { token: data.token, user: toUser(data.user) };
  } catch (err) {
    translateError(err);
  }
}

export async function register(name: string, email: string, password: string): Promise<AuthResult> {
  try {
    const data = await apiPost<AuthData>('/api/v1/auth/register', { name, email, password });
    return { token: data.token, user: toUser(data.user) };
  } catch (err) {
    translateError(err);
  }
}

export async function getProfile(token: string): Promise<User> {
  try {
    const user = await apiGet<BackendUser>('/api/v1/profile', token);
    return toUser(user);
  } catch (err) {
    translateError(err);
  }
}

// Redirects the browser to the backend Google OAuth flow.
export function initGoogleLogin(): void {
  window.location.href = `${API_URL}/api/v1/auth/google`;
}

// ---- Token persistence ----
const TOKEN_KEY = 'funcione_token';

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function loadToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
