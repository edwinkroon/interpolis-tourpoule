import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserId } from '../utils/auth0';
import { api } from '../utils/api';

export function Welcome1Page() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
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
  }, [navigate]);

  if (loading) {
    return <div className="page" style={{ padding: '2rem 1rem' }}>Bezig met laden...</div>;
  }

  return (
    <>
      <div id="build-info" className="build-info" />

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
            <h2 className="form-title">Welkom bij de Interpolis tourpoule</h2>
            <p className="form-description">
              Maak in drie eenvoudige stappen je team aan.
              <br />
              <br />
              1- Kies een teamnaam
              <br />
              2- Maak je team aan
              <br />
              3- Selecteer de renners voor jouw team
              <br />
              <br />
              Je kan de teamnaam en samenstelling van je team nog aanpassen voor de tour begint.
            </p>

            {error ? (
              <div className="error-message" style={{ display: 'block', padding: '1rem', marginBottom: '1rem', background: '#fff5f5', border: '2px solid #d32f2f', borderRadius: '8px' }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#d32f2f' }}>
                  {error?.isDatabaseError ? 'Database fout' : 'Fout'}
                </strong>
                <div>{String(error?.message || error)}</div>
              </div>
            ) : null}

            <div className="navigation-buttons">
              <button
                type="button"
                className="nav-button nav-button-next"
                onClick={() => navigate('/welcome2.html')}
                aria-label="Ga naar volgende stap"
              >
                <span>volgende</span>
                <img src="/assets/arrow.svg" alt="" className="nav-arrow nav-arrow-right" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
