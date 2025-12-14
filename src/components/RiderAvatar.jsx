import React, { useMemo, useState } from 'react';

export function RiderAvatar({
  photoUrl,
  alt,
  initials,
  containerClassName,
  imgClassName,
  placeholderClassName,
  placeholderInnerClassName,
}) {
  const [imgError, setImgError] = useState(false);

  const safeInitials = useMemo(() => {
    const txt = String(initials || '').trim();
    return txt ? txt.toUpperCase().slice(0, 2) : '?';
  }, [initials]);

  const showImg = Boolean(photoUrl) && !imgError;

  return (
    <div className={containerClassName}>
      {showImg ? (
        <img
          src={photoUrl}
          alt={alt || ''}
          className={imgClassName}
          onError={() => setImgError(true)}
        />
      ) : null}

      <div className={placeholderClassName} style={{ display: showImg ? 'none' : 'flex' }} aria-hidden={showImg ? 'true' : 'false'}>
        {placeholderInnerClassName ? <span className={placeholderInnerClassName}>{safeInitials}</span> : safeInitials}
      </div>
    </div>
  );
}






