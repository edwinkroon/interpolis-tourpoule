import React from 'react';
import { RiderAvatar } from './RiderAvatar';

/**
 * ListItem - Herbruikbare list item component met avatar/getal links, titel, subtitel en getal/icoon rechts
 * 
 * @param {Object} props
 * @param {string} props.avatarPhotoUrl - URL van de avatar foto (links)
 * @param {string} props.avatarAlt - Alt tekst voor de avatar
 * @param {string} props.avatarInitials - Initialen voor placeholder (bijv. "JD")
 * @param {string|number} props.leftValue - Getal links (in plaats van avatar, bijv. positie/rank)
 * @param {string} props.title - Titel/naam (wordt vet weergegeven)
 * @param {string} props.subtitle - Subtitel (kleinere font, optioneel)
 * @param {string|number} props.value - Getal rechts uitgelijnd
 * @param {React.ReactNode} props.rightIcon - Icoon rechts (in plaats van value, bijv. jersey icon)
 * @param {string} props.className - Optionele extra CSS classes
 * @param {function} props.onClick - Optionele click handler
 */
export function ListItem({
  avatarPhotoUrl,
  avatarAlt,
  avatarInitials,
  leftValue,
  title,
  subtitle,
  value,
  rightIcon,
  className = '',
  onClick,
}) {
  const itemClasses = `list-item ${className}`.trim();

  // Bepaal wat links wordt getoond: leftValue heeft voorrang, anders avatar
  const showLeftValue = leftValue !== undefined && leftValue !== null;
  const showAvatar = !showLeftValue && (avatarPhotoUrl !== undefined || avatarInitials);

  // Bepaal wat rechts wordt getoond: rightIcon heeft voorrang, anders value
  const showRightIcon = rightIcon !== undefined && rightIcon !== null;
  const showValue = !showRightIcon && (value !== undefined && value !== null);

  const content = (
    <>
      {showLeftValue ? (
        <div className="list-item-left-value">{leftValue}</div>
      ) : showAvatar ? (
        <div className="list-item-avatar">
          <RiderAvatar
            photoUrl={avatarPhotoUrl || ''}
            alt={avatarAlt || title || ''}
            initials={avatarInitials}
            containerClassName="list-item-avatar-container"
            imgClassName="list-item-avatar-img"
            placeholderClassName="list-item-avatar-container"
            placeholderInnerClassName="list-item-avatar-initials"
          />
        </div>
      ) : null}
      
      <div className="list-item-info">
        {title ? <div className="list-item-title">{title}</div> : null}
        {subtitle ? <div className="list-item-subtitle">{subtitle}</div> : null}
      </div>
      
      {showRightIcon ? (
        <div className="list-item-right-icon">{rightIcon}</div>
      ) : showValue ? (
        <div className="list-item-value">{value}</div>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <div className={itemClasses} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      }}>
        {content}
      </div>
    );
  }

  return <div className={itemClasses}>{content}</div>;
}
