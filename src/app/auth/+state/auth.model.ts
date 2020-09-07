export interface Profile {
  displayName: string;
  photoURL: string;
  organizationIds: string[];
  email: string;
}

export function createProfile(profile: Partial<Profile>): Profile {
  return {
    displayName: '',
    photoURL: '',
    organizationIds: [],
    email: '',
    ...profile
  };
}
