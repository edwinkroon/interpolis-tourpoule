import React, { useMemo, useState } from 'react';

export function RiderAvatar({
  photoUrl,
  alt,
  initials,
  containerClassName,
  imgClassName,
  placeholderClassName,
  placeholderInnerClassName,
  isDnf = false,
  isActive = false,
  hasBorder = false,
}) {
  const [imgError, setImgError] = useState(false);

  const safeInitials = useMemo(() => {
    const txt = String(initials || '').trim();
    return txt ? txt.toUpperCase().slice(0, 2) : '?';
  }, [initials]);

  const showImg = Boolean(photoUrl) && !imgError;

  // Build additional classes based on state
  const containerClasses = [containerClassName];
  const imgClasses = [imgClassName];
  const placeholderClasses = [placeholderClassName];

  if (isDnf) {
    containerClasses.push('rider-avatar-dnf');
    imgClasses.push('rider-avatar-img-dnf');
    placeholderClasses.push('rider-avatar-placeholder-dnf');
  }
  if (isActive) {
    containerClasses.push('rider-avatar-active');
    imgClasses.push('rider-avatar-img-active');
    placeholderClasses.push('rider-avatar-placeholder-active');
  }
  if (hasBorder) {
    containerClasses.push('rider-avatar-border');
  }

  return (
    <div className={containerClasses.join(' ')}>
      {showImg ? (
        <img
          src={photoUrl}
          alt={alt || ''}
          className={imgClasses.join(' ')}
          onError={() => setImgError(true)}
        />
      ) : null}

      <div className={placeholderClasses.join(' ')} style={{ display: showImg ? 'none' : 'flex' }} aria-hidden={showImg ? 'true' : 'false'}>
        {placeholderInnerClassName ? <span className={placeholderInnerClassName}>{safeInitials}</span> : safeInitials}
      </div>
    </div>
  );
}









