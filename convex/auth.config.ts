const authConfig = {
  providers: [
    {
      // Using the Issuer URL directly is more reliable for Clerk + Convex
      domain: process.env.CLERK_ISSUER_URL || process.env.CLERK_FRONTEND_API_URL,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
