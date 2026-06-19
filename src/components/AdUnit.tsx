import { useEffect, useRef } from 'react';

interface AdUnitProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  className?: string;
}

export default function AdUnit({ slot, format = 'auto', className = '' }: AdUnitProps) {
  const adRef = useRef<HTMLElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    const insNode = adRef.current;
    if (!insNode) return;

    const pushAd = () => {
      if (initialized.current) return;
      initialized.current = true;
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    };

    // If offsetWidth is already set and > 0, push immediately
    if (insNode.offsetWidth > 0) {
      pushAd();
      return;
    }

    // Otherwise, observe until element size is resolved
    let observer: ResizeObserver | null = null;
    try {
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            pushAd();
            observer?.disconnect();
            break;
          }
        }
      });
      observer.observe(insNode);
    } catch (e) {
      // Fallback if ResizeObserver is not supported in window/tests
      pushAd();
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  return (
    <div className={`ad-wrapper ${className}`}>
      <p className="text-[9px] text-[#4A5568] uppercase tracking-widest 
                    text-center mb-1 font-sans">
        Advertisement
      </p>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-7951243603367836"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
