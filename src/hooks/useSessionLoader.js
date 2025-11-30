import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useSession } from './useSession';

export const useSessionLoader = () => {
  const { authToken } = useAuth();
  const { loadSessions } = useSession();

  useEffect(() => {
    if (authToken) {
      loadSessions(authToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  return null; // This hook manages side effects only
};
