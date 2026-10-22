export const isLocalPreview =
  import.meta.env.DEV &&
  (import.meta.env.VITE_LOCAL_PREVIEW === 'true' ||
    !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);