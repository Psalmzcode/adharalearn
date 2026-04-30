interface BootcampLogoProps {
  height?: number;
  tagline?: string;
  onClick?: () => void;
}

export function BootcampLogo({ height = 44, tagline = 'Bootcamp', onClick }: BootcampLogoProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 50"
      height={height} width={height * (220 / 50)}
      aria-label="AdharaEdu" style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}>
      <rect x="1" y="4" width="38" height="40" rx="12" ry="14" fill="#1E7FD4" />
      <polygon points="20,10 23.5,18.5 33,18.5 25.5,24 28.5,33 20,27.5 11.5,33 14.5,24 7,18.5 16.5,18.5" fill="#F5C518" />
      <text x="46" y="33" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="26" className="logo-adhara">Adhara</text>
      <text x="153" y="14" fontFamily="Arial, sans-serif" fontWeight="700" fontStyle="italic" fontSize="12" fill="#1E7FD4">Edu</text>
      <text x="46" y="46" fontFamily="Georgia, serif" fontStyle="italic" fontSize="9.5" className="logo-tagline" letterSpacing="0.3">{tagline}</text>
    </svg>
  );
}
