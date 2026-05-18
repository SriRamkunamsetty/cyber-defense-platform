import { ENV } from "./env";

export function useGcsStorage(): boolean {
  return Boolean(ENV.gcsBucket);
}

export function useCloudTasks(): boolean {
  return Boolean(
    ENV.gcpProjectId &&
      ENV.gcpTasksQueue &&
      ENV.workerUrl &&
      ENV.workerSecret
  );
}

export function useRedisPubSub(): boolean {
  return Boolean(ENV.redisUrl);
}

export function isProductionDeployment(): boolean {
  return ENV.isProduction && !ENV.localDev;
}
