export interface FireAuthState<P = any> {
  uid: string;
  emailVerified: boolean;
  profile: P;
  loading: boolean;
  [key: string]: any;
}

export interface RoleState<R = Record<string, any>> {
  roles: R;
}

export const initialAuthState: FireAuthState = {
  uid: null,
  emailVerified: undefined,
  profile: null,
  loading: false,
};
