import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserId } from '../utils/auth0';
import { api } from '../utils/api';

export function Welcome3Page() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await getUserId();
      if (!userId) {
        navigate('/login.html', { replace: true });
        return;
      }

      const res = await api.getUser(userId);
      // Only show this page if the participant has been created (step 2).
      // If not, send the user back to step 2.
      if (!(res?.ok && res?.exists)) {
        navigate('/welcome2.html', { replace: true });
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
            <h2 className="form-title">Stel je team samen</h2>
            <p className="form-description">
              Je kunt je team samenstellen tot en met 5-7-2022. Een team bestaat uit 15 renners. Dat zijn 10 basis renners
              en 5 reserve renners. Als een basis renner uitvalt start de volgende etappe de eerst volgende reserve renner.
              <br />
              <br />
              Eenvoudig toch?
              <br />
              <br />
              De definitieve startlijst is altijd pas laat 100% compleet en de lijst met renners zal dus de laatste week
              voor de start meerdere malen aangepast worden. Vandaar dat er gewerkt wordt met een voorlopige lijst met
              wielrenners. Op het startscherm bij de mededelingen houden we jullie op de hoogte van nieuwtjes die van pas
              komen bij het samenstellen van je team.
              <br />
              We sturen ook regelmatig een e-mail als je je emailadres hebt opgegeven.
            </p>

            <div className="navigation-buttons">
              <button type="button" className="nav-button nav-button-prev" onClick={() => navigate('/welcome2.html')} aria-label="Ga naar vorige stap">
                <img src="/assets/arrow.svg" alt="" className="nav-arrow nav-arrow-left" aria-hidden="true" />
                <span>vorige</span>
              </button>
              <button type="button" className="nav-button nav-button-next" onClick={() => navigate('/home.html')} aria-label="Ga naar volgende stap">
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
