import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { InfoIconButton } from './InfoIconButton';
import { InfoPopup } from './InfoPopup';

/**
 * Tile ("tegel") contract (gebruik dit ook voor nieuwe tegels):
 * - Header: titel links, optionele subtitel onder titel
 * - Rechts naast titel: info-icoon (i) dat een popup toont met uitleg
 * - Content blok onder header
 * - Als content een lijst is: gebruik className="tile-list" zodat items gescheiden worden met subtiele divider
 *   met 1rem ruimte boven/onder.
 * - Onderaan: actions blok met 1 of 2 acties.
 *
 * Classnames zijn bewust stabiel gehouden.
 * 
 * Voor standings/stand lijsten:
 * - Gebruik ListItem component met optionele positionChange prop
 * - positionChange: number|null - aantal plaatsen gestegen/gedaald (positief = gestegen, negatief = gedaald, null = geen wijziging)
 * - De positionChange wordt automatisch weergegeven met pijl en kleur (groen = gestegen, rood = gedaald, grijs = gelijk)
 */
export function Tile({
  className = '',
  title,
  subtitle,
  info,
  headerLeft,
  headerRight,
  children,
  actions,
  contentClassName = '',
  actionsClassName = '',
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const reactId = useId();

  const popupId = useMemo(() => `tile-info-${reactId}`, [reactId]);

  useEffect(() => {
    if (!open) return;

    function onDocClick(e) {
      const container = containerRef.current;
      if (!container) return;
      const target = e.target;
      if (!target) return;

      const insideTile = container.contains(target);
      if (!insideTile) {
        setOpen(false);
        return;
      }

      const insideInfo = target.closest?.('.info-popup') || target.closest?.('.info-icon-button');
      if (!insideInfo) setOpen(false);
    }

    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  return (
    <section ref={containerRef} className={`tile ${className}`.trim()}>
      <header className="tile-header">
        {headerLeft ? <div className="tile-header-left">{headerLeft}</div> : null}

        <div className="tile-heading">
          <h2 className="tile-title">{title}</h2>
          {subtitle ? <div className="tile-subtitle">{subtitle}</div> : null}
        </div>

        {headerRight || info ? (
          <div className="tile-header-right">
            {headerRight ? <div className="tile-header-right-content">{headerRight}</div> : null}

            {info ? (
              <div className="tile-info">
                <InfoIconButton
                  id={info.buttonId || undefined}
                  ariaLabel={info.ariaLabel || `Informatie over ${title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                  }}
                />
                <InfoPopup id={popupId} isOpen={open} title={info.title || title}>
                  {info.text}
                </InfoPopup>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className={`tile-content ${contentClassName}`.trim()}>{children}</div>

      {actions ? <footer className={`tile-actions ${actionsClassName}`.trim()}>{actions}</footer> : null}
    </section>
  );
}




