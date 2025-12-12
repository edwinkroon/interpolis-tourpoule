import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserId } from '../utils/auth0';
import { api } from '../utils/api';

export function HomePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [points, setPoints] = useState({ totalPoints: 0, riders: [], route: '' });
  const [standings, setStandings] = useState([]);
  const [prikbord, setPrikbord] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const top5 = useMemo(() => standings.slice(0, 5), [standings]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const id = await getUserId();
        if (!id) return;
        if (cancelled) return;
        setUserId(id);

        const [userRes, pointsRes, standingsRes, prikbordRes] = await Promise.all([
          api.getUser(id),
          api.getMyPointsRiders(id),
          api.getStandings(),
          api.getPrikbordMessages(),
        ]);

        if (cancelled) return;

        if (userRes?.ok && userRes?.participant) setParticipant(userRes.participant);
        if (pointsRes?.ok) {
          setPoints({
            totalPoints: pointsRes.totalPoints || 0,
            riders: pointsRes.riders || [],
            route: pointsRes.route || '',
          });
        }
        if (standingsRes?.ok && Array.isArray(standingsRes.standings)) setStandings(standingsRes.standings);
        if (prikbordRes?.ok && Array.isArray(prikbordRes.messages)) setPrikbord(prikbordRes.messages);

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

  if (loading) {
    return <div className="page" style={{ padding: '2rem 1rem' }}>Bezig met laden...</div>;
  }

  return (
    <>
      <div id="build-info" className="build-info" />

      <header className="header">
        <div className="header-content page">
          <div className="grid">
            <div className="col-12">
              <div className="header-title">Interpolis tourspel</div>
            </div>
            <div className="col-12">
              <div className="header-welcome-section">
                <div className="header-user-info">
                  <div className="header-avatar-container" style={{ display: participant?.avatar_url ? 'block' : 'none' }}>
                    {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                    <img
                      src={participant?.avatar_url || ''}
                      alt="Avatar"
                      className="header-avatar-img"
                      onError={(e) => {
                        e.currentTarget.parentElement.style.display = 'none';
                      }}
                    />
                  </div>
                  <h1 className="welcome-heading" id="welcome-heading">
                    {participant?.team_name || 'Welkom'}
                  </h1>
                </div>
                <div className="header-illustration">
                  <img src="/assets/headerillustration.svg" alt="Fiets illustratie" className="illustration-svg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content page">
        <div className="grid">
          <div className="action-buttons col-3">
            <button className="action-button" type="button" onClick={() => navigate('/rules.html')} aria-label="Bekijk spelregels">
              <span>Spelregels</span>
              <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
            </button>
            <button className="action-button" type="button" onClick={() => navigate('/statistieken.html')} aria-label="Bekijk statistieken">
              <span>Statistieken</span>
              <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
            </button>
            <button className="action-button" type="button" onClick={() => navigate('/etappetoevoegen.html')} aria-label="Etappe toevoegen">
              <span>Etappe toevoegen</span>
              <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
            </button>
          </div>

          <div className="dashboard-content col-9">
            {error ? (
              <div className="error-message" style={{ display: 'block' }}>
                {String(error?.message || error)}
              </div>
            ) : null}

            <div className="dashboard-grid">
              <div className="dashboard-column">
                <div className="dashboard-section points-section">
                  <div className="team-card-header">
                    <h2 className="dashboard-section-title">
                      Mijn punten <span className="points-value">({points.totalPoints || 0})</span>
                    </h2>
                  </div>

                  <div className="points-riders-list">
                    {points.riders.length === 0 ? <div className="no-data">Geen punten beschikbaar</div> : null}
                    {points.riders.map((r) => (
                      <div key={r.id || r.name} className="points-rider-item">
                        {r.photoUrl ? (
                          <img src={r.photoUrl} alt={r.name} className="points-rider-avatar-img" />
                        ) : (
                          <div className="points-rider-avatar" />
                        )}
                        <div className="points-rider-info">
                          <div className="points-rider-name">{r.name}</div>
                          {r.route || points.route ? <div className="points-rider-route">{r.route || points.route}</div> : null}
                        </div>
                        <div className="points-rider-points">{r.points || 0}</div>
                      </div>
                    ))}
                  </div>

                  <button className="points-team-button" type="button" onClick={() => navigate('/teamoverzicht.html')} aria-label="Bekijk mijn team">
                    <span>mijn team</span>
                    <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="dashboard-column">
                <div className="dashboard-section standings-section">
                  <div className="team-card-header">
                    <h2 className="dashboard-section-title">Stand</h2>
                  </div>

                  <div className="standings-list">
                    {top5.length === 0 ? <div className="no-data">Nog geen stand beschikbaar</div> : null}
                    {top5.map((t) => (
                      <div key={t.participantId || t.rank} className="standing-item">
                        <div className="standing-rank">{t.rank}</div>
                        <div className="standing-name">{t.teamName}</div>
                        <div className="standing-points">{t.totalPoints}</div>
                      </div>
                    ))}
                  </div>

                  <button className="standings-button" type="button" onClick={() => navigate('/stand.html')} aria-label="Bekijk volledige stand">
                    <span>volledige stand</span>
                    <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                  </button>
                </div>

                <div className="dashboard-section prikbord-section">
                  <h2 className="dashboard-section-title">Prikbord</h2>
                  <div className="prikbord-list">
                    {prikbord.length === 0 ? <div className="no-data">Geen berichten</div> : null}
                    {prikbord.slice(0, 5).map((m) => (
                      <div key={m.id} className="prikbord-item">
                        <div className="prikbord-message">{m.message}</div>
                        <div className="prikbord-meta">
                          <span className="prikbord-author">{m.author}</span>
                          <span className="prikbord-date">
                            {m.date} {m.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="prikbord-button"
                    type="button"
                    onClick={async () => {
                      if (!userId) return;
                      const message = window.prompt('Plaats een opmerking (max 1000 tekens):');
                      if (!message) return;
                      const trimmed = message.trim();
                      if (!trimmed) return;
                      try {
                        await api.postPrikbordMessage({ userId, message: trimmed });
                        const refreshed = await api.getPrikbordMessages();
                        if (refreshed?.ok && Array.isArray(refreshed.messages)) setPrikbord(refreshed.messages);
                      } catch (e) {
                        alert('Fout bij plaatsen van bericht.');
                      }
                    }}
                    aria-label="Plaats prikbord bericht"
                  >
                    <span>prikbord</span>
                    <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
