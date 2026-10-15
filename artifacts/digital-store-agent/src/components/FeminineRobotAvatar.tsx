export function FeminineRobotAvatar({ size = 44, decorative = false }: { size?: number; decorative?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 140"
      fill="none"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'رُبى، مساعدة المتجر الرقمية'}
      aria-hidden={decorative}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M23 67C15 41 27 17 53 12C79 6 100 23 98 51C97 69 102 86 108 103L91 119L27 115L11 96C19 88 24 78 23 67Z" fill="#4B94CC" />
      <path d="M31 42C36 22 55 14 72 19C86 22 94 34 94 49L83 44C75 38 63 35 51 40L31 49V42Z" fill="#75B6E3" />
      <path d="M30 45C21 54 19 72 25 87L35 78L36 53L30 45Z" fill="#367DB7" />
      <path d="M91 45C101 53 101 71 95 86L85 78L85 52L91 45Z" fill="#367DB7" />
      <rect x="22" y="37" width="76" height="71" rx="31" fill="#DDF2FF" stroke="#F7FCFF" strokeWidth="3" />
      <path d="M36 66C40 60 47 60 52 66" stroke="#2E668F" strokeWidth="3" strokeLinecap="round" />
      <path d="M67 66C72 60 79 60 84 66" stroke="#2E668F" strokeWidth="3" strokeLinecap="round" />
      <path d="M38 73C42 78 49 78 53 73" stroke="#25668F" strokeWidth="4" strokeLinecap="round" />
      <path d="M67 73C71 78 78 78 82 73" stroke="#25668F" strokeWidth="4" strokeLinecap="round" />
      <path d="M57 80L54 87C58 90 63 90 67 87L64 80" fill="#A6D9EE" />
      <path d="M51 96C56 101 65 101 70 96" stroke="#397CAD" strokeWidth="3" strokeLinecap="round" />
      <circle cx="30" cy="83" r="4" fill="#82C9E6" fillOpacity=".6" />
      <circle cx="90" cy="83" r="4" fill="#82C9E6" fillOpacity=".6" />
      <path d="M18 120C27 108 40 105 60 105C80 105 93 108 102 120V135H18V120Z" fill="#B7DDF6" stroke="#F7FCFF" strokeWidth="3" />
      <path d="M49 109L60 119L71 109" stroke="#4B94CC" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="12" r="5" fill="#A7E5F2" stroke="#F7FCFF" strokeWidth="2" />
    </svg>
  );
}
