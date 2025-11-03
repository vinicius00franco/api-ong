export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  organizationId: string;
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  organizationId: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  organizationId: number;
  createdAt: Date;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
  organizationId: number;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: 'user' | 'admin';
}

export interface IAuthRepository {
  findOrganizationByEmail(email: string): Promise<{ id: string; passwordHash: string } | null>;
  findUserByEmail(email: string): Promise<User | null>;
  createUser(user: CreateUserRequest): Promise<User>;
  updateUser(id: number, updates: UpdateUserRequest): Promise<User | null>;
  deleteUser(id: number): Promise<boolean>;
}