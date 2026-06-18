import { useProStatus } from '../hooks/useProStatus';

export default function ProBanner({ className = "mx-4 mb-4" }: { className?: string }) {
  const { isPro } = useProStatus();
  
  if (isPro) return null;

  return (
    <div className={`p-3 rounded-lg border border-[#D4A843]/20 bg-[#D4A843]/5 flex items-center justify-between gap-3 ${className}`}>
      <div>
        <p className="text-[11px] font-sans font-semibold text-[#D4A843]">
          Early Bird — ₹199/month
        </p>
        <p className="text-[10px] text-[#8892A4] font-sans mt-0.5 font-bold uppercase tracking-wide">
          Remove ads · Full scanner · AI signals
        </p>
      </div>
      <button className="text-[11px] font-sans font-semibold text-[#0A0A0C] 
                         bg-[#D4A843] px-3 py-1.5 rounded-md whitespace-nowrap
                         hover:bg-[#F0D060] transition-colors cursor-pointer">
        Upgrade
      </button>
    </div>
  );
}
