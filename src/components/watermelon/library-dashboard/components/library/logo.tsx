import type { SVGProps } from "react";

export function Logo({ className = "size-8", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="neomDentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00a5b8" />
          <stop offset="100%" stopColor="#007283" />
        </linearGradient>
      </defs>
      {/* Rounded squircle background */}
      <rect width="40" height="40" rx="12" fill="url(#neomDentGrad)" />
      {/* Stylized Dental Tooth mark */}
      <path
        d="M14 9C11.5 9 9.5 11 9.5 14.5c0 4 1.5 8.2 2.8 12.2.4 1.4 1.7 2.3 3.1 2.3 1.3 0 2.3-.9 3-2.7.4-1.2.6-2.5.6-3.6 0 1.1.2 2.4.6 3.6.6 1.8 1.7 2.7 3 2.7 1.5 0 2.7-.9 3.1-2.3 1.3-4 2.8-8.2 2.8-12.2C28.5 11 26.5 9 24 9c-1.9 0-3.4 1.2-5 1.2S15.9 9 14 9z"
        fill="white"
      />
      {/* Subtle shine dot */}
      <circle cx="23" cy="13.5" r="1.5" fill="white" fillOpacity="0.8" />
    </svg>
  );
}

export default Logo;
