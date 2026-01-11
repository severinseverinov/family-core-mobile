import { MD3Theme } from "react-native-paper";

interface MyColors {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

export interface Theme extends MD3Theme {
  myColors: MyColors;
}
