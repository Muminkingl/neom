import React from 'react';

export function ToothIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M7 3C4.8 3 3 5 3 8.2c0 3.8 1.4 7.8 2.6 11.6.4 1.4 1.6 2.2 3 2.2 1.2 0 2.2-.9 2.8-2.6.4-1.2.6-2.4.6-3.4 0 1 .2 2.2.6 3.4.6 1.7 1.6 2.6 2.8 2.6 1.4 0 2.6-.8 3-2.2 1.2-3.8 2.6-7.8 2.6-11.6C21 5 19.2 3 17 3c-1.8 0-3.2 1.1-5 1.1S8.8 3 7 3z" />
    </svg>
  );
}

export default ToothIcon;
