import path from "path";
import { ENV } from "./env";

export function isLocalDev(): boolean {
  return ENV.localDev;
}

export const LOCAL_STORAGE_DIR = path.resolve(
  process.cwd(),
  process.env.LOCAL_STORAGE_DIR || ".local-storage"
);

export const DEV_USER_OPEN_ID = "local-dev-user";
export const DEV_USER_NAME = "Local SOC Analyst";
