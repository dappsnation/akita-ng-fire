export interface Profile {
  displayName: string;
  photoURL: string;
  organizationIds: string[];
}

export function createProfile(profile: Partial<Profile>): Profile {
  console.log({profile});
  return {
    displayName: '',
    photoURL: '',
    organizationIds: [],
    ...profile
  };
}
