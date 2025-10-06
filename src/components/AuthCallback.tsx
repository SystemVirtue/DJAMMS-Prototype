import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppwrite } from '../contexts/AppwriteContext';

const AuthCallback: React.FC = () => {
  const { account } = useAppwrite();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const userId = searchParams.get('userId');
        const secret = searchParams.get('secret');

        if (!userId || !secret) {
          throw new Error('Missing authentication parameters');
        }

        await account.updateMagicURLSession(userId, secret);
        navigate('/admin');
      } catch (error) {
        console.error('Auth callback error:', error);
        alert('Authentication failed. Please try again.');
        navigate('/admin');
      }
    };

    handleAuth();
  }, [account, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl mb-4">Authenticating...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
};

export default AuthCallback;