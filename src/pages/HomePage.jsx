import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Tile } from '../components/Tile';
import { ListItem } from '../components/ListItem';

function initialsFromFullName(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return String(name).slice(0, 2).toUpperCase();
}

export function HomePage() {
  const navigate = useNavigate();
  const { userId, participant } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [points, setPoints] = useState({ totalPoints: 0, riders: [], route: '' });
  const [standings, setStandings] = useState([]);
  const [prikbord, setPrikbord] = useState([]);
  const [dailyWinners, setDailyWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [awards, setAwards] = useState([]);
  const [awardsLoading, setAwardsLoading] = useState(true);
  const [awardsError, setAwardsError] = useState(null);

  const top5 = useMemo(() => standings.slice(0, 5), [standings]);
  const myStanding = useMemo(() => {
    const participantId = participant?.id ?? participant?.participantId ?? participant?.participant_id ?? null;
    if (!participantId) return null;

    return (
      standings.find((s) => {
        const standingParticipantId = s?.participantId ?? s?.id ?? s?.participant_id ?? null;
        if (!standingParticipantId) return false;
        return String(standingParticipantId) === String(participantId);
      }) || null
    );
  }, [participant?.id, participant?.participantId, participant?.participant_id, standings]);
  const myTotalPoints = myStanding?.totalPoints ?? 0;
  const myLatestStagePoints = points.totalPoints ?? 0;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    (async () => {
      try {
        const [adminRes, pointsRes, standingsRes, prikbordRes, dailyWinnersRes] = await Promise.all([
          api.checkAdmin(userId),
          api.getMyPointsRiders(userId),
          api.getStandings(),
          api.getPrikbordMessages(),
          api.getDailyWinners(),
        ]);

        if (cancelled) return;

        setIsAdmin(Boolean(adminRes?.ok && adminRes?.isAdmin));
        if (pointsRes?.ok) {
          setPoints({
            totalPoints: pointsRes.totalPoints || 0,
            riders: pointsRes.riders || [],
            route: pointsRes.route || '',
          });
        }
        if (standingsRes?.ok && Array.isArray(standingsRes.standings)) setStandings(standingsRes.standings);
        if (prikbordRes?.ok && Array.isArray(prikbordRes.messages)) setPrikbord(prikbordRes.messages);
        if (dailyWinnersRes?.ok && Array.isArray(dailyWinnersRes.winners)) setDailyWinners(dailyWinnersRes.winners);
        try {
          const participantId = participant?.id ?? participant?.participantId ?? participant?.participant_id ?? null;
          const awardsRes = await api.getAwardsLatest(3, participantId);
          if (awardsRes?.ok && Array.isArray(awardsRes.awards)) {
            setAwards(awardsRes.awards);
          } else {
            setAwards([]);
          }
          setAwardsLoading(false);
        } catch (awardsErr) {
          setAwardsError(awardsErr);
          setAwards([]);
          setAwardsLoading(false);
        }

        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setAwardsLoading(false);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

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
            {isAdmin ? (
              <button className="action-button" type="button" onClick={() => navigate('/admin.html')} aria-label="Admin">
                <span>Admin</span>
                <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="dashboard-content col-9">
            {error ? (
              <div className="error-message" style={{ display: 'block' }}>
                {String(error?.message || error)}
              </div>
            ) : null}

            <div className="dashboard-grid">
              <div className="dashboard-column">
                <Tile
                  className="daily-winners-section"
                  title="Dagwinnaars"
                  info={{
                    title: 'Dagwinnaars',
                    text: 'Hier zie je de top 3 teams van de laatste etappe met hun dagelijkse punten.',
                  }}
                  actions={
                    <button
                      className="button"
                      type="button"
                      onClick={() => navigate('/etappeoverzicht.html')}
                      aria-label="Bekijk etappeinformatie"
                    >
                      <span>Etappeinformatie</span>
                      <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                    </button>
                  }
                >
                  {dailyWinners.length === 0 ? (
                    <div className="no-data">Nog geen dagwinnaars beschikbaar</div>
                  ) : (
                    <div className="daily-winners-podium">
                      <img src="/icons/podium.svg" alt="Podium" className="podium-svg" />
                      <div className="podium-winners">
                        {/* 2nd place (left) */}
                        {dailyWinners[1] ? (
                          <div className="podium-winner podium-winner-2nd">
                            <div className="podium-avatar-container">
                              {dailyWinners[1].avatarUrl ? (
                                <img
                                  src={dailyWinners[1].avatarUrl}
                                  alt={dailyWinners[1].teamName}
                                  className="podium-avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className="podium-avatar-placeholder"
                                style={{ display: dailyWinners[1].avatarUrl ? 'none' : 'flex' }}
                              >
                                {dailyWinners[1].teamName ? dailyWinners[1].teamName.slice(0, 2).toUpperCase() : '?'}
                              </div>
                            </div>
                            <div className="podium-team-name">{dailyWinners[1].teamName || '-'}</div>
                            <div className="podium-points podium-points-2nd">{dailyWinners[1].points || 0}</div>
                          </div>
                        ) : null}
                        
                        {/* 1st place (center) */}
                        {dailyWinners[0] ? (
                          <div className="podium-winner podium-winner-1st">
                            <div className="podium-avatar-container">
                              {dailyWinners[0].avatarUrl ? (
                                <img
                                  src={dailyWinners[0].avatarUrl}
                                  alt={dailyWinners[0].teamName}
                                  className="podium-avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className="podium-avatar-placeholder"
                                style={{ display: dailyWinners[0].avatarUrl ? 'none' : 'flex' }}
                              >
                                {dailyWinners[0].teamName ? dailyWinners[0].teamName.slice(0, 2).toUpperCase() : '?'}
                              </div>
                            </div>
                            <div className="podium-team-name">{dailyWinners[0].teamName || '-'}</div>
                            <div className="podium-points podium-points-1st">{dailyWinners[0].points || 0}</div>
                          </div>
                        ) : null}
                        
                        {/* 3rd place (right) */}
                        {dailyWinners[2] ? (
                          <div className="podium-winner podium-winner-3rd">
                            <div className="podium-avatar-container">
                              {dailyWinners[2].avatarUrl ? (
                                <img
                                  src={dailyWinners[2].avatarUrl}
                                  alt={dailyWinners[2].teamName}
                                  className="podium-avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className="podium-avatar-placeholder"
                                style={{ display: dailyWinners[2].avatarUrl ? 'none' : 'flex' }}
                              >
                                {dailyWinners[2].teamName ? dailyWinners[2].teamName.slice(0, 2).toUpperCase() : '?'}
                              </div>
                            </div>
                            <div className="podium-team-name">{dailyWinners[2].teamName || '-'}</div>
                            <div className="podium-points podium-points-3rd">{dailyWinners[2].points || 0}</div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </Tile>

                <Tile
                  title="Mijn prijzenkast"
                  info={{
                    title: 'Mijn prijzenkast',
                    text: 'Laatste behaalde awards.',
                  }}
                  className="trophy-cabinet-section"
                >
                  <div className="tile-list">
                    {awardsLoading ? (
                      <div className="no-data">Bezig met laden...</div>
                    ) : awardsError ? (
                      <div className="no-data">Kon awards niet laden</div>
                    ) : awards.length === 0 ? (
                      <div className="no-data">Geen awards beschikbaar</div>
                    ) : (
                      awards.map((award) => {
                        const stageLabel = award.stageNumber
                          ? `Etappe ${award.stageNumber}${award.stageName ? ` – ${award.stageName}` : ''}`
                          : 'Algemeen';
                        const iconSrc = award.icon ? `/${String(award.icon).replace(/^\//, '')}` : undefined;
                        return (
                          <ListItem
                            key={award.awardAssignmentId || `${award.awardCode}-${award.participantId}-${stageLabel}`}
                            avatarPhotoUrl={iconSrc}
                            avatarAlt={award.awardTitle}
                            avatarInitials={!iconSrc ? (award.awardTitle || '?').slice(0, 2).toUpperCase() : undefined}
                            title={award.awardTitle || 'Award'}
                            subtitle={award.awardDescription || stageLabel}
                            value={award.teamName || ''}
                          />
                        );
                      })
                    )}
                  </div>
                </Tile>

                <Tile
                  className="points-section"
                  title={
                    <>
                      Mijn punten <span className="points-value">({myLatestStagePoints || 0})</span>
                    </>
                  }
                  info={{
                    title: 'Mijn punten',
                    text: 'Hier zie je welke renners uit jouw team onlangs punten hebben gepakt.',
                  }}
                  actions={
                    <button
                      className="button"
                      type="button"
                      onClick={() => navigate('/teamoverzicht.html')}
                      aria-label="Bekijk mijn team"
                    >
                      <span>mijn team</span>
                      <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                    </button>
                  }
                >
                  <div className="points-riders-list tile-list">
                    {points.riders.length === 0 ? <div className="no-data">Geen punten beschikbaar</div> : null}
                    {points.riders.map((r) => (
                      <ListItem
                        key={r.id || r.name}
                        avatarPhotoUrl={r.photoUrl}
                        avatarAlt={r.name}
                        avatarInitials={initialsFromFullName(r.name)}
                        title={r.name}
                        subtitle={r.route || points.route || undefined}
                        value={r.points || 0}
                      />
                    ))}
                  </div>
                </Tile>
              </div>

              <div className="dashboard-column">
                <Tile
                  className="standings-section"
                  title="Stand"
                  info={{
                    title: 'Stand',
                    text: 'Hier zie je de top van het klassement op basis van de totale punten.',
                  }}
                  actions={
                    <button
                      className="button"
                      type="button"
                      onClick={() => navigate('/stand.html')}
                      aria-label="Bekijk volledige stand"
                    >
                      <span>volledige stand</span>
                      <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                    </button>
                  }
                >
                  <div className="standings-list tile-list">
                    {top5.length === 0 ? <div className="no-data">Nog geen stand beschikbaar</div> : null}
                    {top5.map((t) => {
                      // positionChange kan number, null, of undefined zijn
                      // null/undefined = geen vorige data, number (inclusief 0) = wel data
                      const hasPositionChange = t.positionChange !== undefined && t.positionChange !== null;
                      const positionChange = hasPositionChange ? Number(t.positionChange) : null;
                      const changeType = positionChange === null ? null : positionChange > 0 ? 'up' : positionChange < 0 ? 'down' : 'neutral';
                      const changeValue = positionChange !== null ? Math.abs(positionChange) : 0;
                      const showChange = hasPositionChange && positionChange !== 0;
                      
                      return (
                        <div key={t.participantId || t.rank} className="standing-item">
                          <div className="standing-rank">{t.rank}</div>
                          <div className="standing-name">{t.teamName}</div>
                          <div className="standing-points">{t.totalPoints}</div>
                          {hasPositionChange ? (
                            <div className={`standing-change standing-change-${changeType}`} aria-label="Positiewijziging">
                              {showChange ? <span className="standing-change-value">{changeValue}</span> : null}
                              <img
                                src="/assets/arrow.svg"
                                alt=""
                                className={`standing-change-arrow ${
                                  changeType === 'up'
                                    ? 'standing-change-arrow-up'
                                    : changeType === 'down'
                                      ? 'standing-change-arrow-down'
                                      : 'standing-change-arrow-neutral'
                                }`}
                                aria-hidden="true"
                              />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </Tile>

                <Tile
                  className="prikbord-section"
                  title="Prikbord"
                  info={{
                    title: 'Prikbord',
                    text: 'Hier staan de meest recente berichten. Je kan zelf ook een bericht plaatsen.',
                  }}
                  actions={
                    <button
                      className="button"
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
                  }
                >
                  <div className="prikbord-list tile-list">
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
                </Tile>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
