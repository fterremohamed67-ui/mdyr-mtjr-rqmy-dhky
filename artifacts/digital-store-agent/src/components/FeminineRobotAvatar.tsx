import { useId } from 'react';

export function FeminineRobotAvatar({ size = 44, decorative = false }: { size?: number; decorative?: boolean }) {
  const gradientId = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 140"
      fill="none"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'روبي، مساعدة المتجر الرقمية'}
      aria-hidden={decorative}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${gradientId}-shell`} x1="19" y1="14" x2="103" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A9F5FF" />
          <stop offset=".48" stopColor="#4BB8E8" />
          <stop offset="1" stopColor="#17649D" />
        </linearGradient>
        <linearGradient id={`${gradientId}-visor`} x1="29" y1="43" x2="91" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#153857" />
          <stop offset="1" stopColor="#081A30" />
        </linearGradient>
        <linearGradient id={`${gradientId}-body`} x1="28" y1="108" x2="87" y2="139" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5BD9F5" />
          <stop offset="1" stopColor="#2675B5" />
        </linearGradient>
      </defs>
      <path d="M60 7L69 17H51L60 7Z" fill="#8DF4FF" />
      <path d="M55 16H65V25H55z" fill="#2E8FC3" />
      <circle cx="60" cy="11" r="3" fill="#E4FFFF" />
      <path d="M21 55L29 28L47 17H73L91 28L99 55L94 91L79 108H41L26 91L21 55Z" fill={`url(#${gradientId}-shell)`} stroke="#B8F7FF" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M29 48L36 33L48 25H72L84 33L91 48L87 78L76 91H44L33 78L29 48Z" fill={`url(#${gradientId}-visor)`} stroke="#72E7FF" strokeWidth="2" strokeLinejoin="round" />
      <path d="M38 58L45 53H53L57 58V65H39L36 62L38 58Z" fill="#72F1FF" />
      <path d="M82 58L75 53H67L63 58V65H81L84 62L82 58Z" fill="#72F1FF" />
      <path d="M42 59H52M68 59H78" stroke="#EDFFFF" strokeOpacity=".9" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M55 71H65L69 77L65 83H55L51 77L55 71Z" fill="#1C84B9" stroke="#59DDF8" strokeWidth="1.5" />
      <path d="M53 87H67" stroke="#73EDFF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M21 49L12 55V77L27 83L29 72L25 58L21 49Z" fill="#267CB2" stroke="#72DDF6" strokeWidth="2" strokeLinejoin="round" />
      <path d="M99 49L108 55V77L93 83L91 72L95 58L99 49Z" fill="#267CB2" stroke="#72DDF6" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="19" cy="66" r="3" fill="#B4F9FF" />
      <circle cx="101" cy="66" r="3" fill="#B4F9FF" />
      <path d="M38 104L28 112L23 135H97L92 112L82 104L75 114H45L38 104Z" fill={`url(#${gradientId}-body)`} stroke="#A9F4FF" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M48 109L60 121L72 109" stroke="#D2FBFF" strokeOpacity=".85" strokeWidth="2" strokeLinejoin="round" />
      <path d="M42 128H78" stroke="#80E9FA" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
