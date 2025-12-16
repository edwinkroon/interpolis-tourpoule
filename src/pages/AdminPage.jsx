import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getUserId } from '../utils/auth0';
import { LoadingBlock } from '../components/LoadingBlock';
import { Tile } from '../components/Tile';

function stageTitle(stage) {
  return `Etappe ${stage?.stage_number || ''}`.trim();
}

// Convert YYYY-MM-DD to dd-mm-yyyy
function formatDateToDutch(dateString) {
  if (!dateString) return '';
  // Handle datetime format: YYYY-MM-DD HH:MM:SS
  const [datePart, timePart] = dateString.split(' ');
  if (!datePart) return '';
  
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return dateString; // Return original if format is unexpected
  
  return timePart ? `${day}-${month}-${year} ${timePart}` : `${day}-${month}-${year}`;
}

// Convert dd-mm-yyyy to YYYY-MM-DD
function formatDateFromDutch(dateString) {
  if (!dateString) return '';
  // Handle datetime format: dd-mm-yyyy HH:MM:SS
  const [datePart, timePart] = dateString.split(' ');
  if (!datePart) return '';
  
  const [day, month, year] = datePart.split('-');
  if (!year || !month || !day) return dateString; // Return original if format is unexpected
  
  return timePart ? `${year}-${month}-${day} ${timePart}` : `${year}-${month}-${day}`;
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
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState({ type: null, text: '' });
  const [activatingReserves, setActivatingReserves] = useState(false);
  const [activateReservesMessage, setActivateReservesMessage] = useState({ type: null, text: '' });

  const [masterdataTables, setMasterdataTables] = useState({
    awards: false,
    jerseys: false,
    scoring_rules: false,
    stages: false,
    teams_pro: false,
    riders: false,
  });
  const [populatingMasterdata, setPopulatingMasterdata] = useState(false);
  const [populateMasterdataMessage, setPopulateMasterdataMessage] = useState({ type: null, text: '' });
  const [masterdata, setMasterdata] = useState(null);

  const [dummyTeamCount, setDummyTeamCount] = useState(5);
  const [creatingDummyTeams, setCreatingDummyTeams] = useState(false);
  const [dummyTeamsMessage, setDummyTeamsMessage] = useState({ type: null, text: '' });

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

      const [settingsRes, stagesRes, masterdataRes] = await Promise.all([
        api.getSettings(),
        api.getStages(),
        api.getMasterdata(),
      ]);
      if (cancelled) return;

      if (settingsRes?.ok && settingsRes.settings) {
        setSettings(settingsRes.settings);
        setDeadline(formatDateToDutch(settingsRes.settings.registration_deadline?.value || ''));
        setTourStart(formatDateToDutch(settingsRes.settings.tour_start_date?.value || ''));
        setTourEnd(formatDateToDutch(settingsRes.settings.tour_end_date?.value || ''));
      }

      setStages(stagesRes?.ok && Array.isArray(stagesRes.stages) ? stagesRes.stages : []);
      
      if (masterdataRes?.ok && masterdataRes.masterdata) {
        setMasterdata(masterdataRes.masterdata);
      }
      
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
      setDeadline(formatDateToDutch(settingsRes.settings.registration_deadline?.value || ''));
      setTourStart(formatDateToDutch(settingsRes.settings.tour_start_date?.value || ''));
      setTourEnd(formatDateToDutch(settingsRes.settings.tour_end_date?.value || ''));
    }

    setStages(stagesRes?.ok && Array.isArray(stagesRes.stages) ? stagesRes.stages : []);
  }

  async function onSaveSettings() {
    if (!userId) return;

    setSavingSettings(true);
    setSettingsMessage({ type: null, text: '' });

    try {
      const settingsToSave = {};
      if (deadline?.trim()) settingsToSave.registration_deadline = formatDateFromDutch(deadline.trim());
      if (tourStart?.trim()) settingsToSave.tour_start_date = formatDateFromDutch(tourStart.trim());
      if (tourEnd?.trim()) settingsToSave.tour_end_date = formatDateFromDutch(tourEnd.trim());

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

  async function onResetAllStageData() {
    if (!userId) return;

    // Confirmation dialog
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      'Weet je zeker dat je alle etapperesultaten wilt resetten?\n\n' +
      'Dit zal verwijderen:\n' +
      '- Alle etapperesultaten\n' +
      '- Alle berekende punten\n' +
      '- Alle awards\n' +
      '- Alle truidragers\n\n' +
      'Deze actie kan niet ongedaan worden gemaakt!'
    );

    if (!confirmed) return;

    setResetting(true);
    setResetMessage({ type: null, text: '' });

    try {
      const res = await api.resetAllStageData(userId);
      if (!res?.ok) throw new Error(res?.error || 'Fout bij resetten');

      setResetMessage({ type: 'success', text: 'Alle etapperesultaten zijn succesvol gereset!' });
      await reloadAdminData();
    } catch (e) {
      setResetMessage({ type: 'error', text: `Fout: ${e?.message || e}` });
    } finally {
      setResetting(false);
    }
  }

  async function onActivateReserves() {
    if (!userId) return;

    // Confirmation dialog
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      'Weet je zeker dat je reserves wilt activeren voor alle teams?\n\n' +
      'Dit zal voor elk team dat minder dan 10 actieve main riders heeft, ' +
      'automatisch reserves activeren tot er 10 actieve main riders zijn.\n\n' +
      'Deze actie kan niet ongedaan worden gemaakt!'
    );

    if (!confirmed) return;

    setActivatingReserves(true);
    setActivateReservesMessage({ type: null, text: '' });

    try {
      const res = await api.activateReserves(null, true);
      if (!res?.ok) throw new Error(res?.error || 'Fout bij activeren reserves');

      const message = res.totalReservesActivated > 0
        ? `Reserves geactiveerd voor ${res.teams?.length || 0} team(s). Totaal ${res.totalReservesActivated} reserve(s) geactiveerd.`
        : 'Geen reserves geactiveerd. Alle teams hebben al 10 actieve main riders.';
      
      setActivateReservesMessage({ type: 'success', text: message });
    } catch (e) {
      setActivateReservesMessage({ type: 'error', text: `Fout: ${e?.message || e}` });
    } finally {
      setActivatingReserves(false);
    }
  }

  async function onPopulateMasterdata() {
    if (!userId) return;

    // Check if at least one table is selected
    const selectedTables = Object.entries(masterdataTables).filter(([_, selected]) => selected);
    if (selectedTables.length === 0) {
      setPopulateMasterdataMessage({ type: 'error', text: 'Selecteer ten minste één tabel om te vullen.' });
      return;
    }

    // Confirmation dialog
    const tableNames = {
      awards: 'Awards',
      jerseys: 'Jerseys',
      scoring_rules: 'Scoring Rules',
      stages: 'Stages',
      teams_pro: 'Teams Pro',
      riders: 'Riders',
    };
    const selectedTableNames = selectedTables.map(([key]) => tableNames[key] || key).join(', ');
    
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      `Weet je zeker dat je de volgende stamtabellen wilt vullen?\n\n` +
      `${selectedTableNames}\n\n` +
      `Deze actie zal de geselecteerde tabellen vullen met masterdata.`
    );

    if (!confirmed) return;

    setPopulatingMasterdata(true);
    setPopulateMasterdataMessage({ type: null, text: '' });

    try {
      const res = await api.populateMasterdata(userId, masterdataTables);
      if (!res?.ok) throw new Error(res?.error || 'Fout bij vullen stamtabellen');

      // Build success message
      const results = res.results || {};
      const successMessages = [];
      const errorMessages = [];

      Object.entries(results).forEach(([table, result]) => {
        if (result.success) {
          successMessages.push(`${tableNames[table] || table}: ${result.count || 0} records`);
        } else {
          errorMessages.push(`${tableNames[table] || table}: ${result.error || 'Onbekende fout'}`);
        }
      });

      let message = '';
      if (successMessages.length > 0) {
        message += 'Succesvol gevuld:\n' + successMessages.join('\n');
      }
      if (errorMessages.length > 0) {
        message += (message ? '\n\n' : '') + 'Fouten:\n' + errorMessages.join('\n');
      }

      setPopulateMasterdataMessage({
        type: errorMessages.length > 0 ? 'error' : 'success',
        text: message || 'Stamtabellen gevuld.'
      });

      // Reload masterdata
      const masterdataRes = await api.getMasterdata();
      if (masterdataRes?.ok && masterdataRes.masterdata) {
        setMasterdata(masterdataRes.masterdata);
      }

      // Reload stages if stages were populated
      if (masterdataTables.stages) {
        await reloadAdminData();
      }
    } catch (e) {
      setPopulateMasterdataMessage({ type: 'error', text: `Fout: ${e?.message || e}` });
    } finally {
      setPopulatingMasterdata(false);
    }
  }

  async function onCreateDummyTeams() {
    if (!userId) return;

    if (!dummyTeamCount || dummyTeamCount < 1 || dummyTeamCount > 50) {
      setDummyTeamsMessage({ type: 'error', text: 'Aantal teams moet tussen 1 en 50 zijn.' });
      return;
    }

    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      `Weet je zeker dat je ${dummyTeamCount} dummy team(s) wilt aanmaken?\n\n` +
      `Dit zal aanmaken:\n` +
      `- ${dummyTeamCount} participant(s)\n` +
      `- ${dummyTeamCount} fantasy team(s)\n` +
      `- ${dummyTeamCount * 15} team rider(s) (10 main + 5 reserve per team)\n` +
      `- Verschillende truien per team\n\n` +
      `Deze functie werkt alleen als er nog geen etappes zijn gereden.`
    );

    if (!confirmed) return;

    setCreatingDummyTeams(true);
    setDummyTeamsMessage({ type: null, text: '' });

    try {
      const res = await api.createDummyTeams(userId, dummyTeamCount);
      if (!res?.ok) throw new Error(res?.error || 'Fout bij aanmaken dummy teams');

      setDummyTeamsMessage({
        type: 'success',
        text: res.message || `${dummyTeamCount} dummy team(s) succesvol aangemaakt.`
      });
    } catch (e) {
      setDummyTeamsMessage({ type: 'error', text: `Fout: ${e?.message || e}` });
    } finally {
      setCreatingDummyTeams(false);
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
          {loading ? (
            <div className="col-12">
              <div id="admin-loading" className="admin-loading">
                <p>Laden...</p>
              </div>
            </div>
          ) : null}

          {!loading && accessDenied ? (
            <div className="col-12">
              <div id="admin-access-denied" className="admin-access-denied" style={{ display: 'block' }}>
                <div className="admin-error-message">
                  <h2>Toegang geweigerd</h2>
                  <p>Je hebt geen admin rechten om deze pagina te bekijken.</p>
                </div>
              </div>
            </div>
          ) : null}

          {!loading && !accessDenied ? (
            <>
              {error ? (
                <div className="col-12">
                  <div className="admin-loading" style={{ color: 'red' }}>
                    {String(error?.message || error)}
                  </div>
                </div>
              ) : null}

              <div className="col-6">
                <Tile
                  className="admin-settings-tile"
                  title="Instellingen"
                  info={{
                    text: 'Beheer hier de algemene instellingen van het tourspel, zoals de aanmeldingsdeadline en de start- en einddatum van de Tour de France.',
                  }}
                >
                  <div className="admin-settings-form">
                    <div className="admin-setting-item">
                      <label htmlFor="deadline-setting" className="admin-setting-label">
                        Aanmeldingsdeadline
                        <span className="admin-setting-description">Deadline voor aanmeldingen (dd-mm-yyyy HH:MM:SS)</span>
                      </label>
                      <input
                        type="text"
                        id="deadline-setting"
                        className="admin-setting-input"
                        placeholder="05-07-2025 12:00:00"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                      />
                    </div>

                    <div className="admin-setting-item">
                      <label htmlFor="tour-start-setting" className="admin-setting-label">
                        Tour Startdatum
                        <span className="admin-setting-description">Startdatum van de Tour de France (dd-mm-yyyy)</span>
                      </label>
                      <input
                        type="text"
                        id="tour-start-setting"
                        className="admin-setting-input"
                        placeholder="06-07-2025"
                        value={tourStart}
                        onChange={(e) => setTourStart(e.target.value)}
                      />
                    </div>

                    <div className="admin-setting-item">
                      <label htmlFor="tour-end-setting" className="admin-setting-label">
                        Tour Einddatum
                        <span className="admin-setting-description">Einddatum van de Tour de France (dd-mm-yyyy)</span>
                      </label>
                      <input
                        type="text"
                        id="tour-end-setting"
                        className="admin-setting-input"
                        placeholder="27-07-2025"
                        value={tourEnd}
                        onChange={(e) => setTourEnd(e.target.value)}
                      />
                    </div>

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
                  <footer className="tile-actions">
                    <button
                      id="save-settings-button"
                      className="admin-button admin-button-primary"
                      type="button"
                      onClick={onSaveSettings}
                      disabled={savingSettings}
                    >
                      <span>{savingSettings ? 'Opslaan...' : 'Instellingen opslaan'}</span>
                    </button>
                  </footer>
                </Tile>

                <div style={{ marginTop: '2rem' }}>
                  <Tile
                    className="admin-populate-masterdata-tile"
                    title="Vul stamtabellen"
                    info={{
                      text: 'Vul de stamtabellen (awards, jerseys, scoring_rules, stages, teams_pro, riders) met masterdata. Selecteer welke tabellen je wilt vullen. De huidige data wordt gebruikt als de tabellen leeg zijn.',
                    }}
                  >
                    <div style={{ marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '14px', color: '#668494', lineHeight: '1.6', marginBottom: '1rem' }}>
                        Selecteer welke stamtabellen je wilt vullen:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <label className="admin-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            className="admin-checkbox"
                            checked={masterdataTables.awards}
                            disabled={populatingMasterdata}
                            onChange={(e) => setMasterdataTables({ ...masterdataTables, awards: e.target.checked })}
                          />
                          <span>Awards ({masterdata?.awards?.length || 0} records)</span>
                        </label>
                        <label className="admin-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            className="admin-checkbox"
                            checked={masterdataTables.jerseys}
                            disabled={populatingMasterdata}
                            onChange={(e) => setMasterdataTables({ ...masterdataTables, jerseys: e.target.checked })}
                          />
                          <span>Jerseys ({masterdata?.jerseys?.length || 0} records)</span>
                        </label>
                        <label className="admin-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            className="admin-checkbox"
                            checked={masterdataTables.scoring_rules}
                            disabled={populatingMasterdata}
                            onChange={(e) => setMasterdataTables({ ...masterdataTables, scoring_rules: e.target.checked })}
                          />
                          <span>Scoring Rules ({masterdata?.scoring_rules?.length || 0} records)</span>
                        </label>
                        <label className="admin-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            className="admin-checkbox"
                            checked={masterdataTables.stages}
                            disabled={populatingMasterdata}
                            onChange={(e) => setMasterdataTables({ ...masterdataTables, stages: e.target.checked })}
                          />
                          <span>Stages ({masterdata?.stages?.length || 0} records)</span>
                        </label>
                        <label className="admin-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            className="admin-checkbox"
                            checked={masterdataTables.teams_pro}
                            disabled={populatingMasterdata}
                            onChange={(e) => setMasterdataTables({ ...masterdataTables, teams_pro: e.target.checked })}
                          />
                          <span>Teams Pro ({masterdata?.teams_pro?.length || 0} records)</span>
                        </label>
                        <label className="admin-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            className="admin-checkbox"
                            checked={masterdataTables.riders}
                            disabled={populatingMasterdata}
                            onChange={(e) => setMasterdataTables({ ...masterdataTables, riders: e.target.checked })}
                          />
                          <span>Riders ({masterdata?.riders?.length || 0} records)</span>
                        </label>
                      </div>
                    </div>

                    <div
                      className={
                        populateMasterdataMessage.type === 'success'
                          ? 'admin-message admin-message-success'
                          : populateMasterdataMessage.type === 'error'
                          ? 'admin-message admin-message-error'
                          : 'admin-message'
                      }
                      style={{ 
                        display: populateMasterdataMessage.text ? 'block' : 'none',
                        whiteSpace: 'pre-line',
                        marginBottom: '1rem'
                      }}
                    >
                      {populateMasterdataMessage.text}
                    </div>

                    <footer className="tile-actions">
                      <button
                        className="admin-button admin-button-primary"
                        type="button"
                        onClick={onPopulateMasterdata}
                        disabled={populatingMasterdata}
                      >
                        <span>{populatingMasterdata ? 'Bezig met vullen...' : 'Vul geselecteerde tabellen'}</span>
                      </button>
                    </footer>
                  </Tile>
                </div>

                <div style={{ marginTop: '2rem' }}>
                  <Tile
                    className="admin-create-dummy-teams-tile"
                    title="Maak dummy teams"
                    info={{
                      text: 'Maak volledig gevulde dummy teams aan voor testdoeleinden. Deze functie vult fantasy_teams, fantasy_team_riders en fantasy_team_jerseys. Werkt alleen als er nog geen etappes zijn gereden.',
                    }}
                  >
                    <div style={{ marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '14px', color: '#668494', lineHeight: '1.6', marginBottom: '1rem' }}>
                        Aantal dummy teams om aan te maken:
                      </p>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={dummyTeamCount}
                        onChange={(e) => setDummyTeamCount(parseInt(e.target.value) || 1)}
                        disabled={creatingDummyTeams}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          fontSize: '14px',
                          border: '1px solid #ccc',
                          borderRadius: '4px'
                        }}
                      />
                      <p style={{ fontSize: '12px', color: '#999', marginTop: '0.5rem' }}>
                        Per team: 10 basisrenners, 5 reserve renners, en alle 4 truien
                      </p>
                    </div>

                    <div
                      className={
                        dummyTeamsMessage.type === 'success'
                          ? 'admin-message admin-message-success'
                          : dummyTeamsMessage.type === 'error'
                          ? 'admin-message admin-message-error'
                          : 'admin-message'
                      }
                      style={{ 
                        display: dummyTeamsMessage.text ? 'block' : 'none',
                        whiteSpace: 'pre-line',
                        marginBottom: '1rem'
                      }}
                    >
                      {dummyTeamsMessage.text}
                    </div>

                    <footer className="tile-actions">
                      <button
                        className="admin-button admin-button-primary"
                        type="button"
                        onClick={onCreateDummyTeams}
                        disabled={creatingDummyTeams}
                      >
                        <span>{creatingDummyTeams ? 'Bezig met aanmaken...' : 'Maak dummy teams aan'}</span>
                      </button>
                    </footer>
                  </Tile>
                </div>

                <div style={{ marginTop: '2rem' }}>
                  <Tile
                    className="admin-activate-reserves-tile"
                    title="Activeer reserves"
                    info={{
                      text: 'Activeer automatisch reserves voor alle teams die minder dan 10 actieve main riders hebben. Dit vult teams aan tot 10 actieve main riders door reserves te activeren.',
                    }}
                  >
                    <div style={{ marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '14px', color: '#668494', lineHeight: '1.6', marginBottom: '1rem' }}>
                        Deze actie zal:
                      </p>
                      <ul style={{ fontSize: '14px', color: '#668494', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                        <li>Voor elk team controleren hoeveel actieve main riders er zijn</li>
                        <li>Reserves activeren tot elk team 10 actieve main riders heeft</li>
                        <li>Reserves worden geactiveerd in volgorde van slot_number</li>
                      </ul>
                    </div>

                    <div
                      className={
                        activateReservesMessage.type === 'success'
                          ? 'admin-message admin-message-success'
                          : activateReservesMessage.type === 'error'
                          ? 'admin-message admin-message-error'
                          : 'admin-message'
                      }
                      style={{ display: activateReservesMessage.text ? 'block' : 'none' }}
                    >
                      {activateReservesMessage.text}
                    </div>

                    <footer className="tile-actions">
                      <button
                        className="admin-button"
                        type="button"
                        onClick={onActivateReserves}
                        disabled={activatingReserves}
                      >
                        <span>{activatingReserves ? 'Bezig met activeren...' : 'Activeer reserves voor alle teams'}</span>
                      </button>
                    </footer>
                  </Tile>
                </div>

                <div style={{ marginTop: '2rem' }}>
                  <Tile
                    className="admin-reset-tile"
                    title="Reset etapperesultaten"
                    info={{
                      text: 'Reset alle etapperesultaten, berekende punten, awards en truidragers. Dit is een destructieve actie die niet ongedaan kan worden gemaakt. Gebruik dit alleen als je opnieuw wilt beginnen vanaf de eerste etappe.',
                    }}
                  >
                    <div style={{ marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '14px', color: '#668494', lineHeight: '1.6', marginBottom: '1rem' }}>
                        Deze actie zal alle volgende data verwijderen:
                      </p>
                      <ul style={{ fontSize: '14px', color: '#668494', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                        <li>Alle etapperesultaten</li>
                        <li>Alle berekende punten (etappe- en cumulatieve punten)</li>
                        <li>Alle toegekende awards</li>
                        <li>Alle truidragers per etappe</li>
                      </ul>
                    </div>

                    <div
                      className={
                        resetMessage.type === 'success'
                          ? 'admin-message admin-message-success'
                          : resetMessage.type === 'error'
                          ? 'admin-message admin-message-error'
                          : 'admin-message'
                      }
                      style={{ display: resetMessage.text ? 'block' : 'none' }}
                    >
                      {resetMessage.text}
                    </div>

                    <footer className="tile-actions">
                      <button
                        className="admin-button admin-button-danger"
                        type="button"
                        onClick={onResetAllStageData}
                        disabled={resetting}
                      >
                        <span>{resetting ? 'Bezig met resetten...' : 'Reset alle etapperesultaten'}</span>
                      </button>
                    </footer>
                  </Tile>
                </div>
              </div>

              <div className="col-6">
                <Tile
                  className="admin-add-stage-tile"
                  title="Etappe toevoegen"
                  info={{
                    text: 'Voeg een nieuwe etappe toe aan de Tour de France. Gebruik de ProCyclingStats website om de etappegegevens te vinden.',
                  }}
                  actions={
                    <button
                      type="button"
                      className="admin-button admin-button-primary"
                      onClick={() => navigate('/etappetoevoegen.html')}
                    >
                      <span>Etappe toevoegen</span>
                    </button>
                  }
                >
                  <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '14px', color: '#668494', lineHeight: '1.6' }}>
                      Klik op de knop hierboven om naar de etappe toevoegen pagina te gaan waar je een nieuwe etappe kunt toevoegen en de resultaten kunt uploaden.
                    </p>
                  </div>
                </Tile>

                <div style={{ marginTop: '2rem' }}>
                  <Tile
                    className="admin-stages-tile"
                    title="Etappe beheer"
                    info={{
                      text: 'Beheer hier de etappes van de Tour de France. Je kunt etappes markeren als geneutraliseerd of vervallen.',
                    }}
                  >
                    <div id="stages-list" className="admin-stages-list tile-list">
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
                                <div className="admin-stage-route">
                                  {!s.start_location && !s.end_location ? (
                                    'Rustdag'
                                  ) : s.start_location && s.end_location ? (
                                    `${s.start_location} - ${s.end_location}`
                                  ) : s.start_location || s.end_location ? (
                                    s.start_location || s.end_location
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
                  </Tile>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
