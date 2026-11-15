import React, { useEffect, useRef, useState } from 'react';
import { googleOAuthLogin, API_BASE_URL } from '../utils/api';
import { toast } from 'react-toastify';

/**
 * GoogleOAuthButton
 *
 * Implements Google Identity Services (GIS) OAuth 2.1 / OIDC button
 * with automatic fallback to standard OAuth 2.0 redirect flow.
 */
export default function GoogleOAuthButton({ onSuccess, onError }) {
  const buttonRef = useRef(null);
  const [gisLoaded, setGisLoaded] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    // Check if Google script is already loaded
    if (window.google?.accounts?.id) {
      setGisLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGisLoaded(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!gisLoaded || !buttonRef.current || !clientId) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'filled_blue',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 384,
      });
    } catch (err) {
      console.error('Failed to render Google button:', err);
    }
  }, [gisLoaded, clientId]);

  const handleCredentialResponse = async (response) => {
    try {
      if (!response.credential) {
        throw new Error('No credential received from Google');
      }
      toast.info('Authenticating with Google...');
      const data = await googleOAuthLogin(response.credential);
      toast.success('Signed in with Google!');
      if (onSuccess) onSuccess(data);
    } catch (err) {
      console.error('Google sign-in failed:', err);
      toast.error(err.message || 'Google sign-in failed');
      if (onError) onError(err);
    }
  };

  const handleManualClick = () => {
    // If GIS button is not rendered or user clicks custom button,
    // seamlessly trigger the OAuth redirect flow via backend
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* If Google rendered button is available, display it */}
      {clientId ? (
        <div ref={buttonRef} className="w-full flex justify-center" />
      ) : (
        <button
          type="button"
          onClick={handleManualClick}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-gray-800 font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition duration-300 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          Continue with Google
        </button>
      )}
    </div>
  );
}
