import { useEffect, useState } from 'react';
import { api } from '../utils/api';

export function useParticipant(userId) {
  const [state, setState] = useState({ loading: true, exists: false, participant: null, error: null });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!userId) {
        if (!cancelled) setState({ loading: false, exists: false, participant: null, error: null });
        return;
      }

      try {
        const res = await api.getUser(userId);
        if (cancelled) return;
        setState({
          loading: false,
          exists: Boolean(res?.ok && res?.exists),
          participant: res?.participant || null,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({ loading: false, exists: false, participant: null, error: err });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}
