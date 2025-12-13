import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { getUserId } from '../utils/auth0';
import { PageTemplate } from '../layouts/PageTemplate';
import { LoadingBlock } from '../components/LoadingBlock';
import { StageNavigationBar } from '../components/StageNavigationBar';
import { Tile } from '../components/Tile';

function makeStageLabel(stage) {
  if (!stage) return '';
  return stage.name || `Etappe ${stage.stage_number}`;
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

  const subtitle = currentStage
    ? `${makeStageLabel(currentStage)}${makeRouteText(currentStage) ? ` – ${makeRouteText(currentStage)}` : ''}`
    : undefined;

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
            <button
              className="action-button"
              type="button"
              onClick={() => navigate('/etappetoevoegen.html')}
              aria-label="Etappe toevoegen"
            >
              <span>Etappe toevoegen</span>
              <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
            </button>
            {isAdmin ? (
              <button className="action-button" type="button" onClick={() => navigate('/admin.html')} aria-label="Admin">
                <span>Admin</span>
                <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
              </button>
            ) : null}
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
                    <a
                      href="#"
                      className="card-link"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/teamoverzicht.html');
                      }}
                    >
                      <span>mijn team</span>
                      <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                    </a>
                  }
                >
                  <ul className="riders-list tile-list" id="my-riders-list">
                    {loadingCards ? (
                      <LoadingBlock />
                    ) : ridersWithPoints.length === 0 ? (
                      <li className="no-data">Geen renners met punten voor deze etappe</li>
                    ) : (
                      ridersWithPoints.map((r) => (
                        <li key={r.id} className="rider-item">
                          <div className="rider-avatar">
                            <img src="" alt={r.name} className="rider-photo" style={{ display: 'none' }} />
                            <div className="rider-avatar-placeholder" style={{ display: 'flex' }}>
                              {initialsFromFullName(r.name)}
                            </div>
                          </div>
                          <div className="rider-info">
                            <div className="rider-name">{r.name}</div>
                            <div className="rider-team">{r.team}</div>
                            {r.position ? <div className="rider-position">Positie {r.position}</div> : null}
                          </div>
                          <div className="rider-points">{formatPointsLabel(r.points)}</div>
                        </li>
                      ))
                    )}
                  </ul>
                </Tile>

                <Tile
                  className="day-winners-section"
                  title="Dagwinnaars"
                  subtitle={makeRouteText(currentStage)}
                  info={{
                    title: 'Dagwinnaars',
                    text: 'Hier zie je de drie teams die de meeste punten hebben gehaald bij deze etappe.',
                  }}
                  actions={
                    <a
                      href={`/daguitslag.html?stage=${encodeURIComponent(currentStage?.stage_number || '')}`}
                      className="day-winners-button"
                      aria-label="Bekijk alle teams"
                    >
                      <span>bekijk alle teams</span>
                      <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                    </a>
                  }
                >
                  <div className="day-winners-list" id="day-winners-list">
                    {loadingCards ? (
                      <LoadingBlock />
                    ) : top3Teams.length === 0 ? (
                      <div className="no-data">Geen winnaars beschikbaar</div>
                    ) : (
                      <div className="day-winners-podium">
                        <div className="day-winners-podium-structure">
                          {[2, 1, 3].map((rank) => {
                            const t = top3Teams[rank - 1];
                            if (!t) return null;
                            const name = t.teamName || t.team_name || 'Team';
                            return (
                              <div key={rank} className={`day-winner-podium-block day-winner-podium-${rank}`}>
                                <div className="day-winner-podium-avatar">
                                  {t.avatarUrl ? (
                                    <img src={t.avatarUrl} alt={name} className="day-winner-podium-avatar-img" />
                                  ) : null}
                                </div>
                                <div className="day-winner-podium-name">{name}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="day-winners-podium-svg">
                          <img src="/icons/podium.svg" alt="Podium" />
                        </div>
                      </div>
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
                    <a href="#" className="card-link" onClick={(e) => e.preventDefault()}>
                      <span>volledige etappe uitslag</span>
                      <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                    </a>
                  }
                >
                  <ol className="results-list list-with-time tile-list" id="stage-results-list">
                    {loadingCards ? (
                      <LoadingBlock />
                    ) : (stageResults?.results || []).length === 0 ? (
                      <li className="no-data">Geen resultaten beschikbaar</li>
                    ) : (
                      stageResults.results.map((r) => (
                        <li key={r.position} className="result-item">
                          <span className="result-position">{r.position}.</span>
                          <span className="result-rider">{r.rider}</span>
                          <span className="result-time">{r.time || ''}</span>
                        </li>
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
                            <div key={`${j.type}-${j.riderId || j.rider}`} className="team-rider-item">
                              <div className="rider-avatar">
                                {j.photoUrl ? <img src={j.photoUrl} alt={j.rider} className="rider-photo" /> : null}
                                <div
                                  className="rider-avatar-placeholder"
                                  style={{ display: j.photoUrl ? 'none' : 'flex' }}
                                >
                                  {initialsFromFullName(j.rider)}
                                </div>
                              </div>
                              <div className="rider-info">
                                <div className="rider-name">{j.rider}</div>
                                <div className="rider-team">{j.team || ''}</div>
                              </div>
                              <div className="jersey-icon" title={j.jerseyName || j.type}>
                                <img src={jerseyIcon} alt={j.jerseyName || j.type} />
                              </div>
                            </div>
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
