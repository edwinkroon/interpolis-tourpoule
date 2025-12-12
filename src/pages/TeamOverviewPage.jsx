import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserId } from '../utils/auth0';
import { api } from '../utils/api';

function initialsFromName(teamName) {
  if (!teamName) return 'U';
  return teamName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export function TeamOverviewPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [teamRiders, setTeamRiders] = useState([]);
  const [teamJerseys, setTeamJerseys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mainRiders = useMemo(() => teamRiders.filter((r) => r.slot_type === 'main'), [teamRiders]);
  const reserveRiders = useMemo(() => teamRiders.filter((r) => r.slot_type === 'reserve'), [teamRiders]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const id = await getUserId();
        if (!id) return;
        if (cancelled) return;
        setUserId(id);

        const [userRes, ridersRes, jerseysRes] = await Promise.all([
          api.getUser(id),
          api.getTeamRiders(id),
          api.getTeamJerseys(id),
        ]);

        if (cancelled) return;

        if (userRes?.ok && userRes?.participant) setParticipant(userRes.participant);
        setTeamRiders(ridersRes?.ok && Array.isArray(ridersRes.riders) ? ridersRes.riders : []);
        setTeamJerseys(jerseysRes?.ok && Array.isArray(jerseysRes.jerseys) ? jerseysRes.jerseys : []);

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
          {loading ? <div className="no-data">Bezig met laden...</div> : null}
          {error ? <div className="error-message" style={{ display: 'block' }}>{String(error?.message || error)}</div> : null}
        </div>

        {/* Team info */}
        <div className="col-12 team-card">
          <div className="team-info-header">
            <div className="team-avatar-container">
              {participant?.avatar_url ? (
                <img src={participant.avatar_url} alt="Avatar" className="team-avatar-img" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <div className="team-avatar-placeholder">{initialsFromName(participant?.team_name)}</div>
              )}
            </div>
            <div className="team-info-content">
              <div className="team-info-top">
                <h2 className="team-name">{participant?.team_name || 'Team'}</h2>
              </div>
              <div className="team-info-details">
                <div className="team-detail-item">
                  <div className="team-detail-label">Email</div>
                  <div className="team-detail-value">{participant?.email || '-'}</div>
                </div>
                <div className="team-detail-item">
                  <div className="team-detail-label">Notificaties</div>
                  <div className="team-detail-value">{participant?.newsletter ? 'Aan' : 'Uit'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="team-card-actions">
            <button className="team-compare-button" type="button" onClick={() => navigate('/teamvergelijken.html')}>
              <span>Vergelijk teams</span>
              <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Riders */}
        <div className="col-12 team-card">
          <div className="team-card-header">
            <h2 className="team-card-title">Basisrenners ({mainRiders.length})</h2>
          </div>
          <div className="riders-list-container" id="main-riders-list-container">
            {mainRiders.length === 0 ? <div className="no-riders-message" id="no-main-riders-message">Nog geen basisrenners</div> : null}
            {mainRiders.map((r) => (
              <div key={r.id} className="team-rider-item">
                <div className="rider-avatar">
                  <img src={r.photo_url || ''} alt={`${r.first_name || ''} ${r.last_name || ''}`.trim()} className="rider-photo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <div className="rider-avatar-placeholder" style={{ display: r.photo_url ? 'none' : 'block' }}>
                    {`${(r.first_name || 'R')[0]}${(r.last_name || 'R')[0]}`.toUpperCase()}
                  </div>
                </div>
                <div className="rider-info">
                  <div className="rider-name">{`${r.first_name || ''} ${r.last_name || ''}`.trim()}</div>
                  <div className="rider-team">{r.team_name || ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-12 team-card">
          <div className="team-card-header">
            <h2 className="team-card-title">Reserverenners ({reserveRiders.length})</h2>
          </div>
          <div className="riders-list-container" id="reserve-riders-list-container">
            {reserveRiders.length === 0 ? <div className="no-riders-message" id="no-reserve-riders-message">Nog geen reserverenners</div> : null}
            {reserveRiders.map((r) => (
              <div key={r.id} className="team-rider-item">
                <div className="rider-avatar">
                  <img src={r.photo_url || ''} alt={`${r.first_name || ''} ${r.last_name || ''}`.trim()} className="rider-photo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <div className="rider-avatar-placeholder" style={{ display: r.photo_url ? 'none' : 'block' }}>
                    {`${(r.first_name || 'R')[0]}${(r.last_name || 'R')[0]}`.toUpperCase()}
                  </div>
                </div>
                <div className="rider-info">
                  <div className="rider-name">{`${r.first_name || ''} ${r.last_name || ''}`.trim()}</div>
                  <div className="rider-team">{r.team_name || ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Jerseys */}
        <div className="col-12 team-card">
          <div className="team-card-header">
            <h2 className="team-card-title">Truien</h2>
          </div>
          <div className="riders-list-container" id="jerseys-list-container">
            {teamJerseys.length === 0 ? <div className="no-jerseys-message" id="no-jerseys-message"><p>Geen truien gevonden</p></div> : null}
            {teamJerseys.map((j) => (
              <div key={j.id} className="team-rider-item">
                <div className="rider-avatar">
                  {j.assigned?.photo_url ? (
                    <img src={j.assigned.photo_url} alt="" className="rider-photo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <div className="rider-avatar-placeholder" style={{ display: 'block', background: '#f0f3f5', color: '#668494' }}>
                      —
                    </div>
                  )}
                </div>
                <div className="rider-info">
                  <div className="rider-name">
                    {j.assigned ? `${j.assigned.first_name || ''} ${j.assigned.last_name || ''}`.trim() : 'Niet toegewezen'}
                  </div>
                  <div className="rider-team">{j.assigned?.team_name || (j.assigned ? '' : 'Selecteer een renner')}</div>
                </div>
                <div className="jersey-icon" title={j.name || j.type}>
                  <img
                    src={
                      j.type === 'geel'
                        ? '/icons/Truien/geletrui.svg'
                        : j.type === 'groen'
                        ? '/icons/Truien/groenetrui.svg'
                        : j.type === 'bolletjes'
                        ? '/icons/Truien/bolletjestrui.svg'
                        : j.type === 'wit'
                        ? '/icons/Truien/wittetrui.svg'
                        : '/icons/Truien/geletrui.svg'
                    }
                    alt={j.name || j.type}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-12" style={{ marginTop: '1rem' }}>
          <a href="/logout.html">Uitloggen</a>
        </div>
      </div>
    </main>
  );
}
