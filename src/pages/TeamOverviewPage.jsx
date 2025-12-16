import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserId } from '../utils/auth0';
import { api } from '../utils/api';
import { PageTemplate } from '../layouts/PageTemplate';
import { Tile } from '../components/Tile';
import { ListItem } from '../components/ListItem';
import { Modal } from '../components/Modal';
import { RiderAvatar } from '../components/RiderAvatar';

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

function initialsFromRider(firstName, lastName) {
  const first = (firstName || 'R')[0];
  const last = (lastName || 'R')[0];
  return `${first}${last}`.toUpperCase();
}

export function TeamOverviewPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [teamRiders, setTeamRiders] = useState([]);
  const [teamJerseys, setTeamJerseys] = useState([]);
  const [allRiders, setAllRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [addRidersModalOpen, setAddRidersModalOpen] = useState(false);
  const [removeRidersModalOpen, setRemoveRidersModalOpen] = useState(false);
  const [assignJerseysModalOpen, setAssignJerseysModalOpen] = useState(false);
  const [riderModalType, setRiderModalType] = useState(null); // 'main' or 'reserve'
  
  // Selection states
  const [selectedRiders, setSelectedRiders] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [jerseyAssignments, setJerseyAssignments] = useState({});
  const [saving, setSaving] = useState(false);

  const mainRiders = useMemo(() => teamRiders.filter((r) => r.slot_type === 'main'), [teamRiders]);
  const reserveRiders = useMemo(() => teamRiders.filter((r) => r.slot_type === 'reserve'), [teamRiders]);
  const currentTypeRiders = useMemo(() => 
    riderModalType === 'main' ? mainRiders : riderModalType === 'reserve' ? reserveRiders : []
  , [riderModalType, mainRiders, reserveRiders]);

  const teamRiderIds = useMemo(() => new Set(teamRiders.map(r => r.id)), [teamRiders]);
  const currentTypeRiderIds = useMemo(() => new Set(currentTypeRiders.map(r => r.id)), [currentTypeRiders]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const id = await getUserId();
        if (!id) return;
        if (cancelled) return;
        setUserId(id);

        const [userRes, ridersRes, jerseysRes, allRidersRes] = await Promise.all([
          api.getUser(id),
          api.getTeamRiders(id),
          api.getTeamJerseys(id),
          api.getAllRiders(),
        ]);

        if (cancelled) return;

        if (userRes?.ok && userRes?.participant) setParticipant(userRes.participant);
        setTeamRiders(ridersRes?.ok && Array.isArray(ridersRes.riders) ? ridersRes.riders : []);
        setTeamJerseys(jerseysRes?.ok && Array.isArray(jerseysRes.jerseys) ? jerseysRes.jerseys : []);
        setAllRiders(allRidersRes?.ok && Array.isArray(allRidersRes.riders) ? allRidersRes.riders : []);

        // Pre-fill jersey assignments
        if (jerseysRes?.ok && Array.isArray(jerseysRes.jerseys)) {
          const assignments = {};
          jerseysRes.jerseys.forEach(j => {
            if (j.assigned?.rider_id) {
              assignments[j.id] = j.assigned.rider_id;
            }
          });
          setJerseyAssignments(assignments);
        }

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

  // Filter riders based on search query
  const filteredRiders = useMemo(() => {
    if (!searchQuery.trim()) return allRiders;
    const query = searchQuery.toLowerCase();
    return allRiders.filter(rider => {
      const name = `${rider.first_name || ''} ${rider.last_name || ''}`.toLowerCase();
      const team = (rider.team_name || '').toLowerCase();
      return name.includes(query) || team.includes(query);
    });
  }, [allRiders, searchQuery]);

  // Get main rider IDs (for reserve modal to show them grayed out)
  const mainRiderIds = useMemo(() => new Set(mainRiders.map(r => r.id)), [mainRiders]);

  const handleOpenAddRiders = (type) => {
    setRiderModalType(type);
    // Pre-select current team riders of this type
    const currentIds = new Set(
      (type === 'main' ? mainRiders : reserveRiders).map(r => r.id)
    );
    setSelectedRiders(currentIds);
    setSearchQuery('');
    setAddRidersModalOpen(true);
  };

  const handleOpenRemoveRiders = (type) => {
    setRiderModalType(type);
    setRemoveRidersModalOpen(true);
  };

  const handleOpenAssignJerseys = () => {
    // Pre-fill jersey assignments
    const assignments = {};
    teamJerseys.forEach(j => {
      if (j.assigned?.rider_id) {
        assignments[j.id] = j.assigned.rider_id;
      }
    });
    setJerseyAssignments(assignments);
    setAssignJerseysModalOpen(true);
  };

  const handleRiderToggle = async (riderId) => {
    if (!userId || !riderModalType) return;
    
    // Check if rider is already a main rider (when adding reserve)
    if (riderModalType === 'reserve' && mainRiderIds.has(riderId)) {
      alert('Deze renner is al geselecteerd als basisrenner. Je kunt een renner niet zowel als basisrenner als reserverenner hebben.');
      return;
    }
    
    const isInTeam = currentTypeRiderIds.has(riderId);
    
    // If clicking on a rider that's already in the team, remove it
    if (isInTeam) {
      setSaving(true);
      try {
        const deleteResult = await api.deleteTeamRiders(userId, [riderId]);
        if (!deleteResult?.ok) {
          alert(deleteResult?.error || 'Fout bij verwijderen van renner');
          setSaving(false);
          return;
        }
        
        // Refresh team data
        const ridersRes = await api.getTeamRiders(userId);
        if (ridersRes?.ok && Array.isArray(ridersRes.riders)) {
          setTeamRiders(ridersRes.riders);
        }
        
        // Update selected riders
        setSelectedRiders(prev => {
          const newSet = new Set(prev);
          newSet.delete(riderId);
          return newSet;
        });
      } catch (e) {
        alert(e?.message || 'Fout bij verwijderen');
      } finally {
        setSaving(false);
      }
    } else {
      // Add new rider
      // Check if we can add more
      const currentCount = currentTypeRiders.length;
      const maxSelections = riderModalType === 'main' ? 10 : riderModalType === 'reserve' ? 5 : null;
      
      if (maxSelections && currentCount >= maxSelections) {
        alert(`Je kunt maximaal ${maxSelections} ${riderModalType === 'main' ? 'basisrenners' : 'reserverenners'} hebben.`);
        return;
      }
      
      setSaving(true);
      try {
        // Pass slotType when adding riders (reserve riders should have slot_type='reserve' and active=false)
        const addResult = await api.addTeamRiders(userId, [riderId], riderModalType);
        if (!addResult?.ok) {
          alert(addResult?.error || 'Fout bij toevoegen van renner');
          setSaving(false);
          return;
        }
        
        // Refresh team data
        const ridersRes = await api.getTeamRiders(userId);
        if (ridersRes?.ok && Array.isArray(ridersRes.riders)) {
          setTeamRiders(ridersRes.riders);
        }
        
        // Update selected riders
        setSelectedRiders(prev => {
          const newSet = new Set(prev);
          newSet.add(riderId);
          return newSet;
        });
        
        // Clear search field after 1 second
        setTimeout(() => {
          setSearchQuery('');
        }, 1000);
      } catch (e) {
        alert(e?.message || 'Fout bij toevoegen');
      } finally {
        setSaving(false);
      }
    }
  };


  const handleRemoveRider = async (riderId) => {
    if (!userId) return;
    
    setSaving(true);
    try {
      const deleteResult = await api.deleteTeamRiders(userId, [riderId]);
      if (!deleteResult?.ok) {
        alert(deleteResult?.error || 'Fout bij verwijderen van renner');
        setSaving(false);
        return;
      }

      // Refresh team data
      const ridersRes = await api.getTeamRiders(userId);
      if (ridersRes?.ok && Array.isArray(ridersRes.riders)) {
        setTeamRiders(ridersRes.riders);
      }

      // Close modal if no more riders of this type
      const remaining = (riderModalType === 'main' ? mainRiders : reserveRiders).filter(r => r.id !== riderId);
      if (remaining.length === 0) {
        setRemoveRidersModalOpen(false);
      }
    } catch (e) {
      alert(e?.message || 'Fout bij verwijderen');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJerseys = async () => {
    if (!userId) return;
    
    setSaving(true);
    try {
      const assignments = Object.entries(jerseyAssignments)
        .filter(([_, riderId]) => riderId !== null)
        .map(([jerseyId, riderId]) => ({ jerseyId: parseInt(jerseyId), riderId: parseInt(riderId) }));
      
      const result = await api.saveTeamJerseys(userId, assignments);
      if (result?.ok) {
        // Refresh jersey data
        const jerseysRes = await api.getTeamJerseys(userId);
        if (jerseysRes?.ok && Array.isArray(jerseysRes.jerseys)) {
          setTeamJerseys(jerseysRes.jerseys);
        }
        setAssignJerseysModalOpen(false);
      } else {
        alert(result?.error || 'Fout bij opslaan van truien');
      }
    } catch (e) {
      alert(e?.message || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const maxSelections = riderModalType === 'main' ? 10 : riderModalType === 'reserve' ? 5 : null;
  const currentCount = currentTypeRiders.length;
  const newSelectedCount = Array.from(selectedRiders).filter(id => !currentTypeRiderIds.has(id)).length;
  const canSelectMore = maxSelections ? (currentCount + newSelectedCount) <= maxSelections : true;

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
      <div className="dashboard-grid">
        {/* Left column: Team and Jerseys */}
        <div className="dashboard-column">
          {/* Team info */}
          <Tile
            title={participant?.team_name || 'Team'}
            headerLeft={
              <div className="team-avatar-container">
                {participant?.avatar_url ? (
                  <img src={participant.avatar_url} alt="Avatar" className="team-avatar-img" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="team-avatar-placeholder">{initialsFromName(participant?.team_name)}</div>
                )}
              </div>
            }
            actions={
              <button className="button" type="button" onClick={() => navigate('/teamvergelijken.html')}>
                <span>Vergelijk teams</span>
                <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
              </button>
            }
          >
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
          </Tile>

          {/* Jerseys */}
          <Tile
            title="Truien"
            contentClassName="riders-list-container"
            actions={
              <button
                className="button"
                type="button"
                onClick={handleOpenAssignJerseys}
                aria-label="Wijs truien toe"
              >
                <span>Truien toewijzen</span>
                <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
              </button>
            }
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
                    avatarInitials={j.assigned ? initialsFromRider(j.assigned.first_name, j.assigned.last_name) : undefined}
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

        {/* Right column: Main and Reserve Riders */}
        <div className="dashboard-column">
          <Tile
            title={`Basisrenners (${mainRiders.length})`}
            contentClassName="riders-list-container"
            actions={
              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'row' }}>
                <button
                  className="button"
                  type="button"
                  onClick={() => handleOpenAddRiders('main')}
                  aria-label="Voeg basisrenners toe"
                >
                  <span>Renners toevoegen</span>
                  <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                </button>
                {mainRiders.length > 0 && (
                  <button
                    className="button"
                    type="button"
                    onClick={() => handleOpenRemoveRiders('main')}
                    aria-label="Verwijder basisrenners"
                  >
                    <span>Renners verwijderen</span>
                    <img src="/assets/arrow.svg" alt="" className="action-arrow" style={{ filter: 'brightness(0) saturate(100%) invert(20%) sepia(95%) saturate(7471%) hue-rotate(352deg) brightness(95%) contrast(118%)' }} aria-hidden="true" />
                  </button>
                )}
              </div>
            }
          >
            <div className="tile-list" id="main-riders-list-container">
              {mainRiders.length === 0 ? <div className="no-riders-message" id="no-main-riders-message">Nog geen basisrenners</div> : null}
              {mainRiders.map((r) => (
                <ListItem
                  key={r.id}
                  avatarPhotoUrl={r.photo_url}
                  avatarAlt={`${r.first_name || ''} ${r.last_name || ''}`.trim()}
                  avatarInitials={initialsFromRider(r.first_name, r.last_name)}
                  title={`${r.first_name || ''} ${r.last_name || ''}`.trim()}
                  subtitle={r.team_name || undefined}
                />
              ))}
            </div>
          </Tile>

          <Tile
            title={`Reserverenners (${reserveRiders.length})`}
            contentClassName="riders-list-container"
            actions={
              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'row' }}>
                <button
                  className="button"
                  type="button"
                  onClick={() => handleOpenAddRiders('reserve')}
                  aria-label="Voeg reserverenners toe"
                >
                  <span>Renners toevoegen</span>
                  <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
                </button>
                {reserveRiders.length > 0 && (
                  <button
                    className="button"
                    type="button"
                    onClick={() => handleOpenRemoveRiders('reserve')}
                    aria-label="Verwijder reserverenners"
                  >
                    <span>Renners verwijderen</span>
                    <img src="/assets/arrow.svg" alt="" className="action-arrow" style={{ filter: 'brightness(0) saturate(100%) invert(20%) sepia(95%) saturate(7471%) hue-rotate(352deg) brightness(95%) contrast(118%)' }} aria-hidden="true" />
                  </button>
                )}
              </div>
            }
          >
            <div className="tile-list" id="reserve-riders-list-container">
              {reserveRiders.length === 0 ? <div className="no-riders-message" id="no-reserve-riders-message">Nog geen reserverenners</div> : null}
              {reserveRiders.map((r) => (
                <ListItem
                  key={r.id}
                  avatarPhotoUrl={r.photo_url}
                  avatarAlt={`${r.first_name || ''} ${r.last_name || ''}`.trim()}
                  avatarInitials={initialsFromRider(r.first_name, r.last_name)}
                  title={`${r.first_name || ''} ${r.last_name || ''}`.trim()}
                  subtitle={r.team_name || undefined}
                />
              ))}
            </div>
          </Tile>
        </div>
      </div>

      {/* Add Riders Modal */}
      <Modal
        isOpen={addRidersModalOpen}
        onClose={() => {
          setAddRidersModalOpen(false);
          setSelectedRiders(new Set());
          setSearchQuery('');
        }}
        title={`${riderModalType === 'main' ? 'Basisrenners' : 'Reserverenners'} selecteren`}
      >
        {maxSelections && (
          <div style={{ padding: '0.75rem', background: '#e3f2fd', borderRadius: '4px', marginBottom: '1rem' }}>
            Je hebt {currentTypeRiders.length} van {maxSelections} {riderModalType === 'main' ? 'basisrenners' : 'reserverenners'} geselecteerd.
          </div>
        )}
        <div className="modal-search-container">
          <div className="modal-search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>
          <input
            type="text"
            className="modal-search-input"
            placeholder="Zoek renner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="modal-riders-list">
          {filteredRiders.length === 0 ? (
            <div className="no-data">Geen renners gevonden</div>
          ) : (
            filteredRiders.map((rider) => {
              const isInTeam = currentTypeRiderIds.has(rider.id);
              const isMainRider = riderModalType === 'reserve' && mainRiderIds.has(rider.id);
              const wouldExceedMax = maxSelections && !isInTeam && currentCount >= maxSelections;
              const isDisabled = wouldExceedMax || saving || isMainRider;
              
              return (
                <div
                  key={rider.id}
                  onClick={() => {
                    if (isDisabled) {
                      if (isMainRider) {
                        alert('Deze renner is al geselecteerd als basisrenner. Je kunt een renner niet zowel als basisrenner als reserverenner hebben.');
                      }
                      return;
                    }
                    handleRiderToggle(rider.id);
                  }}
                  className={`modal-rider-item ${isInTeam ? 'rider-in-team' : ''} ${isDisabled ? 'rider-disabled' : ''} ${isMainRider ? 'rider-main-rider' : ''}`}
                  style={{ 
                    opacity: saving ? 0.6 : isMainRider ? 0.5 : 1, 
                    cursor: isDisabled ? 'not-allowed' : 'pointer' 
                  }}
                >
                  <RiderAvatar
                    photoUrl={rider.photo_url}
                    alt={`${rider.first_name || ''} ${rider.last_name || ''}`.trim()}
                    initials={initialsFromRider(rider.first_name, rider.last_name)}
                    containerClassName="rider-avatar"
                    imgClassName="rider-avatar-img"
                    placeholderClassName="rider-avatar-placeholder"
                  />
                  <div className="rider-info" style={{ flex: 1 }}>
                    <div className="rider-name">
                      {rider.first_name || ''} {rider.last_name || ''}
                    </div>
                    <div className="rider-team">{rider.team_name || 'Onbekend team'}</div>
                  </div>
                  {isInTeam && (
                    <div style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '20px' }}>✓</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Modal>

      {/* Remove Riders Modal */}
      <Modal
        isOpen={removeRidersModalOpen}
        onClose={() => setRemoveRidersModalOpen(false)}
        title={`${riderModalType === 'main' ? 'Basisrenners' : 'Reserverenners'} verwijderen`}
      >
        <div className="modal-riders-list">
          {currentTypeRiders.length === 0 ? (
            <div className="no-data">Geen {riderModalType === 'main' ? 'basisrenners' : 'reserverenners'} om te verwijderen</div>
          ) : (
            currentTypeRiders.map((rider) => (
              <div
                key={rider.id}
                onClick={() => handleRemoveRider(rider.id)}
                className="modal-rider-item"
                style={{ cursor: 'pointer' }}
              >
                <RiderAvatar
                  photoUrl={rider.photo_url}
                  firstName={rider.first_name}
                  lastName={rider.last_name}
                  size={48}
                />
                <div className="rider-info" style={{ flex: 1 }}>
                  <div className="rider-name">
                    {rider.first_name || ''} {rider.last_name || ''}
                  </div>
                  <div className="rider-team">{rider.team_name || 'Onbekend team'}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveRider(rider.id);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                  disabled={saving}
                >
                  {saving ? 'Verwijderen...' : 'Verwijderen'}
                </button>
              </div>
            ))
          )}
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setRemoveRidersModalOpen(false)}
            className="button"
          >
            <span>sluiten</span>
            <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
          </button>
        </div>
      </Modal>

      {/* Assign Jerseys Modal */}
      <Modal
        isOpen={assignJerseysModalOpen}
        onClose={() => setAssignJerseysModalOpen(false)}
        title="Truien toewijzen"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {teamJerseys.map((jersey) => {
            const assignedRiderId = jerseyAssignments[jersey.id];
            const assignedRider = assignedRiderId 
              ? teamRiders.find(r => r.id === assignedRiderId)
              : null;
            
            const jerseyIconSrc =
              jersey.type === 'geel'
                ? '/icons/Truien/geletrui.svg'
                : jersey.type === 'groen'
                ? '/icons/Truien/groenetrui.svg'
                : jersey.type === 'bolletjes'
                ? '/icons/Truien/bolletjestrui.svg'
                : jersey.type === 'wit'
                ? '/icons/Truien/wittetrui.svg'
                : '/icons/Truien/geletrui.svg';

            return (
              <div key={jersey.id} style={{ padding: '1rem', border: '1px solid #cdd7dc', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <img src={jerseyIconSrc} alt={jersey.name} style={{ width: '32px', height: '32px' }} />
                  <strong>{jersey.name}</strong>
                </div>
                <select
                  value={assignedRiderId || ''}
                  onChange={(e) => {
                    const riderId = e.target.value ? parseInt(e.target.value) : null;
                    setJerseyAssignments(prev => ({
                      ...prev,
                      [jersey.id]: riderId,
                    }));
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '16px',
                    border: '1px solid #cdd7dc',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="">-- Selecteer een renner --</option>
                  {teamRiders.map((rider) => (
                    <option key={rider.id} value={rider.id}>
                      {rider.first_name || ''} {rider.last_name || ''} {rider.team_name ? `(${rider.team_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
        <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setAssignJerseysModalOpen(false)}
            className="button"
          >
            <span>annuleren</span>
            <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleSaveJerseys}
            disabled={saving}
            className="button"
          >
            <span>{saving ? 'opslaan...' : 'opslaan'}</span>
            <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
          </button>
        </div>
      </Modal>

      <div style={{ marginTop: '1.5rem' }}>
        <a href="/logout.html">Uitloggen</a>
      </div>
    </PageTemplate>
  );
}
