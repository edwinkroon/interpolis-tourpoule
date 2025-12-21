import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { getUserId } from '../utils/auth0';
import { PageTemplate } from '../layouts/PageTemplate';
import { LoadingBlock } from '../components/LoadingBlock';
import { StageNavigationBar } from '../components/StageNavigationBar';
import { Tile } from '../components/Tile';
import { ListItem } from '../components/ListItem';

function makeStageLabel(stage) {
  if (!stage) return '';
  // Remove pipe and route information from stage name if present
  // Format might be: "Stage 1 | Lille - Lille (185km)" or similar
  let label = stage.name || `Etappe ${stage.stage_number}`;
  
  // Remove pipe and everything after it (route info)
  const pipeIndex = label.indexOf('|');
  if (pipeIndex !== -1) {
    label = label.substring(0, pipeIndex).trim();
  }
  
  // Also remove "van - naar" pattern if present
  label = label.replace(/\s*-\s*[^-]+$/, '').trim();
  
  // If empty after cleaning, fall back to stage number
  if (!label) {
    label = `Etappe ${stage.stage_number}`;
  }
  
  return label;
}

function makeRouteText(stage) {
  if (!stage) return '';
  return stage.route_text || '';
}

function initialsFromFullName(name) {
  if (!name) return 'R';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function formatPointsLabel(points) {
  const p = Number(points || 0);
  return `${p} punt${p === 1 ? '' : 'en'}`;
}

export function StagesOverviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isAdmin, setIsAdmin] = useState(false);
  const [stages, setStages] = useState([]);
  const [currentStage, setCurrentStage] = useState(null);

  const [loadingCards, setLoadingCards] = useState(true);
  const [myStage, setMyStage] = useState(null);
  const [stageResults, setStageResults] = useState(null);
  const [dayTeams, setDayTeams] = useState(null);
  const [jerseys, setJerseys] = useState(null);
  const [stageAwards, setStageAwards] = useState([]);
  const [stageAwardsLoading, setStageAwardsLoading] = useState(false);
  const [stageAwardsError, setStageAwardsError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await api.getStagesWithResults();
      const list =
        res?.ok && Array.isArray(res.stages) ? [...res.stages].sort((a, b) => a.stage_number - b.stage_number) : [];

      if (cancelled) return;
      setStages(list);

      const stageParam = searchParams.get('stage');
      const stageNumber = stageParam ? Number(stageParam) : null;

      let nextStage = null;
      if (stageNumber && Number.isFinite(stageNumber)) {
        nextStage = list.find((s) => s.stage_number === stageNumber) || null;
      }
      if (!nextStage && list.length) nextStage = list[list.length - 1];
      if (!nextStage) {
        const latest = await api.getLatestStage();
        nextStage = latest?.ok ? latest.stage : null;
      }

      if (!cancelled) setCurrentStage(nextStage);
    })().catch(() => {
      // silent like legacy
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const currentIndex = useMemo(() => {
    if (!currentStage) return -1;
    return stages.findIndex((s) => s.stage_number === currentStage.stage_number);
  }, [stages, currentStage]);

  const canPrev = currentIndex > 0;
  const canNext = currentIndex >= 0 && currentIndex < stages.length - 1;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!currentStage?.stage_number) return;

      setLoadingCards(true);
      setMyStage(null);
      setStageResults(null);
      setDayTeams(null);
      setJerseys(null);

      const userId = await getUserId();

      const [adminRes, myStageRes, stageResultsRes, dayTeamsRes, jerseysRes] = await Promise.all([
        userId ? api.checkAdmin(userId) : Promise.resolve(null),
        userId ? api.getMyStageRiders({ userId, stageNumber: currentStage.stage_number }) : Promise.resolve(null),
        api.getStageResults(currentStage.stage_number),
        api.getStageTeamPoints(currentStage.stage_number),
        api.getStageJerseyWearers(currentStage.stage_number),
      ]);

      if (cancelled) return;

      setMyStage(myStageRes?.ok ? myStageRes : { ok: false, riders: [], totalPoints: 0 });
      setStageResults(stageResultsRes?.ok ? stageResultsRes : { ok: false, results: [] });
      setDayTeams(dayTeamsRes?.ok ? dayTeamsRes : { ok: false, teams: [] });
      setJerseys(jerseysRes?.ok ? jerseysRes : { ok: false, jerseys: [] });
      setIsAdmin(Boolean(adminRes?.ok && adminRes?.isAdmin));
      setLoadingCards(false);

      setSearchParams({ stage: String(currentStage.stage_number) }, { replace: true });
    })().catch(() => {
      if (!cancelled) setLoadingCards(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentStage, setSearchParams]);

  // Load awards for the selected stage
  useEffect(() => {
    let cancelled = false;
    const loadAwards = async () => {
      if (!currentStage?.stage_number) {
        setStageAwards([]);
        return;
      }
      setStageAwardsLoading(true);
      setStageAwardsError(null);
      try {
        const res = await api.getAwardsByStage(currentStage.stage_number);
        if (cancelled) return;
        if (res?.ok && Array.isArray(res.awards)) {
          setStageAwards(res.awards);
        } else {
          setStageAwards([]);
        }
      } catch (err) {
        if (!cancelled) {
          setStageAwardsError(err);
          setStageAwards([]);
        }
      } finally {
        if (!cancelled) setStageAwardsLoading(false);
      }
    };
    loadAwards();
    return () => {
      cancelled = true;
    };
  }, [currentStage]);

  const top3Teams = useMemo(() => {
    const teams = dayTeams?.teams || [];
    return teams.slice(0, 3);
  }, [dayTeams]);

  const ridersWithPoints = useMemo(() => {
    const riders = myStage?.riders || [];
    return [...riders]
      .filter((r) => (r.points || 0) > 0)
      .sort((a, b) => {
        const diff = (b.points || 0) - (a.points || 0);
        if (diff !== 0) return diff;
        return String(a.name || '').localeCompare(String(b.name || ''), 'nl', { sensitivity: 'base' });
      });
  }, [myStage]);

  // Subtitle should only show the route, not the stage name (which is already in StageNavigationBar)
  const subtitle = currentStage ? makeRouteText(currentStage) || undefined : undefined;

  return (
    <>
      <div id="build-info" className="build-info" />

      <PageTemplate
        title="Etappe informatie"
        subtitle={subtitle}
        backLink="/home.html"
        stageNavigation={
          <StageNavigationBar
            stageLabel={makeStageLabel(currentStage)}
            routeText={makeRouteText(currentStage)}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={() => {
              if (!canPrev) return;
              setCurrentStage(stages[currentIndex - 1]);
            }}
            onNext={() => {
              if (!canNext) return;
              setCurrentStage(stages[currentIndex + 1]);
            }}
          />
        }
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
            {isAdmin ? (
              <button className="action-button" type="button" onClick={() => navigate('/admin.html')} aria-label="Admin">
                <span>Admin</span>
                <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
              </button>
            ) : null}
            <a
              href="/logout.html"
              className="action-button"
              style={{ textDecoration: 'none', color: 'inherit' }}
              aria-label="Uitloggen"
            >
              <span>Uitloggen</span>
              <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
            </a>
          </>
        }
      >
            <div className="dashboard-grid">
              <div className="dashboard-column">
                <Tile
                  className="points-section"
                  title={
                    <>
                      Mijn punten <span className="points-count">({myStage?.totalPoints ?? 0})</span>
                    </>
                  }
                  info={{
                    title: 'Mijn punten',
                    text: 'Hier zie je welke renners uit jouw team punten hebben behaald bij deze etappe.',
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
                  <ul className="riders-list tile-list" id="my-riders-list">
                    {loadingCards ? (
                      <LoadingBlock />
                    ) : ridersWithPoints.length === 0 ? (
                      <li className="no-data">Geen renners met punten voor deze etappe</li>
                    ) : (
                      ridersWithPoints.map((r) => (
                        <ListItem
                          key={r.id}
                          avatarInitials={initialsFromFullName(r.name)}
                          title={r.name}
                          subtitle={r.position ? `Positie ${r.position} • ${r.team}` : r.team}
                          value={formatPointsLabel(r.points)}
                        />
                      ))
                    )}
                  </ul>
                </Tile>

                <Tile
                  className="daily-winners-section"
                  title="Dagwinnaars"
                  info={{
                    title: 'Dagwinnaars',
                    text: 'Hier zie je de top 3 teams van deze etappe met hun dagelijkse punten.',
                  }}
                  actions={
                    <button
                      className="button"
                      type="button"
                      onClick={() => navigate(`/daguitslag.html?stage=${encodeURIComponent(currentStage?.stage_number || '')}`)}
                      aria-label="Bekijk alle teams"
                    >
                      <span>bekijk alle teams</span>
                      <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                    </button>
                  }
                >
                    {loadingCards ? (
                      <LoadingBlock />
                    ) : top3Teams.length === 0 ? (
                    <div className="no-data">Nog geen dagwinnaars beschikbaar</div>
                    ) : (
                    <div className="daily-winners-podium">
                      <img src="/icons/podium.svg" alt="Podium" className="podium-svg" />
                      <div className="podium-winners">
                        {/* 2nd place (left) */}
                        {top3Teams[1] ? (
                          <div className="podium-winner podium-winner-2nd">
                            <div className="podium-avatar-container">
                              {top3Teams[1].avatarUrl ? (
                                <img
                                  src={top3Teams[1].avatarUrl}
                                  alt={top3Teams[1].teamName || top3Teams[1].team_name}
                                  className="podium-avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className="podium-avatar-placeholder"
                                style={{ display: top3Teams[1].avatarUrl ? 'none' : 'flex' }}
                              >
                                {(top3Teams[1].teamName || top3Teams[1].team_name) ? (top3Teams[1].teamName || top3Teams[1].team_name).slice(0, 2).toUpperCase() : '?'}
                              </div>
                            </div>
                            <div className="podium-team-name">{top3Teams[1].teamName || top3Teams[1].team_name || '-'}</div>
                            <div className="podium-points podium-points-2nd">{top3Teams[1].points || 0}</div>
                          </div>
                        ) : null}
                        
                        {/* 1st place (center) */}
                        {top3Teams[0] ? (
                          <div className="podium-winner podium-winner-1st">
                            <div className="podium-avatar-container">
                              {top3Teams[0].avatarUrl ? (
                                <img
                                  src={top3Teams[0].avatarUrl}
                                  alt={top3Teams[0].teamName || top3Teams[0].team_name}
                                  className="podium-avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                                  ) : null}
                              <div
                                className="podium-avatar-placeholder"
                                style={{ display: top3Teams[0].avatarUrl ? 'none' : 'flex' }}
                              >
                                {(top3Teams[0].teamName || top3Teams[0].team_name) ? (top3Teams[0].teamName || top3Teams[0].team_name).slice(0, 2).toUpperCase() : '?'}
                              </div>
                            </div>
                            <div className="podium-team-name">{top3Teams[0].teamName || top3Teams[0].team_name || '-'}</div>
                            <div className="podium-points podium-points-1st">{top3Teams[0].points || 0}</div>
                                </div>
                        ) : null}
                        
                        {/* 3rd place (right) */}
                        {top3Teams[2] ? (
                          <div className="podium-winner podium-winner-3rd">
                            <div className="podium-avatar-container">
                              {top3Teams[2].avatarUrl ? (
                                <img
                                  src={top3Teams[2].avatarUrl}
                                  alt={top3Teams[2].teamName || top3Teams[2].team_name}
                                  className="podium-avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className="podium-avatar-placeholder"
                                style={{ display: top3Teams[2].avatarUrl ? 'none' : 'flex' }}
                              >
                                {(top3Teams[2].teamName || top3Teams[2].team_name) ? (top3Teams[2].teamName || top3Teams[2].team_name).slice(0, 2).toUpperCase() : '?'}
                              </div>
                        </div>
                            <div className="podium-team-name">{top3Teams[2].teamName || top3Teams[2].team_name || '-'}</div>
                            <div className="podium-points podium-points-3rd">{top3Teams[2].points || 0}</div>
                        </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </Tile>

                <Tile
                  className="trophy-cabinet-section"
                  title="Prijzenschema"
                  info={{
                    title: 'Prijzenschema',
                    text: 'Alle awards die bij deze etappe zijn uitgereikt.',
                  }}
                >
                  <div className="tile-list">
                    {stageAwardsLoading ? (
                      <div className="no-data">Bezig met laden...</div>
                    ) : stageAwardsError ? (
                      <div className="no-data">Kon awards niet laden</div>
                    ) : stageAwards.length === 0 ? (
                      <div className="no-data">Nog geen awards voor deze etappe</div>
                    ) : (
                      stageAwards.map((award) => {
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
              </div>

              <div className="dashboard-column">
                <Tile
                  className="etappe-uitslag-section"
                  title="Etappe uitslag"
                  info={{
                    title: 'Etappe uitslag',
                    text: 'Hier zie je de top 6 renners van deze etappe met hun eindtijd.',
                  }}
                  actions={
                    <button
                      className="button"
                      type="button"
                      onClick={(e) => e.preventDefault()}
                      aria-label="Volledige etappe uitslag"
                    >
                      <span>volledige etappe uitslag</span>
                      <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                    </button>
                  }
                >
                  <ol className="results-list list-with-time tile-list" id="stage-results-list">
                    {loadingCards ? (
                      <LoadingBlock />
                    ) : (stageResults?.results || []).length === 0 ? (
                      <li className="no-data">Geen resultaten beschikbaar</li>
                    ) : (
                      stageResults.results.map((r) => (
                        <ListItem
                          key={r.position}
                          leftValue={`${r.position}.`}
                          title={r.rider}
                          value={r.time || ''}
                        />
                      ))
                    )}
                  </ol>
                </Tile>

                <Tile
                  title="Truidragers"
                  info={{
                    title: 'Truidragers',
                    text: 'Hier zie je welke renners de leidende truien dragen na deze etappe.',
                  }}
                >
                  <div className="riders-list-container" id="jerseys-list-container">
                    <div id="jerseys-list" className="tile-list">
                      {loadingCards ? (
                        <LoadingBlock />
                      ) : (jerseys?.jerseys || []).length === 0 ? (
                        <div className="no-data">Geen truidragers beschikbaar</div>
                      ) : (
                        jerseys.jerseys.map((j) => {
                          const jerseyIcon =
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
                              key={`${j.type}-${j.riderId || j.rider}`}
                              leftIcon={
                                <div className="list-item-avatar-container jersey-icon-container" title={j.jerseyName || j.type}>
                                  <img src={jerseyIcon} alt={j.jerseyName || j.type} className="jersey-icon-img" />
                                </div>
                              }
                              title={j.rider}
                              subtitle={j.team || undefined}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                </Tile>
              </div>
            </div>
      </PageTemplate>
    </>
  );
}
