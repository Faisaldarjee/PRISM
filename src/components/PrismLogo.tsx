import React, { useId } from 'react';

interface PrismLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const PrismLogo: React.FC<PrismLogoProps> = ({ 
  className = '', 
  size = 40,
  showText = false
}) => {
  const uniqueId = useId().replace(/:/g, '');
  
  const pyramidGlow = `pyramidGlow-${uniqueId}`;
  const soulGlow = `soulGlow-${uniqueId}`;
  const goldMetallic = `goldMetallic-${uniqueId}`;
  const glassLeft = `glassLeft-${uniqueId}`;
  const glassRight = `glassRight-${uniqueId}`;
  const glassBottom = `glassBottom-${uniqueId}`;
  const glassCenter = `glassCenter-${uniqueId}`;
  const softGlow = `softGlow-${uniqueId}`;

  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {/* Premium 3D Gold-Beveled Purple Glass Pyramid */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 200 200" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_4px_24px_rgba(212,168,67,0.35)]"
      >
        <defs>
          {/* Radial gold-orange and purple ambient dispersion behind the pyramid */}
          <radialGradient id={pyramidGlow} cx="100" cy="116" r="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(245, 158, 11, 0.45)" />
            <stop offset="35%" stopColor="rgba(124, 58, 237, 0.28)" />
            <stop offset="70%" stopColor="rgba(212, 168, 67, 0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Central solar core glow */}
          <radialGradient id={soulGlow} cx="100" cy="116" r="45" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="20%" stopColor="#FFF4B8" />
            <stop offset="50%" stopColor="#F59E0B" opacity="0.95" />
            <stop offset="85%" stopColor="#7C3AED" opacity="0.55" />
            <stop offset="100%" stopColor="#05070C" opacity="0" />
          </radialGradient>

          {/* Luxury multi-tier golden metallic gradient for border and bevel structure */}
          <linearGradient id={goldMetallic} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="20%" stopColor="#FDE047" />
            <stop offset="45%" stopColor="#CA8A04" />
            <stop offset="70%" stopColor="#FFF4CE" />
            <stop offset="85%" stopColor="#D4A843" />
            <stop offset="100%" stopColor="#854D00" />
          </linearGradient>

          {/* Translucent glass gradients for distinct 3D lighting facets */}
          <linearGradient id={glassLeft} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#4C1D95" />
            <stop offset="100%" stopColor="#1E1B4B" />
          </linearGradient>

          <linearGradient id={glassRight} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#2E1065" />
          </linearGradient>

          <linearGradient id={glassBottom} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="50%" stopColor="#2D124E" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          <linearGradient id={glassCenter} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF2A1" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="80%" stopColor="#EA580C" opacity="0.9" />
            <stop offset="100%" stopColor="#7C3AED" opacity="0.75" />
          </linearGradient>

          <filter id={softGlow} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        {/* Ambient atmospheric display bloom */}
        <circle cx="100" cy="116" r="90" fill={`url(#${pyramidGlow})`} />

        {/* Outer background backing shadow panel */}
        <polygon points="100,24 28,156 172,156" fill="#04050A" />

        {/* 3D Glass Facet Layers */}
        {/* Left Facet */}
        <polygon points="100,24 28,156 62,136 100,84" fill={`url(#${glassLeft})`} />

        {/* Right Facet */}
        <polygon points="100,24 172,156 138,136 100,84" fill={`url(#${glassRight})`} />

        {/* Bottom Facet */}
        <polygon points="28,156 172,156 138,136 62,136" fill={`url(#${glassBottom})`} />

        {/* Center/Inner Facet */}
        <polygon points="100,84 62,136 138,136" fill={`url(#${glassCenter})`} />

        {/* Golden-white solar soul glow center */}
        <circle cx="100" cy="116" r="35" fill={`url(#${soulGlow})`} />
        
        {/* Core luminous spot (the bright heart) */}
        <circle cx="100" cy="116" r="14" fill="#FFFFFF" opacity="0.95" filter={`url(#${softGlow})`} />
        <circle cx="100" cy="116" r="7" fill="#FFFFFF" />

        {/* Thicker Luxury Golden Bevel Frames */}
        {/* Outer triangle frame */}
        <polygon 
          points="100,24 28,156 172,156" 
          fill="none" 
          stroke={`url(#${goldMetallic})`} 
          strokeWidth="9" 
          strokeLinejoin="round" 
        />

        {/* Inner triangle frame */}
        <polygon 
          points="100,84 62,136 138,136" 
          fill="none" 
          stroke={`url(#${goldMetallic})`} 
          strokeWidth="6" 
          strokeLinejoin="round" 
        />

        {/* Connecting corner bevel ridges */}
        {/* Apex to Inner-Apex */}
        <line 
          x1="100" y1="24" 
          x2="100" y2="84" 
          stroke={`url(#${goldMetallic})`} 
          strokeWidth="6" 
          strokeLinecap="round"
        />
        {/* Bottom-Left to Inner-Bottom-Left */}
        <line 
          x1="28" y1="156" 
          x2="62" y2="136" 
          stroke={`url(#${goldMetallic})`} 
          strokeWidth="6" 
          strokeLinecap="round"
        />
        {/* Bottom-Right to Inner-Bottom-Right */}
        <line 
          x1="172" y1="156" 
          x2="138" y2="136" 
          stroke={`url(#${goldMetallic})`} 
          strokeWidth="6" 
          strokeLinecap="round"
        />

        {/* Premium Specular Sparkles/Glints at Vertices */}
        <circle cx="100" cy="24" r="5" fill="#FFFFFF" />
        <circle cx="28" cy="156" r="4" fill="#FFF4CE" />
        <circle cx="172" cy="156" r="4" fill="#FFF4CE" />
        <circle cx="100" cy="84" r="3.5" fill="#FFFFFF" opacity="0.95" />

        {/* Soft diagonal highlight sweep to accent the glass faces */}
        <line 
          x1="100" y1="35" 
          x2="55" y2="112" 
          stroke="#FFFFFF" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          opacity="0.65" 
        />
      </svg>

      {showText && (
        <div className="flex flex-col select-none leading-none pt-0.5">
          <div className="flex items-center">
            <span className="font-display text-[18px] font-black uppercase tracking-[0.25em] text-[#E5C060] leading-none">
              PRISM
            </span>
          </div>
          <span className="text-[7px] font-data tracking-[0.15em] text-[#8892A4] mt-1 block font-bold uppercase whitespace-nowrap">
            EVERY ANGLE. ONE SIGNAL.
          </span>
        </div>
      )}
    </div>
  );
};
