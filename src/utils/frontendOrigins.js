/** Allow known frontend origins and explicitly configured Cloudflare preview domains. */
export function createFrontendOriginHandler(allowedOrigins, previewDomains = process.env.CORS_PREVIEW_DOMAINS || '') {
  const exactOrigins = new Set(allowedOrigins.map((origin) => origin?.trim()).filter(Boolean));
  const domains = previewDomains.split(',').map((domain) => domain.trim().toLowerCase()).filter(Boolean);

  return (origin, callback) => {
    if (!origin || exactOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    try {
      const url = new URL(origin);
      const isPreview = url.protocol === 'https:' && !url.port && url.origin === origin && domains.some((domain) => {
        const suffix = `.${domain}`;
        if (!url.hostname.endsWith(suffix)) return false;
        const label = url.hostname.slice(0, -suffix.length);
        return /^pre-[1-9]\d*$/.test(label) || /^branch-[a-z0-9-]+-[a-f0-9]{8}$/.test(label);
      });
      if (isPreview) {
        callback(null, true);
        return;
      }
    } catch {
      // Malformed origins are rejected below, just like other unknown origins.
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  };
}
