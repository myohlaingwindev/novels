export type Role = "user" | "author" | "admin";

export type PublicUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: number;
};

export type FormState = { error: string } | null;
