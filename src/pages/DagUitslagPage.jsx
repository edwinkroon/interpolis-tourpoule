import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { LoadingBlock } from '../components/LoadingBlock';
import { StageNavigationBar } from '../components/StageNavigationBar';
import { Tile } from '../components/Tile';
import { ListItem } from '../components/ListItem';

function makeStageLabel(stage) {
  if (!stage) return '';
  return stage.name || `Etappe ${stage.stage_number}`;
}

function makeRouteText(stage) {
  if (!stage) return '';
  return stage.route_text || '';
}

export function DagUitslagPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [stages, setStages] = useState([]);
  const [currentStage, setCurrentStage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamsRes, setTeamsRes] = useState(null);

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

      if (!cancelled) setCurrentStage(nextStage);
    })().catch(() => {
      // silent
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
      setLoading(true);

      const res = await api.getStageTeamPoints(currentStage.stage_number);
      if (cancelled) return;

      setTeamsRes(res?.ok ? res : { ok: false, teams: [] });
      setLoading(false);
      setSearchParams({ stage: String(currentStage.stage_number) }, { replace: true });
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentStage, setSearchParams]);

  const teams = teamsRes?.teams || [];

  return (
    <>
      <div id="build-info" className="build-info" />

      <header className="header">
        <div className="header-content page">
          <div className="grid">
            <div className="col-12">
              <div className="header-top">
                <a
                  href="#"
                  className="back-link"
                  onClick={(e) => {
                    e.preventDefault();
                    const stage = currentStage?.stage_number;
                    navigate(stage ? `/etappeoverzicht.html?stage=${encodeURIComponent(stage)}` : '/etappeoverzicht.html');
                  }}
                >
                  <img src="/assets/arrow.svg" alt="" className="back-arrow" aria-hidden="true" />
                  <span>Terug</span>
                </a>
                <div className="header-title">Interpolis tourspel</div>
              </div>
            </div>
            <div className="col-12">
              <div className="header-welcome-section">
                <h1 className="welcome-heading">Daguitslag</h1>
                <div className="header-illustration">
                  <img src="/assets/headerillustration.svg" alt="Fiets illustratie" className="illustration-svg" />
                </div>
              </div>
            </div>
          </div>
        </div>

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
      </header>

      <main className="main-content page">
        <div className="grid">
          <div className="col-12">
            <Tile
              className="standings-full-section"
              title="Alle teams"
              subtitle={makeRouteText(currentStage)}
              info={{
                title: 'Alle teams',
                text: 'Dit is de dag-uitslag: alle teams gerangschikt op behaalde punten voor deze etappe.',
              }}
            >
              {loading ? (
                <LoadingBlock />
              ) : teams.length === 0 ? (
                <div className="no-data">Geen uitslag beschikbaar</div>
              ) : (
                <div className="standings-list tile-list" id="day-standings-list">
                  {teams.map((t) => (
                    <ListItem
                      key={t.participantId || `${t.rank}-${t.teamName}`}
                      leftValue={t.rank}
                      title={t.teamName}
                      value={t.points}
                    />
                  ))}
                </div>
              )}
            </Tile>
          </div>
        </div>
      </main>
    </>
  );
}
