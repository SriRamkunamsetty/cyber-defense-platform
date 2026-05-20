export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const isLocalDevClient =
  import.meta.env.VITE_LOCAL_DEV === "true" ||
  import.meta.env.VITE_LOCAL_DEV === "1";

export const getDevLoginUrl = (redirect = "/dashboard") =>
  `/api/dev/login?redirect=${encodeURIComponent(redirect)}`;

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  if (!oauthPortalUrl) {
    return "/login";
  }

  try {
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId || "");
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch (error) {
    console.error("[getLoginUrl] Invalid URL construction:", error);
    return "/login";
  }
};
