import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Tile } from '../components/Tile';
import { ListItem } from '../components/ListItem';

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

        <div className="col-12">
          <Tile
            className="standings-full-section"
            title="Stand"
            info={{
              title: 'Stand',
              text: 'Dit is de volledige stand: alle teams gerangschikt op totale punten.',
            }}
          >
            {loading ? <div className="no-data">Bezig met laden...</div> : null}
            {error ? (
              <div className="error-message" style={{ display: 'block' }}>
                {String(error?.message || error)}
              </div>
            ) : null}

            <div className="standings-full-list tile-list" id="standings-full-list">
              {!loading && standings.length === 0 ? <div className="no-data">Nog geen stand beschikbaar</div> : null}
              {standings.map((team) => (
                <ListItem
                  key={team.participantId || team.rank}
                  leftValue={team.rank}
                  title={team.teamName}
                  value={team.totalPoints}
                  positionChange={team.positionChange}
                />
              ))}
            </div>
          </Tile>
        </div>
      </div>
    </main>
  );
}
