export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  organization_id: string;
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  organization_id: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  organization_id: number;
  created_at: Date;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
  organization_id: number;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: 'user' | 'admin';
}

export interface IAuthRepository {
  findOrganizationByEmail(email: string): Promise<{ id: string; password_hash: string } | null>;
  findUserByEmail(email: string): Promise<User | null>;
  createUser(user: CreateUserRequest): Promise<User>;
  updateUser(id: number, updates: UpdateUserRequest): Promise<User | null>;
  deleteUser(id: number): Promise<boolean>;
}