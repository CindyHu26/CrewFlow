import React from 'react';

export default function Card({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 mb-4 transition-colors ${className}`}>
      {children}
    </div>
  );
} 