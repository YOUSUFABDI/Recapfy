import packageJson from "./package.json";

export type ConfigValue = {
  appName: string;
  appVersion: string;
  serverUrl: string;
  supportEmail: string;
};

export const CONFIG: ConfigValue = {
  appName: "Recapfy",
  serverUrl: "http://localhost:3000/api",
  appVersion: packageJson.version,
  supportEmail: "info@recapfy.com",
};
