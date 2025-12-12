import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export function StandPage() {
  const navigate = useNavigate();
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getStandings();
        if (cancelled) return;
        setStandings(res?.ok && Array.isArray(res.standings) ? res.standings : []);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="main-content page">
      <div className="grid">
        <div className="col-12">
          <a className="back-link" href="#" onClick={(e) => { e.preventDefault(); navigate('/home.html'); }}>
            <img src="/assets/arrow.svg" alt="" className="back-arrow" aria-hidden="true" />
            terug
          </a>
        </div>

        <div className="col-12 standings-full-section">
          <h2 className="dashboard-section-title">Stand</h2>

          {loading ? <div className="no-data">Bezig met laden...</div> : null}
          {error ? <div className="error-message" style={{ display: 'block' }}>{String(error?.message || error)}</div> : null}

          <div className="standings-full-list" id="standings-full-list">
            {!loading && standings.length === 0 ? <div className="no-data">Nog geen stand beschikbaar</div> : null}
            {standings.map((team) => (
              <div key={team.participantId || team.rank} className="standing-item">
                <div className="standing-rank">{team.rank}</div>
                <div className="standing-name">{team.teamName}</div>
                <div className="standing-points">{team.totalPoints}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
