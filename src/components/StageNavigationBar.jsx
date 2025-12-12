import React from 'react';

export function StageNavigationBar({ stageLabel, routeText, canPrev, canNext, onPrev, onNext }) {
  return (
    <nav className="stage-navigation">
      <div className="page">
        <div className="stage-nav-content">
          <button
            className="stage-nav-button"
            type="button"
            aria-label="Vorige etappe"
            onClick={onPrev}
            disabled={!canPrev}
          >
            <img src="/assets/arrow.svg" alt="" className="stage-nav-arrow stage-nav-arrow-left" aria-hidden="true" />
          </button>
          <div className="stage-nav-info">
            <div className="stage-nav-title">
              <span className="stage-number">{stageLabel || ''}</span>
            </div>
            <div className="stage-nav-route">{routeText || ''}</div>
          </div>
          <button
            className="stage-nav-button"
            type="button"
            aria-label="Volgende etappe"
            onClick={onNext}
            disabled={!canNext}
          >
            <img src="/assets/arrow.svg" alt="" className="stage-nav-arrow stage-nav-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
