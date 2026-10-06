import React from 'react';

export interface MessIconProps {
  size?: number | string;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
}

export const MessIcon: React.FC<MessIconProps> = ({
  size = '1.15em',
  style,
  className,
  title = 'Mess'
}) => {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src="/assets/ui/mess_icon.png"
      alt={title}
      title={title}
      data-testid="mess-icon"
      className={className}
      style={{
        display: 'inline-block',
        width: dimension,
        height: dimension,
        objectFit: 'contain',
        verticalAlign: '-0.18em',
        pointerEvents: 'none',
        userSelect: 'none',
        ...style
      }}
    />
  );
};
