import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getUserId } from '../utils/auth0';
import { LoadingBlock } from '../components/LoadingBlock';
import { RiderAvatar } from '../components/RiderAvatar';

function initialsFromName(name) {
  if (!name) return '?';
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return String(name).substring(0, 2).toUpperCase();
}

function riderInitials(firstName, lastName) {
  const f = firstName ? String(firstName)[0] : '';
  const l = lastName ? String(lastName)[0] : '';
  return `${f}${l}`.toUpperCase() || '?';
}

function jerseyIconForType(type) {
  if (type === 'geel') return '/icons/Truien/geletrui.svg';
  if (type === 'groen') return '/icons/Truien/groenetrui.svg';
  if (type === 'bolletjes') return '/icons/Truien/bolletjestrui.svg';
  if (type === 'wit') return '/icons/Truien/wittetrui.svg';
  return '/icons/Truien/geletrui.svg';
}

function normalizeTeamLabel(team) {
  return team?.teamName || team?.team_name || team?.name || 'Onbekend team';
}

export function TeamComparePage() {
  const navigate = useNavigate();
  const selectRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [standings, setStandings] = useState([]);

  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareTeam, setCompareTeam] = useState(null);

  const [filters, setFilters] = useState({
    main: true,
    reserve: true,
    inactive: true,
    shared: true,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const userId = await getUserId();
      const userRes = await api.getUser(userId);
      const participantId = userRes?.participant?.id ?? null;

      const [adminRes, myTeamRes, standingsRes] = await Promise.all([
        userId ? api.checkAdmin(userId) : Promise.resolve(null),
        participantId ? api.getTeamComparison(participantId) : Promise.resolve(null),
        api.getStandings(),
      ]);

      if (cancelled) return;

      setIsAdmin(Boolean(adminRes?.ok && adminRes?.isAdmin));
      setMyParticipantId(participantId);
      setMyTeam(myTeamRes?.ok ? myTeamRes.team : null);
      setStandings(standingsRes?.ok && Array.isArray(standingsRes.standings) ? standingsRes.standings : []);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const dropdownOptions = useMemo(() => {
    return (standings || [])
      .map((t) => ({
        participantId: t.participantId || t.id,
        label: normalizeTeamLabel(t),
        avatarUrl: t.avatarUrl || t.avatar_url || '',
      }))
      .filter((t) => t.participantId && t.participantId !== myParticipantId);
  }, [standings, myParticipantId]);

  const selectDisplayText = useMemo(() => {
    if (loading) return 'Gegevens aan het ophalen...';
    if (!selectedParticipantId) return 'Selecteer een team...';
    const opt = dropdownOptions.find((o) => String(o.participantId) === String(selectedParticipantId));
    return opt?.label || 'Selecteer een team...';
  }, [loading, selectedParticipantId, dropdownOptions]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!selectedParticipantId) {
        setCompareTeam(null);
        return;
      }

      setCompareLoading(true);
      try {
        const res = await api.getTeamComparison(selectedParticipantId);
        if (cancelled) return;
        setCompareTeam(res?.ok ? res.team : null);
      } finally {
        if (!cancelled) setCompareLoading(false);
      }
    })().catch(() => {
      if (!cancelled) setCompareLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedParticipantId]);

  const myRiders = useMemo(() => {
    if (!myTeam) return [];
    return [
      ...(myTeam.mainRiders || []).map((r) => ({ ...r, slotType: 'main' })),
      ...(myTeam.reserveRiders || []).map((r) => ({ ...r, slotType: 'reserve' })),
    ];
  }, [myTeam]);

  const compareRiders = useMemo(() => {
    if (!compareTeam) return [];
    return [
      ...(compareTeam.mainRiders || []).map((r) => ({ ...r, slotType: 'main' })),
      ...(compareTeam.reserveRiders || []).map((r) => ({ ...r, slotType: 'reserve' })),
    ];
  }, [compareTeam]);

  const myRiderIdSet = useMemo(() => new Set(myRiders.map((r) => r.id)), [myRiders]);

  function applyFilters(riders, { markShared }) {
    const sorted = [...(riders || [])].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

    return sorted.filter((r) => {
      const slotType = r.slotType || r.slot_type || 'main';
      const isActive = r.isActive !== false;
      const isShared = markShared ? myRiderIdSet.has(r.id) : false;

      if (slotType === 'main' && !filters.main) return false;
      if (slotType === 'reserve' && !filters.reserve) return false;
      if (!isActive && !filters.inactive) return false;
      if (isShared && !filters.shared) return false;
      return true;
    });
  }

  const myRidersFiltered = useMemo(() => applyFilters(myRiders, { markShared: false }), [myRiders, filters]);
  const compareRidersFiltered = useMemo(
    () => applyFilters(compareRiders, { markShared: true }),
    [compareRiders, filters, myRiderIdSet]
  );

  const showFilters = Boolean(selectedParticipantId);
  const showComparison = Boolean(selectedParticipantId) && Boolean(compareTeam);

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
                    navigate('/teamoverzicht.html');
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
                <h1 className="welcome-heading">Team Vergelijken</h1>
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
          <div className="sidebar col-3">
            <div className="action-buttons">
              <button
                className="action-button"
                aria-label="Bekijk spelregels"
                type="button"
                onClick={() => navigate('/rules.html')}
              >
                <span>Spelregels</span>
                <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
              </button>
              <button
                className="action-button"
                aria-label="Bekijk statistieken"
                type="button"
                onClick={() => navigate('/statistieken.html')}
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
            </div>
          </div>

          <div className="content-area col-9">
            <div className="team-compare-selection">
              <div className="team-compare-select-container">
                <label htmlFor="compare-team-select" className="team-compare-label">
                  Vergelijk met:
                </label>
                <div className="team-compare-select-wrapper">
                  <select
                    id="compare-team-select"
                    ref={selectRef}
                    className="team-compare-select"
                    disabled={loading}
                    value={selectedParticipantId}
                    onChange={(e) => setSelectedParticipantId(e.target.value)}
                  >
                    <option value="">{loading ? 'Gegevens aan het ophalen...' : 'Selecteer een team...'}</option>
                    {!loading
                      ? dropdownOptions.map((opt) => (
                          <option
                            key={opt.participantId}
                            value={opt.participantId}
                            data-avatar-url={opt.avatarUrl}
                            data-team-name={opt.label}
                          >
                            {opt.label}
                          </option>
                        ))
                      : null}
                  </select>

                  <div
                    className={`team-compare-select-display${loading ? ' loading' : ''}`}
                    id="team-compare-select-display"
                    onClick={() => {
                      if (loading) return;
                      selectRef.current?.focus();
                      selectRef.current?.click();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (loading) return;
                        selectRef.current?.focus();
                        selectRef.current?.click();
                      }
                    }}
                  >
                    <span className="team-compare-select-text">{selectDisplayText}</span>
                    <img
                      src="/assets/arrow.svg"
                      alt=""
                      className="team-compare-select-arrow"
                      aria-hidden="true"
                      style={{ display: loading ? 'none' : 'block' }}
                    />
                  </div>
                </div>
              </div>

              <div
                className="team-compare-filters-container"
                id="team-compare-filters-container"
                style={{ display: showFilters ? 'block' : 'none' }}
              >
                <div className="team-compare-filters">
                  <label className="team-compare-filter-label">
                    <input
                      type="checkbox"
                      className="team-compare-filter-checkbox"
                      id="filter-main-riders"
                      checked={filters.main}
                      onChange={(e) => setFilters((f) => ({ ...f, main: e.target.checked }))}
                    />
                    <span>Basisrenners</span>
                  </label>
                  <label className="team-compare-filter-label">
                    <input
                      type="checkbox"
                      className="team-compare-filter-checkbox"
                      id="filter-reserve-riders"
                      checked={filters.reserve}
                      onChange={(e) => setFilters((f) => ({ ...f, reserve: e.target.checked }))}
                    />
                    <span>Reserverenners</span>
                  </label>
                  <label className="team-compare-filter-label">
                    <input
                      type="checkbox"
                      className="team-compare-filter-checkbox"
                      id="filter-inactive-riders"
                      checked={filters.inactive}
                      onChange={(e) => setFilters((f) => ({ ...f, inactive: e.target.checked }))}
                    />
                    <span>Heeft ronde verlaten</span>
                  </label>
                  <label className="team-compare-filter-label">
                    <input
                      type="checkbox"
                      className="team-compare-filter-checkbox"
                      id="filter-shared-riders"
                      checked={filters.shared}
                      onChange={(e) => setFilters((f) => ({ ...f, shared: e.target.checked }))}
                    />
                    <span>Gedeelde renners</span>
                  </label>
                </div>

                <div className="team-compare-legend">
                  <div className="team-compare-legend-title">Legenda:</div>
                  <div className="team-compare-legend-items">
                    <div className="team-compare-legend-item">
                      <div className="team-compare-legend-color team-compare-legend-reserve" />
                      <span>Reserverenner</span>
                    </div>
                    <div className="team-compare-legend-item">
                      <div className="team-compare-legend-color team-compare-legend-inactive" />
                      <span>Heeft ronde verlaten</span>
                    </div>
                    <div className="team-compare-legend-item">
                      <div className="team-compare-legend-color team-compare-legend-shared" />
                      <span>Gedeelde renner</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="team-compare-container"
              id="team-compare-container"
              style={{ display: showComparison ? 'block' : 'none' }}
            >
              <div className="team-compare-grid">
                <div className="team-compare-column">
                  <div className="team-compare-header">
                    <div className="team-compare-avatar-container" id="my-team-avatar-container">
                      {myTeam?.avatarUrl ? (
                        <img
                          id="my-team-avatar"
                          src={myTeam.avatarUrl}
                          alt="Avatar"
                          className="team-compare-avatar"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="team-compare-avatar-placeholder" id="my-team-avatar-placeholder">
                          {initialsFromName(myTeam?.teamName)}
                        </div>
                      )}
                    </div>
                    <h2 className="team-compare-title" id="my-team-name">
                      {myTeam?.teamName || 'Mijn Team'}
                    </h2>
                    <div className="team-compare-stats">
                      <div className="team-compare-stat">
                        <span className="team-compare-stat-label">Totaal punten</span>
                        <span className="team-compare-stat-value" id="my-team-points">
                          {myTeam?.totalPoints || 0}
                        </span>
                      </div>
                      <div className="team-compare-stat">
                        <span className="team-compare-stat-label">Ranking</span>
                        <span className="team-compare-stat-value" id="my-team-rank">
                          {myTeam?.rank ? `#${myTeam.rank}` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="team-compare-riders">
                    <div className="team-compare-riders-list" id="my-team-riders">
                      {loading ? (
                        <LoadingBlock />
                      ) : myRidersFiltered.length === 0 ? (
                        <p className="team-compare-no-riders">Geen renners geselecteerd</p>
                      ) : (
                        myRidersFiltered.map((r) => {
                          const slotType = r.slotType || 'main';
                          const isActive = r.isActive !== false;
                          const classes = ['team-compare-rider-item'];
                          if (slotType === 'reserve') classes.push('team-compare-rider-reserve');
                          if (!isActive) classes.push('team-compare-rider-inactive');

                          const name = `${r.firstName || ''} ${r.lastName || ''}`.trim();
                          const initials = riderInitials(r.firstName, r.lastName);

                          return (
                            <div
                              key={r.id}
                              className={classes.join(' ')}
                              data-slot-type={slotType}
                              data-is-active={String(isActive)}
                              data-is-shared="false"
                            >
                              <div className="team-compare-rider-avatar-container">
                                <RiderAvatar
                                  photoUrl={r.photoUrl || ''}
                                  alt={name}
                                  initials={initials}
                                  containerClassName="team-compare-rider-avatar-container"
                                  imgClassName="team-compare-rider-avatar"
                                  placeholderClassName="team-compare-rider-avatar-placeholder"
                                />
                              </div>

                              <div className="team-compare-rider-info">
                                <div className="team-compare-rider-header">
                                  <div className="team-compare-rider-name-wrapper">
                                    <div className="team-compare-rider-name">{name}</div>
                                    {slotType === 'reserve' ? (
                                      <span className="team-compare-rider-type-badge team-compare-rider-type-reserve">
                                        Reserve
                                      </span>
                                    ) : null}
                                  </div>
                                  {r.jerseys?.length ? (
                                    <div className="team-compare-rider-jerseys">
                                      {r.jerseys.map((j) => (
                                        <div
                                          key={`${r.id}-${j.type}-${j.name || ''}`}
                                          className="jersey-icon"
                                          title={j.name || j.type}
                                        >
                                          <img src={jerseyIconForType(j.type)} alt={j.name || j.type} />
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="team-compare-rider-team">{r.teamName}</div>
                                <div className="team-compare-rider-points">{r.totalPoints || 0} punten</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="team-compare-vs">
                  <span>VS</span>
                </div>

                <div className="team-compare-column">
                  <div className="team-compare-header">
                    <div className="team-compare-avatar-container" id="compare-team-avatar-container">
                      {compareTeam?.avatarUrl ? (
                        <img
                          id="compare-team-avatar"
                          src={compareTeam.avatarUrl}
                          alt="Avatar"
                          className="team-compare-avatar"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="team-compare-avatar-placeholder" id="compare-team-avatar-placeholder">
                          {initialsFromName(compareTeam?.teamName)}
                        </div>
                      )}
                    </div>
                    <h2 className="team-compare-title" id="compare-team-name">
                      {compareTeam?.teamName || 'Ander Team'}
                    </h2>
                    <div className="team-compare-stats">
                      <div className="team-compare-stat">
                        <span className="team-compare-stat-label">Totaal punten</span>
                        <span className="team-compare-stat-value" id="compare-team-points">
                          {compareTeam?.totalPoints || 0}
                        </span>
                      </div>
                      <div className="team-compare-stat">
                        <span className="team-compare-stat-label">Ranking</span>
                        <span className="team-compare-stat-value" id="compare-team-rank">
                          {compareTeam?.rank ? `#${compareTeam.rank}` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="team-compare-riders">
                    <div className="team-compare-riders-list" id="compare-team-riders">
                      {compareLoading ? (
                        <LoadingBlock />
                      ) : compareRidersFiltered.length === 0 ? (
                        <p className="team-compare-no-riders">Geen renners geselecteerd</p>
                      ) : (
                        compareRidersFiltered.map((r) => {
                          const slotType = r.slotType || 'main';
                          const isActive = r.isActive !== false;
                          const isShared = myRiderIdSet.has(r.id);

                          const classes = ['team-compare-rider-item'];
                          if (slotType === 'reserve') classes.push('team-compare-rider-reserve');
                          if (!isActive) classes.push('team-compare-rider-inactive');
                          if (isShared) classes.push('team-compare-rider-shared');

                          const name = `${r.firstName || ''} ${r.lastName || ''}`.trim();
                          const initials = riderInitials(r.firstName, r.lastName);

                          return (
                            <div
                              key={r.id}
                              className={classes.join(' ')}
                              data-slot-type={slotType}
                              data-is-active={String(isActive)}
                              data-is-shared={String(isShared)}
                            >
                              <div className="team-compare-rider-avatar-container">
                                <RiderAvatar
                                  photoUrl={r.photoUrl || ''}
                                  alt={name}
                                  initials={initials}
                                  containerClassName="team-compare-rider-avatar-container"
                                  imgClassName="team-compare-rider-avatar"
                                  placeholderClassName="team-compare-rider-avatar-placeholder"
                                />
                              </div>

                              <div className="team-compare-rider-info">
                                <div className="team-compare-rider-header">
                                  <div className="team-compare-rider-name-wrapper">
                                    <div className="team-compare-rider-name">{name}</div>
                                    {slotType === 'reserve' ? (
                                      <span className="team-compare-rider-type-badge team-compare-rider-type-reserve">
                                        Reserve
                                      </span>
                                    ) : null}
                                  </div>
                                  {r.jerseys?.length ? (
                                    <div className="team-compare-rider-jerseys">
                                      {r.jerseys.map((j) => (
                                        <div
                                          key={`${r.id}-${j.type}-${j.name || ''}`}
                                          className="jersey-icon"
                                          title={j.name || j.type}
                                        >
                                          <img src={jerseyIconForType(j.type)} alt={j.name || j.type} />
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="team-compare-rider-team">{r.teamName}</div>
                                <div className="team-compare-rider-points">{r.totalPoints || 0} punten</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="team-compare-empty"
              id="team-compare-empty"
              style={{ display: showComparison ? 'none' : 'block' }}
            >
              {loading ? <LoadingBlock /> : <p>Selecteer een team om te vergelijken met jouw team.</p>}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
