import React, { useState } from 'react';
import { Lock, Sparkles, X } from 'lucide-react';

interface ProGateProps {
  feature: string;
  children: React.ReactNode;
  isPro: boolean;
}

export default function ProGate({ feature, children, isPro }: ProGateProps) {
  const [showModal, setShowModal] = useState(false);

  if (isPro) return <>{children}</>;

  return (
    <div className="relative rounded-lg overflow-hidden">
      {/* Blurred overlay of underlying feature */}
      <div className="blur-md pointer-events-none select-none opacity-25">
        {children}
      </div>
      
      {/* Absolute overlay locking the view */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#05070C]/85 backdrop-blur-sm p-4 text-center">
        <div className="w-9 h-9 rounded-full border border-[#D4A843]/30 flex items-center justify-center bg-[#D4A843]/10">
          <Lock size={15} className="text-[#D4A843]" />
        </div>
        <div>
          <p className="text-[#F0F4FF] text-xs font-sans font-semibold tracking-wide">
            {feature}
          </p>
          <p className="text-[#8892A4] text-[10px] font-sans mt-0.5">
            Available in Pro plan
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="text-[10px] font-sans font-semibold text-[#0A0A0C] bg-[#D4A843] hover:bg-[#c29633] transition-colors px-3.5 py-2 rounded-md font-bold"
        >
          Upgrade ₹199/month
        </button>
      </div>

      {/* Payment Upgrade Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-[#D4A843]/30 bg-[#0A0D14] p-5 shadow-2xl relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-[#8892A4] hover:text-[#F0F4FF] transition-colors"
            >
              <X size={16} />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full border border-[#D4A843]/30 flex items-center justify-center bg-[#D4A843]/10 mb-3">
                <Sparkles size={20} className="text-[#D4A843] animate-pulse" />
              </div>
              <h3 className="text-sm font-sans font-semibold text-[#F0F4FF]">
                PRISM PREMIUM ACCESS
              </h3>
              <p className="text-xs text-[#8892A4] font-sans mt-2 leading-relaxed">
                Unlock full algorithmic scanners, multi-timeframe SMC engines, advanced AI swing alerts, and enjoy an ad-free workstation.
              </p>
              
              <div className="mt-4 w-full bg-[#111622] rounded-lg p-3 border border-[#D4A843]/10">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8892A4]">Premium Subscription</span>
                  <span className="text-[#D4A843] font-bold">₹199 / month</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  alert("Subscription payment portal registration is opening soon. The first 100 users receive automated 1-month free premium trials!");
                  setShowModal(false);
                }}
                className="mt-5 w-full text-xs font-sans font-semibold text-[#0A0A0C] bg-[#D4A843] hover:bg-[#b88c32] py-2.5 rounded-lg transition-colors font-bold"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
