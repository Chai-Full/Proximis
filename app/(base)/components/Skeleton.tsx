"use client";

import React from 'react';
import './Skeleton.css';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'avatar' | 'announcement' | 'reservation' | 'profile';
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ 
  variant = 'rectangular', 
  width, 
  height, 
  className = '', 
  style = {} 
}: SkeletonProps) {
  const baseClassName = `skeleton skeleton-${variant}`;
  const finalClassName = className ? `${baseClassName} ${className}` : baseClassName;
  
  const skeletonStyle: React.CSSProperties = {
    ...style,
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
  };

  return <div className={finalClassName} style={skeletonStyle} />;
}

// Predefined skeleton components for common use cases
export function SkeletonText({ lines = 1, width = '100%' }: { lines?: number; width?: string | number }) {
  return (
    <>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '60%' : width}
          height={16}
          style={{ marginBottom: i < lines - 1 ? 8 : 0 }}
        />
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton variant="rectangular" height={200} style={{ borderRadius: '8px 8px 0 0' }} />
      <div style={{ padding: '16px' }}>
        <SkeletonText lines={2} />
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <Skeleton variant="rectangular" width={60} height={24} style={{ borderRadius: '12px' }} />
          <Skeleton variant="rectangular" width={60} height={24} style={{ borderRadius: '12px' }} />
        </div>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="text" width={100} height={14} />
          <Skeleton variant="text" width={80} height={16} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonAnnouncementCard() {
  return (
    <div className="skeleton-announcement-card" style={{ 
      borderRadius: '15px', 
      overflow: 'hidden',
      border: '1px solid #e6e6e6',
      backgroundColor: '#fff'
    }}>
      <div style={{ display: 'flex', gap: '12px', padding: '12px' }}>
        <Skeleton variant="rectangular" width={100} height={100} style={{ borderRadius: '8px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton variant="text" width="80%" height={18} />
          <Skeleton variant="text" width="60%" height={14} />
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <Skeleton variant="rectangular" width={40} height={20} style={{ borderRadius: '10px' }} />
            <Skeleton variant="rectangular" width={40} height={20} style={{ borderRadius: '10px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
            <Skeleton variant="text" width={80} height={14} />
            <Skeleton variant="text" width={60} height={16} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonReservationCard() {
  return (
    <div className="skeleton-reservation-card" style={{
      borderRadius: '15px',
      overflow: 'hidden',
      border: '1px solid #e6e6e6',
      backgroundColor: '#fff',
      padding: '12px'
    }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <Skeleton variant="rectangular" width={80} height={80} style={{ borderRadius: '8px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton variant="text" width="70%" height={18} />
            <Skeleton variant="rectangular" width={60} height={20} style={{ borderRadius: '10px' }} />
          </div>
          <Skeleton variant="text" width="50%" height={14} />
          <Skeleton variant="text" width="40%" height={14} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
        <Skeleton variant="circular" width={80} height={80} />
        <div style={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={20} style={{ marginBottom: '8px' }} />
          <Skeleton variant="text" width="40%" height={16} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <Skeleton variant="rectangular" width="33%" height={60} style={{ borderRadius: '8px' }} />
        <Skeleton variant="rectangular" width="33%" height={60} style={{ borderRadius: '8px' }} />
        <Skeleton variant="rectangular" width="33%" height={60} style={{ borderRadius: '8px' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton variant="rectangular" height={60} style={{ borderRadius: '8px' }} />
        <Skeleton variant="rectangular" height={60} style={{ borderRadius: '8px' }} />
        <Skeleton variant="rectangular" height={60} style={{ borderRadius: '8px' }} />
      </div>
    </div>
  );
}

export function SkeletonNextRDV() {
  return (
    <div className="nextRDV" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <Skeleton variant="text" width={120} height={20} />
        <Skeleton variant="rectangular" width={80} height={24} style={{ borderRadius: '12px' }} />
      </div>
      <Skeleton variant="text" width="90%" height={16} style={{ marginBottom: '8px' }} />
      <Skeleton variant="text" width="70%" height={14} />
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <Skeleton variant="rectangular" width="33%" height={80} style={{ borderRadius: '8px' }} />
      <Skeleton variant="rectangular" width="33%" height={80} style={{ borderRadius: '8px' }} />
      <Skeleton variant="rectangular" width="33%" height={80} style={{ borderRadius: '8px' }} />
    </div>
  );
}

