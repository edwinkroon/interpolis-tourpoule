import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getUserId } from '../utils/auth0';
import { api } from '../utils/api';
import { PageTemplate } from '../layouts/PageTemplate';
import { Tile } from '../components/Tile';
import { ListItem } from '../components/ListItem';

function initialsFromName(firstName, lastName) {
  const first = (firstName || 'R')[0];
  const last = (lastName || 'R')[0];
  return `${first}${last}`.toUpperCase();
}

export function SelectRidersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type'); // 'main', 'reserve', or 'jerseys'
  
  const [userId, setUserId] = useState(null);
  const [allRiders, setAllRiders] = useState([]);
  const [teamRiders, setTeamRiders] = useState([]);
  const [teamJerseys, setTeamJerseys] = useState([]);
  const [selectedRiders, setSelectedRiders] = useState(new Set());
  const [jerseyAssignments, setJerseyAssignments] = useState({}); // { jerseyId: riderId }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const id = await getUserId();
        if (!id) return;
        if (cancelled) return;
        setUserId(id);

        const [ridersRes, teamRidersRes, jerseysRes] = await Promise.all([
          api.getAllRiders(),
          api.getTeamRiders(id),
          type === 'jerseys' ? api.getTeamJerseys(id) : Promise.resolve({ ok: true, jerseys: [] }),
        ]);

        if (cancelled) return;

        if (ridersRes?.ok && Array.isArray(ridersRes.riders)) {
          setAllRiders(ridersRes.riders);
        }
        if (teamRidersRes?.ok && Array.isArray(teamRidersRes.riders)) {
          setTeamRiders(teamRidersRes.riders);
          // Pre-select already selected riders of the current type
          if (type === 'main' || type === 'reserve') {
            const existingIds = new Set(
              teamRidersRes.riders
                .filter(r => r.slot_type === type)
                .map(r => r.id)
            );
            setSelectedRiders(existingIds);
          }
        }
        if (jerseysRes?.ok && Array.isArray(jerseysRes.jerseys)) {
          setTeamJerseys(jerseysRes.jerseys);
          // Pre-fill jersey assignments
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
  }, [type]);

  const handleRiderToggle = (riderId) => {
    setSelectedRiders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(riderId)) {
        newSet.delete(riderId);
      } else {
        newSet.add(riderId);
      }
      return newSet;
    });
  };

  const handleJerseyAssignment = (jerseyId, riderId) => {
    setJerseyAssignments(prev => ({
      ...prev,
      [jerseyId]: riderId === prev[jerseyId] ? null : riderId, // Toggle if same rider clicked
    }));
  };

  const handleSave = async () => {
    if (!userId) return;
    
    setSaving(true);
    setError(null);

    try {
      if (type === 'jerseys') {
        // Save jersey assignments
        const assignments = Object.entries(jerseyAssignments)
          .filter(([_, riderId]) => riderId !== null)
          .map(([jerseyId, riderId]) => ({ jerseyId: parseInt(jerseyId), riderId: parseInt(riderId) }));
        
        const result = await api.saveTeamJerseys(userId, assignments);
        if (result?.ok) {
          navigate('/teamoverzicht.html');
        } else {
          setError(result?.error || 'Fout bij opslaan van truien');
          setSaving(false);
        }
      } else {
        // Save riders - we need to handle the slot_type properly
        // For now, we'll use addTeamRiders which automatically assigns slots
        // But we need to remove current riders of this type first if they're deselected
        const riderIds = Array.from(selectedRiders).map(id => parseInt(id));
        
        // Get current team riders of this type to determine what to add/remove
        const currentTypeRiderIds = new Set(currentTypeRiders.map(r => r.id));
        const toAdd = riderIds.filter(id => !currentTypeRiderIds.has(id));
        const toRemove = Array.from(currentTypeRiderIds).filter(id => !selectedRiders.has(id));
        
        // Remove riders first (if needed) - only remove riders of this specific type
        if (toRemove.length > 0) {
          const deleteResult = await api.deleteTeamRiders(userId, toRemove);
          if (!deleteResult?.ok) {
            setError(deleteResult?.error || 'Fout bij verwijderen van renners');
            setSaving(false);
            return;
          }
        }
        
        // Add new riders
        if (toAdd.length > 0) {
          const addResult = await api.addTeamRiders(userId, toAdd);
          if (!addResult?.ok) {
            setError(addResult?.error || 'Fout bij toevoegen van renners');
            setSaving(false);
            return;
          }
        }
        
        // Refresh the page to show updated team
        window.location.href = '/teamoverzicht.html';
      }
    } catch (e) {
      setError(e?.message || 'Fout bij opslaan');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageTemplate title={type === 'jerseys' ? 'Truien toewijzen' : 'Renners selecteren'} backLink="/teamoverzicht.html">
        <div className="no-data">Bezig met laden...</div>
      </PageTemplate>
    );
  }

  if (error && !saving) {
    return (
      <PageTemplate title={type === 'jerseys' ? 'Truien toewijzen' : 'Renners selecteren'} backLink="/teamoverzicht.html">
        <div className="error-message" style={{ display: 'block' }}>
          {String(error?.message || error)}
        </div>
      </PageTemplate>
    );
  }

  // For main/reserve: show all riders, but mark current team riders
  // For jerseys: only show team riders
  const availableRiders = type === 'jerseys' 
    ? teamRiders // Only show team riders for jerseys
    : allRiders; // Show all riders for main/reserve selection
  
  // Get current team riders of the selected type
  const currentTypeRiders = type === 'main'
    ? teamRiders.filter(r => r.slot_type === 'main')
    : type === 'reserve'
    ? teamRiders.filter(r => r.slot_type === 'reserve')
    : [];
  
  const currentTypeRiderIds = new Set(currentTypeRiders.map(r => r.id));

  const maxSelections = type === 'main' ? 10 : type === 'reserve' ? 5 : null;
  const currentCount = currentTypeRiders.length;
  
  // Count how many new riders are selected (excluding current ones)
  const newSelectedCount = Array.from(selectedRiders).filter(id => !currentTypeRiderIds.has(id)).length;
  const canSelectMore = maxSelections ? (currentCount + newSelectedCount) <= maxSelections : true;

  return (
    <PageTemplate
      title={type === 'jerseys' ? 'Truien toewijzen' : type === 'main' ? 'Basisrenners selecteren' : 'Reserverenners selecteren'}
      backLink="/teamoverzicht.html"
      sidebar={
        <a
          href="/logout.html"
          className="action-button"
          style={{ textDecoration: 'none', color: 'inherit' }}
          aria-label="Uitloggen"
        >
          <span>Uitloggen</span>
          <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
        </a>
      }
    >
      {type === 'jerseys' ? (
        <div>
          <Tile title="Wijs truien toe aan renners">
            <div className="tile-list">
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
                  <div key={jersey.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <img src={jerseyIconSrc} alt={jersey.name} style={{ width: '32px', height: '32px', marginRight: '0.5rem' }} />
                      <strong>{jersey.name}</strong>
                    </div>
                    <div style={{ marginLeft: '2.5rem' }}>
                      {assignedRider ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <ListItem
                            avatarPhotoUrl={assignedRider.photo_url}
                            avatarAlt={`${assignedRider.first_name || ''} ${assignedRider.last_name || ''}`.trim()}
                            avatarInitials={initialsFromName(assignedRider.first_name, assignedRider.last_name)}
                            title={`${assignedRider.first_name || ''} ${assignedRider.last_name || ''}`.trim()}
                            subtitle={assignedRider.team_name || undefined}
                          />
                          <button
                            type="button"
                            onClick={() => handleJerseyAssignment(jersey.id, assignedRiderId)}
                            style={{ marginLeft: '1rem', padding: '0.5rem 1rem', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Verwijderen
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ marginBottom: '0.5rem', color: '#666' }}>Selecteer een renner:</div>
                          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '0.5rem' }}>
                            {teamRiders.map((rider) => (
                              <div
                                key={rider.id}
                                onClick={() => handleJerseyAssignment(jersey.id, rider.id)}
                                style={{
                                  padding: '0.5rem',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  marginBottom: '0.25rem',
                                  background: jerseyAssignments[jersey.id] === rider.id ? '#e3f2fd' : 'transparent',
                                }}
                                onMouseEnter={(e) => {
                                  if (jerseyAssignments[jersey.id] !== rider.id) {
                                    e.currentTarget.style.background = '#f5f5f5';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (jerseyAssignments[jersey.id] !== rider.id) {
                                    e.currentTarget.style.background = 'transparent';
                                  }
                                }}
                              >
                                <ListItem
                                  avatarPhotoUrl={rider.photo_url}
                                  avatarAlt={`${rider.first_name || ''} ${rider.last_name || ''}`.trim()}
                                  avatarInitials={initialsFromName(rider.first_name, rider.last_name)}
                                  title={`${rider.first_name || ''} ${rider.last_name || ''}`.trim()}
                                  subtitle={rider.team_name || undefined}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="button"
                style={{ flex: 1 }}
              >
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/teamoverzicht.html')}
                className="button"
                style={{ flex: 1, background: '#666' }}
              >
                Annuleren
              </button>
            </div>
          </Tile>
        </div>
      ) : (
        <div>
          <Tile title={`Selecteer ${type === 'main' ? 'basisrenners' : 'reserverenners'}`}>
            {maxSelections && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#e3f2fd', borderRadius: '4px' }}>
                Je hebt {selectedRiders.size} van {maxSelections} {type === 'main' ? 'basisrenners' : 'reserverenners'} geselecteerd.
                {!canSelectMore && newSelectedCount > 0 && (
                  <div style={{ marginTop: '0.5rem', color: '#d32f2f' }}>
                    Je kunt maximaal {maxSelections} {type === 'main' ? 'basisrenners' : 'reserverenners'} hebben.
                  </div>
                )}
              </div>
            )}
            <div className="tile-list" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {availableRiders.length === 0 ? (
                <div className="no-data">Geen beschikbare renners</div>
              ) : (
                availableRiders.map((rider) => {
                  const isSelected = selectedRiders.has(rider.id);
                  const isCurrentTeamRider = currentTypeRiderIds.has(rider.id);
                  const wouldExceedMax = maxSelections && !isSelected && !isCurrentTeamRider && (currentCount + newSelectedCount) >= maxSelections;
                  
                  return (
                    <div
                      key={rider.id}
                      onClick={() => {
                        if (wouldExceedMax) {
                          return; // Don't allow selection if max would be exceeded
                        }
                        handleRiderToggle(rider.id);
                      }}
                      style={{
                        cursor: wouldExceedMax ? 'not-allowed' : 'pointer',
                        opacity: wouldExceedMax ? 0.5 : 1,
                        padding: '0.5rem',
                        borderRadius: '4px',
                        background: isSelected ? '#e3f2fd' : 'transparent',
                        marginBottom: '0.25rem',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !(maxSelections && (selectedRiders.size - currentCount) >= maxSelections)) {
                          e.currentTarget.style.background = '#f5f5f5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <ListItem
                        avatarPhotoUrl={rider.photo_url}
                        avatarAlt={rider.name}
                        avatarInitials={initialsFromName(rider.first_name, rider.last_name)}
                        title={rider.name}
                        subtitle={rider.team_name || undefined}
                        rightIcon={
                          isSelected ? (
                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓</span>
                          ) : null
                        }
                      />
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || (maxSelections && selectedRiders.size === 0)}
                className="button"
                style={{ flex: 1 }}
              >
                {saving ? 'Opslaan...' : 'Toevoegen'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/teamoverzicht.html')}
                className="button"
                style={{ flex: 1, background: '#666' }}
              >
                Annuleren
              </button>
            </div>
          </Tile>
        </div>
      )}
    </PageTemplate>
  );
}
