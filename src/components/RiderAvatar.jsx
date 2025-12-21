import React from 'react';

/**
 * RiderAvatar - Component voor het weergeven van een renner avatar met foto of initialen placeholder
 * 
 * @param {Object} props
 * @param {string} props.photoUrl - URL van de renner foto
 * @param {string} props.alt - Alt tekst voor de foto
 * @param {string} props.initials - Initialen voor placeholder (bijv. "JD")
 * @param {string} props.firstName - Voornaam (gebruikt om initialen te genereren als initials niet gegeven is)
 * @param {string} props.lastName - Achternaam (gebruikt om initialen te genereren als initials niet gegeven is)
 * @param {number} props.size - Grootte van de avatar in pixels (optioneel, wordt gebruikt voor width/height)
 * @param {string} props.containerClassName - CSS class voor de container div
 * @param {string} props.imgClassName - CSS class voor de img tag
 * @param {string} props.placeholderClassName - CSS class voor de placeholder div
 * @param {string} props.placeholderInnerClassName - CSS class voor de inner placeholder div (voor initialen)
 * @param {boolean} props.isDnf - Of de renner DNS/DNF is (grijze avatar)
 * @param {boolean} props.isActive - Of de renner actief is (groene avatar)
 * @param {boolean} props.hasBorder - Of de avatar een border moet hebben
 */
export function RiderAvatar({
  photoUrl,
  alt = '',
  initials,
  firstName,
  lastName,
  size,
  containerClassName = '',
  imgClassName = '',
  placeholderClassName = '',
  placeholderInnerClassName = '',
  isDnf = false,
  isActive = false,
  hasBorder = false,
}) {
  // Genereer initialen als ze niet gegeven zijn
  const displayInitials = initials || (() => {
    const f = firstName ? String(firstName)[0] : '';
    const l = lastName ? String(lastName)[0] : '';
    return `${f}${l}`.toUpperCase() || '?';
  })();

  // Bepaal welke classes te gebruiken
  let containerClasses = containerClassName || 'rider-avatar';
  // Add active class if isActive is true
  if (isActive) {
    containerClasses += ' rider-avatar-active';
  }
  if (isDnf) {
    containerClasses += ' rider-avatar-dnf';
  }
  // Add border class if hasBorder is true (but CSS will override for list-item avatars)
  if (hasBorder && !isActive) {
    containerClasses += ' rider-avatar-border';
  }
  const imgClasses = imgClassName || 'rider-photo';
  let placeholderClasses = placeholderClassName || 'rider-avatar-placeholder';
  // Add active class to placeholder if isActive is true
  if (isActive) {
    placeholderClasses += ' rider-avatar-placeholder-active';
  }
  if (isDnf) {
    placeholderClasses += ' rider-avatar-placeholder-dnf';
  }
  const placeholderInnerClasses = placeholderInnerClassName || 'rider-avatar-initials';

  // Bepaal of we een foto hebben
  const hasPhoto = Boolean(photoUrl && photoUrl.trim());

  // Styling voor DNF/Active/Border states
  const containerStyle = {};
  if (size) {
    containerStyle.width = `${size}px`;
    containerStyle.height = `${size}px`;
  }
  if (isDnf) {
    containerStyle.filter = 'grayscale(100%)';
    containerStyle.opacity = 0.6;
  }
  // Border styling wordt nu via CSS classes afgehandeld
  // Geen inline border styling meer - borders zijn verwijderd voor list-item avatars

  if (hasPhoto) {
    return (
      <div className={containerClasses} style={containerStyle}>
        <img
          src={photoUrl}
          alt={alt}
          className={imgClasses}
          onError={(e) => {
            // Als de foto niet laadt, verberg de img en toon placeholder
            e.currentTarget.style.display = 'none';
            const placeholder = e.currentTarget.nextSibling;
            if (placeholder) {
              placeholder.style.display = 'flex';
            }
          }}
        />
        <div className={placeholderClasses} style={{ display: 'none' }}>
          <div className={placeholderInnerClasses}>{displayInitials}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses} style={containerStyle}>
      <div className={placeholderClasses}>
        <div className={placeholderInnerClasses}>{displayInitials}</div>
      </div>
    </div>
  );
}
