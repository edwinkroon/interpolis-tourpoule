import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserId } from '../utils/auth0';
import { api } from '../utils/api';
import { PageTemplate } from '../layouts/PageTemplate';
import { Tile } from '../components/Tile';
import { ListItem } from '../components/ListItem';

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

  if (loading) {
    return (
      <PageTemplate title="Team overzicht" backLink="/home.html">
        <div className="no-data">Bezig met laden...</div>
      </PageTemplate>
    );
  }

  if (error) {
    return (
      <PageTemplate title="Team overzicht" backLink="/home.html">
        <div className="error-message" style={{ display: 'block' }}>
          {String(error?.message || error)}
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="Team overzicht"
      backLink="/home.html"
      sidebar={
        <>
          <button
            className="action-button"
            type="button"
            onClick={() => navigate('/rules.html')}
            aria-label="Bekijk spelregels"
          >
            <span>Spelregels</span>
            <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
          </button>
          <button
            className="action-button"
            type="button"
            onClick={() => navigate('/statistieken.html')}
            aria-label="Bekijk statistieken"
          >
            <span>Statistieken</span>
            <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
          </button>
        </>
      }
    >
      <div className="grid">

        {/* Team info */}
        <div className="col-12">
          <Tile
            title={participant?.team_name || 'Team'}
            actions={
              <button className="team-compare-button" type="button" onClick={() => navigate('/teamvergelijken.html')}>
                <span>Vergelijk teams</span>
                <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
              </button>
            }
          >
            <div className="team-info-header">
              <div className="team-avatar-container">
                {participant?.avatar_url ? (
                  <img src={participant.avatar_url} alt="Avatar" className="team-avatar-img" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="team-avatar-placeholder">{initialsFromName(participant?.team_name)}</div>
                )}
              </div>
              <div className="team-info-content">
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
          </Tile>
        </div>

        {/* Riders */}
        <div className="col-12">
          <Tile
            title={`Basisrenners (${mainRiders.length})`}
            contentClassName="riders-list-container"
          >
            <div className="tile-list" id="main-riders-list-container">
              {mainRiders.length === 0 ? <div className="no-riders-message" id="no-main-riders-message">Nog geen basisrenners</div> : null}
              {mainRiders.map((r) => (
                <ListItem
                  key={r.id}
                  avatarPhotoUrl={r.photo_url}
                  avatarAlt={`${r.first_name || ''} ${r.last_name || ''}`.trim()}
                  avatarInitials={`${(r.first_name || 'R')[0]}${(r.last_name || 'R')[0]}`.toUpperCase()}
                  title={`${r.first_name || ''} ${r.last_name || ''}`.trim()}
                  subtitle={r.team_name || undefined}
                />
              ))}
            </div>
          </Tile>
        </div>

        <div className="col-12">
          <Tile
            title={`Reserverenners (${reserveRiders.length})`}
            contentClassName="riders-list-container"
          >
            <div className="tile-list" id="reserve-riders-list-container">
              {reserveRiders.length === 0 ? <div className="no-riders-message" id="no-reserve-riders-message">Nog geen reserverenners</div> : null}
              {reserveRiders.map((r) => (
                <ListItem
                  key={r.id}
                  avatarPhotoUrl={r.photo_url}
                  avatarAlt={`${r.first_name || ''} ${r.last_name || ''}`.trim()}
                  avatarInitials={`${(r.first_name || 'R')[0]}${(r.last_name || 'R')[0]}`.toUpperCase()}
                  title={`${r.first_name || ''} ${r.last_name || ''}`.trim()}
                  subtitle={r.team_name || undefined}
                />
              ))}
            </div>
          </Tile>
        </div>

        {/* Jerseys */}
        <div className="col-12">
          <Tile
            title="Truien"
            contentClassName="riders-list-container"
          >
            <div className="tile-list" id="jerseys-list-container">
              {teamJerseys.length === 0 ? <div className="no-jerseys-message" id="no-jerseys-message"><p>Geen truien gevonden</p></div> : null}
              {teamJerseys.map((j) => {
                const jerseyIconSrc =
                  j.type === 'geel'
                    ? '/icons/Truien/geletrui.svg'
                    : j.type === 'groen'
                    ? '/icons/Truien/groenetrui.svg'
                    : j.type === 'bolletjes'
                    ? '/icons/Truien/bolletjestrui.svg'
                    : j.type === 'wit'
                    ? '/icons/Truien/wittetrui.svg'
                    : '/icons/Truien/geletrui.svg';

                return (
                  <ListItem
                    key={j.id}
                    avatarPhotoUrl={j.assigned?.photo_url}
                    avatarAlt={j.assigned ? `${j.assigned.first_name || ''} ${j.assigned.last_name || ''}`.trim() : undefined}
                    avatarInitials={j.assigned ? `${(j.assigned.first_name || 'R')[0]}${(j.assigned.last_name || 'R')[0]}`.toUpperCase() : undefined}
                    title={j.assigned ? `${j.assigned.first_name || ''} ${j.assigned.last_name || ''}`.trim() : 'Niet toegewezen'}
                    subtitle={j.assigned?.team_name || (j.assigned ? undefined : 'Selecteer een renner')}
                    rightIcon={
                      <div className="jersey-icon" title={j.name || j.type}>
                        <img src={jerseyIconSrc} alt={j.name || j.type} />
                      </div>
                    }
                  />
                );
              })}
            </div>
          </Tile>
        </div>

        <div className="col-12" style={{ marginTop: '1rem' }}>
          <a href="/logout.html">Uitloggen</a>
        </div>
      </div>
    </PageTemplate>
  );
}
