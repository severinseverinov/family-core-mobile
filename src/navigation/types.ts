export type RootStackParamList = {
  Auth: undefined;
  Login: undefined;
  SignUp: undefined;
  JoinFamily: undefined;
  Join: { token?: string };
  Main: undefined;
  Dashboard: undefined;
  Settings: undefined;
  Vault: undefined;
  PublicPetProfile: { id: string };
  PublicEmergencyCard: { userId: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  Tasks: undefined;
  Pets: undefined;
  Kitchen: undefined;
};
