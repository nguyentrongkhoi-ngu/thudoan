'use client';

import React from 'react';

interface AvatarPlaceholderProps {
  className?: string;
  size?: number | string;
}

export default function AvatarPlaceholder({ className = "", size = "100%" }: AvatarPlaceholderProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      className={className}
      style={{ width: size, height: size }}
    >
      <circle cx="50" cy="50" r="50" fill="#e2e2e2" />
      <path 
        d="M36,40c2.2-5.4,7.5-9,13.9-9c8,0,14,6,15.1,13.9c0,0.1,0,0.1,0,0.2c0,0,0,0,0,0c0.1,1,0.1,1.9,0.1,2.9c0,5.1-2.9,9.8-7.6,12c2.3,1.3,4.3,3.1,5.7,5.2c2.1-1.3,4,1.6,5.4,5.6c8,0.6,16.1,3.2,16.4,7.2c0,0,0,0,0,0 c0,0.5,0,0.9-0.1,1.4c-1.4,8-24.9,14.6-53.9,14.6s-52.4-6.6-53.9-14.6c-0.1-0.5-0.1-0.9-0.1-1.4l0,0c0,0,0,0,0,0 c0.2-3.4,6.8-5.8,13.9-6.7c1.7-1.9,3.8-3.4,6.1-2.9c1.9-2.2,3.9-3.9,6-3.9c1.7,0,3.3,1.3,4.5,3.2c3.4-1.5,6.2-4.4,7.6-8l2.9-0 C43.2,51.9,39.7,55.4,35,56.9c0.8-0.6,1.5-1.2,2.2-1.9c3.8-3.8,4-10.1,0.4-14.2c-0.1-0.1-0.2-0.2-0.3-0.4c-0.2-0.2-0.4-0.4-0.6-0.5 C36.4,39.7,36.2,39.8,36,40C36,39.9,36.1,39.9,36,40L36,40z"
        fill="#aaaaaa"
      />
    </svg>
  );
} 