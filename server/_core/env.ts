export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  localDev:
    process.env.LOCAL_DEV === "true" || process.env.LOCAL_DEV === "1",
  port: parseInt(process.env.PORT || "3000", 10),

  // Google Cloud (Track A/B)
  gcsBucket: process.env.GCS_BUCKET ?? "",
  gcpProjectId: process.env.GCP_PROJECT_ID ?? "",
  gcpLocation: process.env.GCP_LOCATION ?? "asia-south1",
  gcpTasksQueue: process.env.GCP_TASKS_QUEUE ?? "trinetra-investigations",
  workerUrl: process.env.WORKER_URL ?? "",
  forensicsWorkerUrl: process.env.FORENSICS_WORKER_URL ?? "",
  aiWorkerUrl: process.env.AI_WORKER_URL ?? "",
  workerSecret: process.env.WORKER_SECRET ?? "",
  workerRole: process.env.WORKER_ROLE ?? "all",
  redisUrl: process.env.REDIS_URL ?? "",

  // Vertex AI (optional — Track C)
  vertexProjectId: process.env.VERTEX_PROJECT_ID ?? process.env.GCP_PROJECT_ID ?? "",
  vertexLocation: process.env.VERTEX_LOCATION ?? "asia-south1",
  useVertexAi: process.env.USE_VERTEX_AI === "true" || process.env.USE_VERTEX_AI === "1",

  // Firebase Auth
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "iithyderabad-apk",

  // Government / enterprise
  deploymentRegion: process.env.DEPLOYMENT_REGION ?? "asia-south1",
  orgName: process.env.ORG_NAME ?? "TRINETRA AI",
  requireApiKey: process.env.REQUIRE_LLM_KEY === "true",
};
