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

export interface IAuthRepository {
  findOrganizationByEmail(email: string): Promise<{ id: string; password_hash: string } | null>;
}