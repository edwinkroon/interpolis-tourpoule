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
  const [participant, setParticipant] = useState(null);
  const [teamRiders, setTeamRiders] = useState([]);
  const [teamJerseys, setTeamJerseys] = useState([]);
  const [teamStanding, setTeamStanding] = useState({ totalPoints: 0, positionChange: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarError, setAvatarError] = useState(false);

  const mainRiders = useMemo(() => teamRiders.filter((r) => r.slot_type === 'main'), [teamRiders]);
  const reserveRiders = useMemo(() => teamRiders.filter((r) => r.slot_type === 'reserve'), [teamRiders]);

  const sidebar = useMemo(
    () => (
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
        <button className="action-button" type="button" onClick={() => navigate('/logout.html')} aria-label="Uitloggen">
          <span>Uitloggen</span>
          <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
        </button>
      </>
    ),
    [navigate],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const id = await getUserId();
        if (!id) return;
        if (cancelled) return;

        const [userRes, ridersRes, jerseysRes, standingsRes] = await Promise.all([
          api.getUser(id),
          api.getTeamRiders(id),
          api.getTeamJerseys(id),
          api.getStandings(),
        ]);

        if (cancelled) return;

        if (userRes?.ok && userRes?.participant) {
          setParticipant(userRes.participant);

          const participantId = userRes.participant.id;
          const standings = standingsRes?.ok && Array.isArray(standingsRes.standings) ? standingsRes.standings : [];
          const mine = participantId ? standings.find((s) => s.participantId === participantId) : null;
          setTeamStanding({
            totalPoints: mine?.totalPoints || 0,
            positionChange: mine?.positionChange ?? null,
          });
        } else {
          setTeamStanding({ totalPoints: 0, positionChange: null });
        }
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

  useEffect(() => {
    setAvatarError(false);
  }, [participant?.avatar_url]);

  if (loading) {
    return (
      <PageTemplate title="Team overzicht" backLink="/home.html" sidebar={sidebar}>
        <div className="grid">
          <div className="col-12">
            <Tile title="Status">
              <div className="no-data">Bezig met laden...</div>
            </Tile>
          </div>
        </div>
      </PageTemplate>
    );
  }

  if (error) {
    return (
      <PageTemplate title="Team overzicht" backLink="/home.html" sidebar={sidebar}>
        <div className="grid">
          <div className="col-12">
            <Tile title="Fout">
              <div className="error-message" style={{ display: 'block' }}>
                {String(error?.message || error)}
              </div>
            </Tile>
          </div>
        </div>
      </PageTemplate>
    );
  }

  const positionChange = typeof teamStanding?.positionChange === 'number' ? teamStanding.positionChange : 0;
  const trendType = positionChange > 0 ? 'up' : positionChange < 0 ? 'down' : 'same';
  const trendValue = Math.abs(positionChange);

  return (
    <PageTemplate
      title="Team overzicht"
      backLink="/home.html"
      sidebar={sidebar}
    >
      <div className="dashboard-grid">
        <div className="dashboard-column">
          <Tile
            className="team-overview-team-tile"
            headerLeft={
              <div className="team-tile-avatar">
                {participant?.avatar_url && !avatarError ? (
                  <img
                    src={participant.avatar_url}
                    alt={participant?.team_name ? `Avatar van ${participant.team_name}` : 'Team avatar'}
                    className="team-tile-avatar-img"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="team-tile-avatar-placeholder">{initialsFromName(participant?.team_name)}</div>
                )}
              </div>
            }
            headerRight={
              <div className="team-tile-metrics" aria-label="Teampunten en positie verandering">
                <span className="team-tile-points">{teamStanding?.totalPoints || 0}</span>
                <span className={`team-tile-trend team-tile-trend--${trendType}`}>
                  <svg
                    className={`team-tile-trend-arrow team-tile-trend-arrow--${trendType === 'same' ? 'right' : trendType}`}
                    viewBox="0 0 12 12"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      fill="currentColor"
                      d="M4.2 2.2L9.8 6 4.2 9.8V7.2H2V4.8h2.2V2.2z"
                    />
                  </svg>
                  <span>{trendValue}</span>
                </span>
              </div>
            }
            title={participant?.team_name || 'Team'}
            actions={
              <button className="team-compare-button" type="button" onClick={() => navigate('/teamvergelijken.html')}>
                <span>Vergelijk teams</span>
                <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
              </button>
            }
          >
            <div className="tile-list">
              <ListItem title="Email" value={participant?.email || '-'} />
              <ListItem title="Notificaties" value={participant?.newsletter ? 'Aan' : 'Uit'} />
            </div>
          </Tile>

          <Tile title="Truien" contentClassName="riders-list-container">
            <div className="tile-list" id="jerseys-list-container">
              {teamJerseys.length === 0 ? (
                <div className="no-jerseys-message" id="no-jerseys-message">
                  <p>Geen truien gevonden</p>
                </div>
              ) : null}
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

        <div className="dashboard-column">
          <Tile title={`Basisrenners (${mainRiders.length})`} contentClassName="riders-list-container">
            <div className="tile-list" id="main-riders-list-container">
              {mainRiders.length === 0 ? (
                <div className="no-riders-message" id="no-main-riders-message">
                  Nog geen basisrenners
                </div>
              ) : null}
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

          <Tile title={`Reserverenners (${reserveRiders.length})`} contentClassName="riders-list-container">
            <div className="tile-list" id="reserve-riders-list-container">
              {reserveRiders.length === 0 ? (
                <div className="no-riders-message" id="no-reserve-riders-message">
                  Nog geen reserverenners
                </div>
              ) : null}
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
      </div>
    </PageTemplate>
  );
}
