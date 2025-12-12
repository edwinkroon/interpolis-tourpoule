import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getUserId } from '../utils/auth0';
import { LoadingBlock } from '../components/LoadingBlock';

function stageTitle(stage) {
  return stage?.name || `Etappe ${stage?.stage_number || ''}`.trim();
}

export function AdminPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState(null);

  const [userId, setUserId] = useState(null);

  const [settings, setSettings] = useState(null);
  const [deadline, setDeadline] = useState('');
  const [tourStart, setTourStart] = useState('');
  const [tourEnd, setTourEnd] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState({ type: null, text: '' });

  const [stages, setStages] = useState([]);
  const [stageUpdatingIds, setStageUpdatingIds] = useState(() => new Set());

  // init (kept without escaped \n)
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const id = await getUserId();
      if (cancelled) return;
      setUserId(id);

      const adminRes = await api.checkAdmin(id);
      if (!adminRes?.ok || !adminRes?.isAdmin) {
        if (!cancelled) {
          setAccessDenied(true);
          setLoading(false);
        }
        return;
      }

      const [settingsRes, stagesRes] = await Promise.all([api.getSettings(), api.getStages()]);
      if (cancelled) return;

      if (settingsRes?.ok && settingsRes.settings) {
        setSettings(settingsRes.settings);
        setDeadline(settingsRes.settings.registration_deadline?.value || '');
        setTourStart(settingsRes.settings.tour_start_date?.value || '');
        setTourEnd(settingsRes.settings.tour_end_date?.value || '');
      }

      setStages(stagesRes?.ok && Array.isArray(stagesRes.stages) ? stagesRes.stages : []);
      setLoading(false);
    })().catch((e) => {
      if (!cancelled) {
        setError(e);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedStages = useMemo(() => {
    return [...(stages || [])].sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
  }, [stages]);

  async function reloadAdminData() {
    const [settingsRes, stagesRes] = await Promise.all([api.getSettings(), api.getStages()]);

    if (settingsRes?.ok && settingsRes.settings) {
      setSettings(settingsRes.settings);
      setDeadline(settingsRes.settings.registration_deadline?.value || '');
      setTourStart(settingsRes.settings.tour_start_date?.value || '');
      setTourEnd(settingsRes.settings.tour_end_date?.value || '');
    }

    setStages(stagesRes?.ok && Array.isArray(stagesRes.stages) ? stagesRes.stages : []);
  }

  async function onSaveSettings() {
    if (!userId) return;

    setSavingSettings(true);
    setSettingsMessage({ type: null, text: '' });

    try {
      const settingsToSave = {};
      if (deadline?.trim()) settingsToSave.registration_deadline = deadline.trim();
      if (tourStart?.trim()) settingsToSave.tour_start_date = tourStart.trim();
      if (tourEnd?.trim()) settingsToSave.tour_end_date = tourEnd.trim();

      const res = await api.saveSettings({ userId, settings: settingsToSave });
      if (!res?.ok) throw new Error(res?.error || 'Fout bij opslaan');

      setSettingsMessage({ type: 'success', text: 'Instellingen opgeslagen!' });
      await reloadAdminData();
    } catch (e) {
      setSettingsMessage({ type: 'error', text: `Fout: ${e?.message || e}` });
    } finally {
      setSavingSettings(false);
    }
  }

  async function onToggleStage(stage, field, nextValue) {
    if (!userId) return;

    const id = stage?.id;
    if (!id) return;

    const updating = new Set(stageUpdatingIds);
    updating.add(id);
    setStageUpdatingIds(updating);

    // optimistic update
    setStages((prev) =>
      (prev || []).map((s) => {
        if (s.id !== id) return s;
        if (field === 'is_neutralized') return { ...s, is_neutralized: nextValue };
        if (field === 'is_cancelled') return { ...s, is_cancelled: nextValue };
        return s;
      })
    );

    try {
      const payload = { userId, stageId: id };
      if (field === 'is_neutralized') payload.isNeutralized = nextValue;
      if (field === 'is_cancelled') payload.isCancelled = nextValue;

      const res = await api.updateStageStatus(payload);
      if (!res?.ok) throw new Error(res?.error || 'Fout bij bijwerken');

      const stagesRes = await api.getStages();
      setStages(stagesRes?.ok && Array.isArray(stagesRes.stages) ? stagesRes.stages : []);
    } catch (e) {
      setStages((prev) =>
        (prev || []).map((s) => {
          if (s.id !== id) return s;
          if (field === 'is_neutralized') return { ...s, is_neutralized: !nextValue };
          if (field === 'is_cancelled') return { ...s, is_cancelled: !nextValue };
          return s;
        })
      );
      // eslint-disable-next-line no-alert
      alert(`Fout bij bijwerken: ${e?.message || e}`);
    } finally {
      setStageUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

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
                    navigate('/home.html');
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
                <h1 className="welcome-heading">Admin Panel</h1>
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
          <div className="col-12">
            <div id="admin-container" className="admin-container">
              {loading ? (
                <div id="admin-loading" className="admin-loading">
                  <p>Laden...</p>
                </div>
              ) : null}

              {!loading && accessDenied ? (
                <div id="admin-access-denied" className="admin-access-denied" style={{ display: 'block' }}>
                  <div className="admin-error-message">
                    <h2>Toegang geweigerd</h2>
                    <p>Je hebt geen admin rechten om deze pagina te bekijken.</p>
                  </div>
                </div>
              ) : null}

              {!loading && !accessDenied ? (
                <div id="admin-content" className="admin-content" style={{ display: 'block' }}>
                  {error ? (
                    <div className="admin-loading" style={{ color: 'red' }}>
                      {String(error?.message || error)}
                    </div>
                  ) : null}

                  <section className="admin-section">
                    <h2 className="admin-section-title">Instellingen</h2>
                    <div className="admin-settings-form">
                      <div className="admin-setting-item">
                        <label htmlFor="deadline-setting" className="admin-setting-label">
                          Aanmeldingsdeadline
                          <span className="admin-setting-description">Deadline voor aanmeldingen (YYYY-MM-DD HH:MM:SS)</span>
                        </label>
                        <input
                          type="text"
                          id="deadline-setting"
                          className="admin-setting-input"
                          placeholder="2025-07-05 12:00:00"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                        />
                      </div>

                      <div className="admin-setting-item">
                        <label htmlFor="tour-start-setting" className="admin-setting-label">
                          Tour Startdatum
                          <span className="admin-setting-description">Startdatum van de Tour de France (YYYY-MM-DD)</span>
                        </label>
                        <input
                          type="text"
                          id="tour-start-setting"
                          className="admin-setting-input"
                          placeholder="2025-07-06"
                          value={tourStart}
                          onChange={(e) => setTourStart(e.target.value)}
                        />
                      </div>

                      <div className="admin-setting-item">
                        <label htmlFor="tour-end-setting" className="admin-setting-label">
                          Tour Einddatum
                          <span className="admin-setting-description">Einddatum van de Tour de France (YYYY-MM-DD)</span>
                        </label>
                        <input
                          type="text"
                          id="tour-end-setting"
                          className="admin-setting-input"
                          placeholder="2025-07-27"
                          value={tourEnd}
                          onChange={(e) => setTourEnd(e.target.value)}
                        />
                      </div>

                      <button
                        id="save-settings-button"
                        className="admin-button admin-button-primary"
                        type="button"
                        onClick={onSaveSettings}
                        disabled={savingSettings}
                      >
                        <span>{savingSettings ? 'Opslaan...' : 'Instellingen opslaan'}</span>
                      </button>

                      <div
                        id="settings-message"
                        className={
                          settingsMessage.type === 'success'
                            ? 'admin-message admin-message-success'
                            : settingsMessage.type === 'error'
                            ? 'admin-message admin-message-error'
                            : 'admin-message'
                        }
                      >
                        {settingsMessage.text}
                      </div>

                      {settings ? <div style={{ display: 'none' }} data-settings-loaded="true" /> : null}
                    </div>
                  </section>

                  <section className="admin-section">
                    <h2 className="admin-section-title">Etappes Beheer</h2>

                    <div id="stages-list" className="admin-stages-list">
                      {sortedStages.length === 0 ? (
                        <p className="admin-no-data">Geen etappes gevonden</p>
                      ) : (
                        sortedStages.map((s) => {
                          const updating = stageUpdatingIds.has(s.id);
                          const neutralized = Boolean(s.is_neutralized);
                          const cancelled = Boolean(s.is_cancelled);

                          return (
                            <div key={s.id} className="admin-stage-item">
                              <div className="admin-stage-info">
                                <h3 className="admin-stage-name">{stageTitle(s)}</h3>
                                <div className="admin-stage-details">
                                  <span className="admin-stage-number">Etappe {s.stage_number}</span>
                                  {s.start_location && s.end_location ? (
                                    <span className="admin-stage-route">
                                      {s.start_location} - {s.end_location}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <div className="admin-stage-controls" aria-busy={updating ? 'true' : 'false'}>
                                {updating ? <LoadingBlock /> : null}

                                <label className="admin-checkbox-label">
                                  <input
                                    type="checkbox"
                                    className="admin-checkbox"
                                    checked={neutralized}
                                    disabled={updating}
                                    onChange={(e) => onToggleStage(s, 'is_neutralized', e.target.checked)}
                                  />
                                  <span>Geneutraliseerd</span>
                                </label>

                                <label className="admin-checkbox-label">
                                  <input
                                    type="checkbox"
                                    className="admin-checkbox"
                                    checked={cancelled}
                                    disabled={updating}
                                    onChange={(e) => onToggleStage(s, 'is_cancelled', e.target.checked)}
                                  />
                                  <span>Vervallen</span>
                                </label>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
