'use client';

export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="loading-spinner" style={{ 
      width: size === 'sm' ? '16px' : size === 'md' ? '32px' : '48px',
      height: size === 'sm' ? '16px' : size === 'md' ? '32px' : '48px',
      borderWidth: size === 'sm' ? '2px' : size === 'md' ? '3px' : '4px'
    }}></div>
  );
}

