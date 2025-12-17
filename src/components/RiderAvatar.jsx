import React, { useMemo } from 'react';

export function RiderAvatar({
  photoUrl, // Deprecated: no longer used, kept for backward compatibility
  alt, // Deprecated: no longer used, kept for backward compatibility
  initials,
  containerClassName,
  imgClassName, // Deprecated: no longer used, kept for backward compatibility
  placeholderClassName,
  placeholderInnerClassName,
  isDnf = false,
  isActive = false,
  hasBorder = false,
}) {
  const safeInitials = useMemo(() => {
    const txt = String(initials || '').trim();
    return txt ? txt.toUpperCase().slice(0, 2) : '?';
  }, [initials]);

  // Build additional classes based on state
  const containerClasses = [containerClassName];
  const placeholderClasses = [placeholderClassName];

  if (isDnf) {
    containerClasses.push('rider-avatar-dnf');
    placeholderClasses.push('rider-avatar-placeholder-dnf');
  }
  if (isActive) {
    containerClasses.push('rider-avatar-active');
    placeholderClasses.push('rider-avatar-placeholder-active');
  }
  if (hasBorder) {
    containerClasses.push('rider-avatar-border');
  }

  return (
    <div className={containerClasses.join(' ')}>
      <div className={placeholderClasses.join(' ')} style={{ display: 'flex' }} aria-hidden="false">
        {placeholderInnerClassName ? <span className={placeholderInnerClassName}>{safeInitials}</span> : safeInitials}
      </div>
    </div>
  );
}










