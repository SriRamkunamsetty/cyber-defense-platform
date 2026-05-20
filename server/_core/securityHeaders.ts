import type { Express, Request, Response, NextFunction } from "express";

export function registerSecurityHeaders(app: Express): void {
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");
    
    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "DENY");
    
    // Enable XSS protection filter in older browsers
    res.setHeader("X-XSS-Protection", "1; mode=block");
    
    // Strict Transport Security (HTTPS only)
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
    
    // Control referrer information sent
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    
    // Restrict browser features
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), interest-cohort=()"
    );
    
    // Content Security Policy
    // In production, configure to allow only trust domains. Let's set a relaxed but secure base.
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://lh3.googleusercontent.com; connect-src 'self' https://securetoken.google.com https://identitytoolkit.googleapis.com https://*.googleapis.com wss://*;"
    );

    next();
  });
}
