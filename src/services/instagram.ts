const INSTAGRAM_APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID;
const REDIRECT_URI = `${window.location.origin}/auth/instagram/callback`;

export const initiateInstagramAuth = () => {
  if (!INSTAGRAM_APP_ID) {
    console.warn('VITE_INSTAGRAM_APP_ID not configured');
    return;
  }
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=user_profile,user_media&response_type=code`;
  window.location.href = authUrl;
};
