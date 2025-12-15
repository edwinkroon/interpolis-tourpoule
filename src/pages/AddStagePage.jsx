import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getUserId } from '../utils/auth0';
import { LoadingBlock } from '../components/LoadingBlock';
import { Tile } from '../components/Tile';

function formatStageLabel(stage) {
  const name = stage?.name || '';
  const num = stage?.stage_number || stage?.stageNumber;
  if (num && name) return `Etappe ${num}: ${name}`;
  if (num) return `Etappe ${num}`;
  return name || 'Etappe';
}

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return '-';
  const s = Number(seconds);
  if (!Number.isFinite(s)) return '-';
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function riderOptionLabel(r) {
  const name = r?.name || '';
  const team = r?.teamName || '';
  return team ? `${name} (${team})` : name;
}

export function AddStagePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [stages, setStages] = useState([]);
  const [stageId, setStageId] = useState('');
  const [stageNumber, setStageNumber] = useState(null);

  const [resultsText, setResultsText] = useState('');
  const [unmatchedText, setUnmatchedText] = useState('');

  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState(null);

  const [jerseyData, setJerseyData] = useState(null);
  const [jerseyInputValues, setJerseyInputValues] = useState({ geel: '', groen: '', bolletjes: '', wit: '' });
  const [selectedJerseys, setSelectedJerseys] = useState({ geel: null, groen: null, bolletjes: null, wit: null });

  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importMessage, setImportMessage] = useState('De etappe uitslag is succesvol geïmporteerd naar de database.');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const userId = await getUserId();
      const [adminRes, stagesRes] = await Promise.all([api.checkAdmin(userId), api.getStagesWithoutResults()]);

      if (cancelled) return;

      setIsAdmin(Boolean(adminRes?.ok && adminRes?.isAdmin));
      setStages(stagesRes?.ok && Array.isArray(stagesRes.stages) ? stagesRes.stages : []);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedStage = useMemo(() => {
    const idNum = Number(stageId);
    return stages.find((s) => Number(s.id) === idNum) || null;
  }, [stages, stageId]);

  const previewResults = validation?.ok && validation?.valid && Array.isArray(validation?.results) ? validation.results : [];

  const jerseysRequiredSelected = useMemo(() => {
    return ['geel', 'groen', 'bolletjes', 'wit'].every((t) => selectedJerseys[t]?.riderId);
  }, [selectedJerseys]);

  function resetValidationAndImport() {
    setValidation(null);
    setJerseyData(null);
    setJerseyInputValues({ geel: '', groen: '', bolletjes: '', wit: '' });
    setSelectedJerseys({ geel: null, groen: null, bolletjes: null, wit: null });
    setImportSuccess(false);
    setImportMessage('De etappe uitslag is succesvol geïmporteerd naar de database.');
  }

  async function loadJerseysForStageNumber(sNum) {
    const res = await api.getStageJerseys(sNum);
    if (!res?.ok) throw new Error(res?.error || 'Fout bij laden van truien data');

    const jerseys = res.jerseys || [];
    const riders = res.riders || [];

    setJerseyData({ jerseys, riders });

    const nextInputValues = { geel: '', groen: '', bolletjes: '', wit: '' };
    const nextSelected = { geel: null, groen: null, bolletjes: null, wit: null };

    jerseys.forEach((j) => {
      const type = j.type;
      const defaultRiderId = j.defaultRiderId;
      const defaultRider = riders.find((r) => Number(r.id) === Number(defaultRiderId));

      if (!type) return;

      nextSelected[type] = { jerseyId: j.jerseyId, riderId: null, jerseyType: type };
      if (defaultRiderId && defaultRider) {
        nextInputValues[type] = riderOptionLabel(defaultRider);
        nextSelected[type] = { jerseyId: j.jerseyId, riderId: defaultRiderId, jerseyType: type };
      }
    });

    setJerseyInputValues(nextInputValues);
    setSelectedJerseys(nextSelected);
  }

  async function onValidate() {
    if (!stageId) {
      // eslint-disable-next-line no-alert
      alert('Selecteer eerst een etappe');
      return;
    }
    const text = resultsText.trim();
    if (!text) {
      // eslint-disable-next-line no-alert
      alert('Voer de uitslag in');
      return;
    }

    resetValidationAndImport();
    setIsValidating(true);

    const sNum = selectedStage?.stage_number ? Number(selectedStage.stage_number) : null;
    setStageNumber(sNum);

    try {
      const res = await api.validateStageResults({ stageId: Number(stageId), resultsText: text });

      if (res?.ok && res?.valid) {
        setValidation({ ok: true, valid: true, results: res.results || [], count: res.count || 0 });
        if (sNum) await loadJerseysForStageNumber(sNum);
      } else {
        setValidation({
          ok: false,
          valid: false,
          errors: res?.errors || [],
          validatedCount: res?.validatedCount,
          totalCount: res?.totalCount,
          unmatchedText: res?.unmatchedText || '',
        });
        setUnmatchedText(res?.unmatchedText || '');
      }
    } catch (e) {
      setValidation({ ok: false, valid: false, errors: [{ line: '?', content: '', error: String(e?.message || e) }] });
      // eslint-disable-next-line no-alert
      alert(`Er is een fout opgetreden bij het valideren: ${e?.message || e}`);
    } finally {
      setIsValidating(false);
    }
  }

  async function onRetryValidate() {
    const edited = unmatchedText.trim();
    if (!edited) {
      // eslint-disable-next-line no-alert
      alert('Geen tekst om opnieuw te valideren');
      return;
    }
    setResultsText(edited);
    await onValidate();
  }

  function onJerseyInputChange(type, value) {
    setJerseyInputValues((s) => ({ ...s, [type]: value }));

    const riders = jerseyData?.riders || [];
    const match = riders.find((r) => riderOptionLabel(r).toLowerCase() === String(value || '').trim().toLowerCase());

    setSelectedJerseys((s) => ({
      ...s,
      [type]: {
        ...(s[type] || {}),
        jerseyType: type,
        jerseyId: s[type]?.jerseyId || jerseyData?.jerseys?.find((j) => j.type === type)?.jerseyId || null,
        riderId: match ? match.id : null,
      },
    }));
  }

  async function onExport() {
    if (!validation?.ok || !validation?.valid || !Array.isArray(validation?.results) || validation.results.length === 0) {
      // eslint-disable-next-line no-alert
      alert('Geen gevalideerde resultaten om te exporteren');
      return;
    }
    if (!stageId) return;

    if (!jerseysRequiredSelected) {
      // eslint-disable-next-line no-alert
      alert('Selecteer alle 4 truien voordat je kunt exporteren');
      return;
    }

    const jerseysToImport = ['geel', 'groen', 'bolletjes', 'wit'].map((t) => ({
      jerseyType: t,
      jerseyId: selectedJerseys[t]?.jerseyId,
      riderId: selectedJerseys[t]?.riderId,
    }));

    setIsImporting(true);
    try {
      const res = await api.importStageResults({
        stageId: Number(stageId),
        results: validation.results.map((r) => ({ position: r.position, riderId: r.riderId, timeSeconds: r.timeSeconds })),
        jerseys: jerseysToImport,
      });

      if (res?.ok) {
        setImportMessage(
          res.replacedExisting
            ? `Uitslag succesvol geïmporteerd! ${res.existingCount} bestaande resultaten zijn overschreven.`
            : 'De etappe uitslag is succesvol geïmporteerd naar de database.'
        );
        setImportSuccess(true);

        setResultsText('');
        setUnmatchedText('');
        setStageId('');
        setStageNumber(null);
        setValidation(null);
        setJerseyData(null);
        setJerseyInputValues({ geel: '', groen: '', bolletjes: '', wit: '' });
        setSelectedJerseys({ geel: null, groen: null, bolletjes: null, wit: null });

        try {
          const stagesRes = await api.getStagesWithoutResults();
          setStages(stagesRes?.ok && Array.isArray(stagesRes.stages) ? stagesRes.stages : []);
        } catch {
          // ignore
        }

        window.setTimeout(() => navigate('/home.html'), 2000);
      } else {
        // eslint-disable-next-line no-alert
        alert(`Er is een fout opgetreden bij het importeren: ${res?.error || 'Onbekende fout'}`);
      }
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(`Er is een fout opgetreden bij het importeren: ${e?.message || e}`);
    } finally {
      setIsImporting(false);
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
                <h1 className="welcome-heading">Etappe Toevoegen</h1>
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
              <button className="action-button" aria-label="Bekijk spelregels" type="button" onClick={() => navigate('/rules.html')}>
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
                <button className="action-button" aria-label="Admin" type="button" onClick={() => navigate('/admin.html')}>
                  <span>Admin</span>
                  <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="content-area col-9">
            <Tile
              className="etappe-import-section"
              title="Nieuwe Etappe Uitslag Importeren"
              info={{
                title: 'Etappe import',
                text: 'Plak de uitslag (ProCyclingStats), valideer de renners en selecteer daarna de 4 truidragers. Vervolgens exporteer je naar de database.',
              }}
              actions={
                <>
                  <button
                    id="validate-button"
                    className="form-button form-button-primary"
                    aria-label="Valideren"
                    type="button"
                    onClick={onValidate}
                    disabled={!isAdmin || isValidating}
                  >
                    <span>{isValidating ? 'Bezig met valideren...' : 'Valideren'}</span>
                    <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                  </button>

                  {validation?.ok ? (
                    <button
                      id="export-button"
                      className="form-button form-button-primary"
                      aria-label="Export naar database"
                      type="button"
                      onClick={onExport}
                      disabled={!isAdmin || isImporting || !jerseysRequiredSelected}
                      title={!jerseysRequiredSelected ? 'Selecteer alle 4 truien voordat je kunt exporteren' : ''}
                      style={!jerseysRequiredSelected ? { opacity: 0.6 } : undefined}
                    >
                      <span>{isImporting ? 'Bezig met importeren...' : 'Export naar database'}</span>
                      <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                    </button>
                  ) : null}
                </>
              }
            >

              {!loading && !isAdmin ? (
                <div className="validation-errors" style={{ display: 'block' }}>
                  <div className="validation-errors-header">
                    <h3>Geen toegang</h3>
                    <p>Je bent niet gemachtigd om etappes te importeren.</p>
                  </div>
                </div>
              ) : null}

              <p className="etappe-form-description">
                Kopieer de uitslag van{' '}
                <a href="https://www.procyclingstats.com/race/tour-de-france/" target="_blank" rel="noopener noreferrer">
                  ProCyclingStats
                </a>{' '}
                en plak deze hieronder. Het tekstbestand heeft de volgende structuur: <strong>Rnk Rider Team UCI Pnt Time</strong>{' '}
                (gescheiden door tabs).
              </p>

              <div className="etappe-form-container">
                {loading ? <LoadingBlock /> : null}

                <div className="form-group">
                  <label htmlFor="stage-select" className="form-label">
                    Selecteer etappe:
                  </label>
                  <select
                    id="stage-select"
                    className="form-select"
                    aria-label="Selecteer etappe"
                    value={stageId}
                    onChange={(e) => {
                      setStageId(e.target.value);
                      setStageNumber(null);
                      resetValidationAndImport();
                    }}
                    disabled={!isAdmin || loading}
                  >
                    {!isAdmin ? (
                      <option value="">-- Alleen admins --</option>
                    ) : stages.length === 0 ? (
                      <option value="">-- Geen etappes zonder uitslag --</option>
                    ) : (
                      <>
                        <option value="">-- Selecteer etappe --</option>
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {formatStageLabel(s)}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="results-textarea" className="form-label">
                    Plak hier de uitslag van ProCyclingStats:
                  </label>
                  <textarea
                    id="results-textarea"
                    className="form-textarea"
                    rows={20}
                    placeholder={
                      'Plak hier de uitslag met tabs gescheiden, bijvoorbeeld:\n' +
                      '1\tJasper Philipsen\tAlpecin-Deceuninck\tBEL\t100\t\t3:53:11\n' +
                      '2\tBiniam Girmay\tIntermarché-Wanty\tERI\t50\t\t3:53:11\n' +
                      '...'
                    }
                    aria-label="Uitslag tekst invoer"
                    value={resultsText}
                    onChange={(e) => setResultsText(e.target.value)}
                    disabled={!isAdmin}
                  />
                  <small className="form-hint">
                    Formaat: Rnk [tab] Rider [tab] Team [tab] UCI [tab] Pnt [tab] [tab] Time (tabs gescheiden)
                  </small>
                </div>

                {/* actions moved to tile footer */}

                <div id="validation-results" className="validation-results" style={{ display: validation ? 'block' : 'none' }}>
                  <div id="validation-success" className="validation-success" style={{ display: validation?.ok ? 'block' : 'none' }}>
                    <div className="validation-success-icon">✓</div>
                    <div className="validation-success-message">
                      <h3>Validatie geslaagd!</h3>
                      <p>
                        Alle renners zijn succesvol gemapped. Controleer het overzicht hieronder en klik op "Export naar database" om
                        de data te importeren.
                      </p>
                    </div>
                  </div>

                  <div id="preview-section" className="preview-section" style={{ display: validation?.ok ? 'block' : 'none' }}>
                    <h3 className="preview-title">Preview: Data die geïmporteerd gaat worden</h3>
                    <div className="preview-table-container">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th>Pos</th>
                            <th>Renner</th>
                            <th>Tijd</th>
                          </tr>
                        </thead>
                        <tbody id="preview-table-body">
                          {previewResults.map((r) => (
                            <tr key={`${r.position}-${r.riderId}`}>
                              <td>{r.position}</td>
                              <td>{r.matchedName || `${r.firstName || ''} ${r.lastName || ''}`.trim()}</td>
                              <td>{formatTime(r.timeSeconds)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div
                      id="jersey-selection-section"
                      className="jersey-selection-section"
                      style={{ display: jerseyData ? 'block' : 'none' }}
                    >
                      <h3 className="preview-title">Truidragers voor deze etappe</h3>
                      <p className="etappe-form-description" style={{ marginBottom: '1rem' }}>
                        Selecteer de renners die de truien dragen na deze etappe. Deze informatie wordt gebruikt voor de puntentelling.
                      </p>

                      <div id="jersey-selection-container" className="jersey-selection-container">
                        {(jerseyData?.jerseys || []).map((j) => (
                          <div key={j.type} className="form-group">
                            <label className="form-label" htmlFor={`jersey-input-${j.type}`}>
                              {j.name} <span style={{ color: '#d32f2f' }}>*</span>
                            </label>

                            <div className="jersey-select-container" style={{ position: 'relative' }}>
                              <input
                                type="text"
                                id={`jersey-input-${j.type}`}
                                className="form-input jersey-search-input"
                                list={`jersey-datalist-${j.type}`}
                                placeholder="Typ om te zoeken en selecteer renner..."
                                required
                                value={jerseyInputValues[j.type] || ''}
                                onChange={(e) => onJerseyInputChange(j.type, e.target.value)}
                                disabled={isImporting}
                              />
                              <datalist id={`jersey-datalist-${j.type}`}>
                                {(jerseyData?.riders || []).map((r) => (
                                  <option key={r.id} value={riderOptionLabel(r)} />
                                ))}
                              </datalist>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* export moved to tile footer */}
                  </div>

                  <div
                    id="validation-errors"
                    className="validation-errors"
                    style={{ display: validation && !validation.ok ? 'block' : 'none' }}
                  >
                    <div className="validation-errors-header">
                      <h3>Validatie mislukt</h3>
                      <p>
                        De volgende renners konden niet gematcht worden met de database. Pas de namen aan en klik opnieuw op valideren:
                      </p>
                    </div>

                    <div id="validation-errors-list" className="validation-errors-list">
                      {(validation?.errors || []).map((err, idx) => (
                        <div key={`${idx}-${err.line}`} className="validation-error-item">
                          {err.line ? <div className="validation-error-line">Regel {err.line}:</div> : null}
                          {err.content ? <div className="validation-error-content">{err.content}</div> : null}
                          <div className="validation-error-message">{err.error || 'Onbekende fout'}</div>
                        </div>
                      ))}

                      {validation?.validatedCount !== undefined && validation?.totalCount !== undefined ? (
                        <div className="validation-error-summary">
                          Succesvol gevalideerd: {validation.validatedCount} van {validation.totalCount} renners
                        </div>
                      ) : null}
                    </div>

                    <div className="validation-errors-editable">
                      <label htmlFor="unmatched-results-textarea" className="form-label">
                        Bewerkbare lijst van niet-gematchte regels:
                      </label>
                      <textarea
                        id="unmatched-results-textarea"
                        className="form-textarea form-textarea-editable"
                        rows={10}
                        aria-label="Bewerkbare lijst van niet-gematchte renners"
                        value={unmatchedText}
                        onChange={(e) => setUnmatchedText(e.target.value)}
                        disabled={!isAdmin}
                      />
                      <div className="form-hint" style={{ marginTop: '0.75rem' }}>
                        Pas de tekst aan en klik daarna onderaan op <strong>Valideren</strong>.
                      </div>
                    </div>
                  </div>
                </div>

                <div id="import-success" className="import-success" style={{ display: importSuccess ? 'block' : 'none' }}>
                  <div className="validation-success-icon">✓</div>
                  <div className="validation-success-message import-success-message">
                    <h3>Import geslaagd!</h3>
                    <p>{importMessage}</p>
                  </div>
                </div>

                {stageNumber ? <div style={{ display: 'none' }} data-stage-number={stageNumber} /> : null}
              </div>
            </Tile>
          </div>
        </div>
      </main>
    </>
  );
}
