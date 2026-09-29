import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getNoorConnectorStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const enabled = process.env["NOOR_CONNECTOR_ENABLED"] === "true";
    const hasClientId = Boolean(process.env["NOOR_CLIENT_ID"]);
    const hasClientSecret = Boolean(process.env["NOOR_CLIENT_SECRET"]);
    const hasRedirectUri = Boolean(process.env["NOOR_REDIRECT_URI"]);

    const configured =
      enabled && hasClientId && hasClientSecret && hasRedirectUri;

    return {
      enabled,
      configured,
      canRead: configured && process.env["NOOR_ALLOW_READ"] === "true",
      canWrite: configured && process.env["NOOR_ALLOW_WRITE"] === "true",
      missing: [
        ...(!hasClientId ? ["NOOR_CLIENT_ID"] : []),
        ...(!hasClientSecret ? ["NOOR_CLIENT_SECRET"] : []),
        ...(!hasRedirectUri ? ["NOOR_REDIRECT_URI"] : []),
      ],
    };
  });
