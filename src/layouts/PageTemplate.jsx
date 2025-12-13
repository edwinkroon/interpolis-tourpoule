import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * PageTemplate - Herbruikbare pagina layout voor Interpolis Tourpoule
 *
 * Props:
 * - title (required): string - Hoofdtitel in de groene header
 * - subtitle (optional): string - Subtitel/meta-info onder de titel (bijv. etappe info)
 * - headerRight (optional): React node - Extra content rechts in header (bijv. punten, score)
 * - backLink (optional): string | { href: string, onClick?: () => void } - Back link configuratie
 * - sidebar (optional): React node - Sidebar content (bijv. navigatie buttons)
 * - children (required): React node - Hoofdcontent (kolommen met tegels)
 * - maxWidth (optional): string - Max breedte van content area (default: '1280px')
 * - stageNavigation (optional): React node - StageNavigationBar component voor etappe navigatie
 */
export function PageTemplate({
  title,
  subtitle,
  headerRight,
  backLink,
  sidebar,
  children,
  maxWidth = '1280px',
  stageNavigation,
}) {
  const navigate = useNavigate();

  const handleBackClick = (e) => {
    if (backLink) {
      if (typeof backLink === 'string') {
        e.preventDefault();
        navigate(backLink);
      } else if (backLink.onClick) {
        e.preventDefault();
        backLink.onClick();
      } else if (backLink.href) {
        e.preventDefault();
        navigate(backLink.href);
      }
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-content page">
          <div className="grid">
            <div className="col-12">
              <div className="header-top">
                {backLink ? (
                  <a
                    href="#"
                    className="back-link"
                    onClick={handleBackClick}
                    aria-label="Terug"
                  >
                    <img src="/assets/arrow.svg" alt="" className="back-arrow" aria-hidden="true" />
                    <span>Terug</span>
                  </a>
                ) : (
                  <div />
                )}
                <div className="header-title">Interpolis tourspel</div>
              </div>
            </div>
            <div className="col-12">
              <div className="header-welcome-section">
                <div className="header-title-content">
                  <h1 className="welcome-heading">{title}</h1>
                  {subtitle ? <div className="header-subtitle">{subtitle}</div> : null}
                  {headerRight ? <div className="header-right-content">{headerRight}</div> : null}
                </div>
                <div className="header-illustration">
                  <img src="/assets/headerillustration.svg" alt="Fiets illustratie" className="illustration-svg" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {stageNavigation || null}
      </header>

      <main className="main-content page">
        <div className="grid">
          {sidebar ? (
            <>
              <div className="col-3 action-buttons">{sidebar}</div>
              <div className="col-9 dashboard-content">{children}</div>
            </>
          ) : (
            <div className="col-12">{children}</div>
          )}
        </div>
      </main>
    </>
  );
}
