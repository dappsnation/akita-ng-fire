export interface FireAuthState<P = any> {
  uid: string;
  profile: P;
  loading: boolean;
  [key: string]: any;
}

export interface RoleState<R = Record<string, any>> {
  roles: R;
}

export const initialAuthState: FireAuthState = {
  uid: null,
  profile: null,
  loading: false
};
