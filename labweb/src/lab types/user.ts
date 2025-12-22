
export type UserRole = "lab-technician" | "receptionist" | "researcher";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  lastLogin?: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
