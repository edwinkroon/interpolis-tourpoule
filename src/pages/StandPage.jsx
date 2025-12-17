import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { PageTemplate } from '../layouts/PageTemplate';
import { Tile } from '../components/Tile';
import { ListItem } from '../components/ListItem';

export function StandPage() {
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
    <PageTemplate
      title="Stand"
      backLink="/home.html"
      sidebar={
        <a
          href="/logout.html"
          className="action-button"
          style={{ textDecoration: 'none', color: 'inherit' }}
          aria-label="Uitloggen"
        >
          <span>Uitloggen</span>
          <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
        </a>
      }
    >
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
            {standings.map((team) => {
              // positionChange kan number, null, of undefined zijn
              // null/undefined = geen vorige data, number (inclusief 0) = wel data
              // ListItem toont alleen positionChange als het niet null/undefined is
              // Voor 0 (geen wijziging) moeten we null doorgeven zodat het niet wordt getoond
              const hasPositionChange = team.positionChange !== undefined && team.positionChange !== null;
              const positionChange = hasPositionChange ? Number(team.positionChange) : null;
              // Als positionChange 0 is, geef null door zodat het niet wordt getoond
              const positionChangeForListItem = positionChange !== null && positionChange !== 0 ? positionChange : null;
              
              return (
                <ListItem
                  key={team.participantId || team.rank}
                  leftValue={team.rank}
                  title={team.teamName}
                  value={team.totalPoints}
                  positionChange={positionChangeForListItem}
                />
              );
            })}
          </div>
        </Tile>
      </div>
    </PageTemplate>
  );
}
