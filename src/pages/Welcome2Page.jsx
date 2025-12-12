import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserId } from '../utils/auth0';
import { api } from '../utils/api';

function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function isValidTeamName(teamName) {
  if (!teamName) return false;
  const trimmed = teamName.trim();
  return trimmed.length > 0 && trimmed.length <= 100;
}

export function Welcome2Page() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [newsletter, setNewsletter] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [teamNameError, setTeamNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await getUserId();
      if (!userId) {
        navigate('/login.html', { replace: true });
        return;
      }

      const res = await api.getUser(userId);
      if (res?.ok && res?.exists) {
        navigate('/home.html', { replace: true });
        return;
      }

      if (!cancelled) setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) {
    return <div className="page" style={{ padding: '2rem 1rem' }}>Bezig met laden...</div>;
  }

  return (
    <>
      <header className="header">
        <div className="header-content page">
          <div className="grid">
            <div className="col-12">
              <div className="header-title">Interpolis tourspel</div>
            </div>
            <div className="col-12">
              <div className="header-welcome-section">
                <h1 className="welcome-heading">Welkom</h1>
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
            <button
              className="action-button"
              type="button"
              onClick={() => navigate('/statistieken.html')}
              aria-label="Bekijk statistieken"
            >
              <span>Statistieken</span>
              <img src="/assets/arrow.svg" alt="" className="action-arrow" aria-hidden="true" />
            </button>
          </div>

          <div className="form-card col-9">
            <h2 className="form-title">Wie ben je?</h2>
            <p className="form-description">
              Geef hier de teamnaam op waarmee jouw team zichtbaar is binnen het tourspel. Daarnaast kan je nog een avatar
              uploaden en je emailadres opgeven zodat we je updates kunnen sturen.
            </p>

            <form
              id="team-form"
              onSubmit={async (e) => {
                e.preventDefault();

                setTeamNameError('');
                setEmailError('');

                let valid = true;
                if (!isValidTeamName(teamName)) {
                  setTeamNameError('Vul een teamnaam in om door te gaan');
                  valid = false;
                }
                // Backend requires email
                if (!email.trim()) {
                  setEmailError('Email is verplicht');
                  valid = false;
                } else if (!isValidEmail(email)) {
                  setEmailError('Vul een geldig emailadres in');
                  valid = false;
                }

                if (!valid) return;

                setSaving(true);
                try {
                  const userId = await getUserId();
                  if (!userId) {
                    navigate('/login.html', { replace: true });
                    return;
                  }

                  const res = await api.saveParticipant({
                    userId,
                    teamName: teamName.trim(),
                    email: email.trim(),
                    avatarUrl,
                    newsletter,
                  });

                  if (res?.ok) {
                    navigate('/welcome3.html', { replace: true });
                  } else {
                    setTeamNameError(res?.error || 'Er is een fout opgetreden bij het opslaan. Probeer het opnieuw.');
                  }
                } catch (err) {
                  setTeamNameError(err?.message || 'Er is een fout opgetreden bij het opslaan.');
                } finally {
                  setSaving(false);
                }
              }}
            >
              <div className="grid">
                <div className="form-group col-6">
                  <label htmlFor="teamname" className="form-label">
                    Teamnaam
                  </label>
                  <input
                    type="text"
                    id="teamname"
                    name="teamName"
                    className={`form-input${teamNameError ? ' error' : ''}`}
                    placeholder="Vul je teamnaam hier in"
                    value={teamName}
                    onChange={(e) => {
                      setTeamName(e.target.value);
                      if (teamNameError) setTeamNameError('');
                    }}
                    required
                    aria-required="true"
                    aria-describedby="teamname-error"
                    aria-invalid={teamNameError ? 'true' : 'false'}
                  />
                  <span className="error-message" id="teamname-error" role="alert" aria-live="polite" style={{ display: teamNameError ? 'block' : 'none' }}>
                    {teamNameError}
                  </span>
                </div>
              </div>

              <div className="grid">
                <div className="form-group col-6">
                  <label htmlFor="email" className="form-label">
                    Emailadres
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className={`form-input${emailError ? ' error' : ''}`}
                    placeholder="Vul je e-mail adres hier in"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    aria-describedby="email-error"
                    aria-invalid={emailError ? 'true' : 'false'}
                  />
                  <span className="error-message" id="email-error" role="alert" aria-live="polite" style={{ display: emailError ? 'block' : 'none' }}>
                    {emailError}
                  </span>
                </div>
              </div>

              <div className="avatar-section">
                <div className="avatar-circle">
                  <div
                    className="avatar-placeholder"
                    id="avatar-placeholder"
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="avatar-icon" id="avatar-icon" style={{ display: avatarUrl ? 'none' : 'block' }}>
                      +
                    </span>
                    {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                    <img
                      id="avatar-preview"
                      className="avatar-preview"
                      src={avatarUrl || ''}
                      alt="Avatar preview"
                      style={{ display: avatarUrl ? 'block' : 'none' }}
                    />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="avatar-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith('image/')) {
                        alert('Selecteer een geldige afbeelding');
                        return;
                      }
                      const maxSize = 5 * 1024 * 1024;
                      if (file.size > maxSize) {
                        alert('Afbeelding is te groot. Maximum grootte is 5MB.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setAvatarUrl(ev.target.result);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
                <div className="avatar-info">
                  <a
                    href="#"
                    className="avatar-link"
                    id="avatar-link"
                    onClick={(e) => {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }}
                  >
                    {avatarUrl ? 'Avatar aanpassen' : 'Avatar toevoegen'}
                  </a>
                  <p className="avatar-tip">Tip: Met een vierkante afbeelding heb je een beter resultaat</p>
                </div>
              </div>

              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="newsletter"
                  name="newsletter"
                  className="checkbox-input"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                  aria-describedby="newsletter-description"
                />
                <label htmlFor="newsletter" className="checkbox-label" id="newsletter-description">
                  Ik wil op de hoogte blijven
                </label>
              </div>

              <div className="navigation-buttons">
                <button type="button" className="nav-button nav-button-prev" onClick={() => navigate('/index.html')} aria-label="Ga naar vorige stap">
                  <img src="/assets/arrow.svg" alt="" className="nav-arrow nav-arrow-left" aria-hidden="true" />
                  <span>vorige</span>
                </button>
                <button type="submit" className="nav-button nav-button-next" aria-label="Ga naar volgende stap" disabled={saving}>
                  <span>{saving ? 'opslaan...' : 'volgende'}</span>
                  <img src="/assets/arrow.svg" alt="" className="nav-arrow nav-arrow-right" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
