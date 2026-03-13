"use client";

import { ReactNode, useEffect } from "react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://cheerful-robin-406.eu-west-1.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

function AuthDebug() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      getToken({ template: "convex" })
        .then((token) => {
          if (token) {
            console.log("✅ Clerk JWT for Convex obtained.");
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              console.log("🎫 JWT Claims:", {
                iss: payload.iss,
                aud: payload.aud,
                sub: payload.sub
              });
              console.log("💡 Check your convex/auth.config.ts. The 'domain' must match the 'iss' above EXACTLY.");
            } catch (e) {
              console.error("❌ Failed to parse JWT payload:", e);
            }
          } else {
            console.error("❌ Clerk returned NULL for 'convex' token. ACTION: Go to Clerk Dashboard -> JWT Templates -> Create a 'convex' template.");
          }
        })
        .catch((err) => {
          console.error("❌ Error fetching Clerk JWT for Convex:", err);
        });
    }
  }, [isLoaded, isSignedIn, getToken]);

  return null;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <AuthDebug />
      {children}
    </ConvexProviderWithClerk>
  );
}
