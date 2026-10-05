'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const hasCalledVerify = useRef(false);

  useEffect(() => {
    async function recordOrder() {
      if (!sessionId || hasCalledVerify.current) return;
      hasCalledVerify.current = true;

      try {
        await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          localStorage.removeItem(`cart_user_${session.user.id}`);
        }
      } catch (err) {
        console.error('Failed to verify order:', err);
      } finally {
        setLoading(false);
      }
    }

    recordOrder();
  }, [sessionId]);

  // ใช้ window.location.replace เพื่อแทนที่แท็บเดิมทันที ไม่สร้างประวัติและไม่เปิดแท็บใหม่
  const handleGoToLibrary = () => {
    window.location.replace('/profile?tab=library');
  };

  const handleGoHome = () => {
    window.location.replace('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-slate-200 dark:border-slate-700/60">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 font-bold">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">ชำระเงินสำเร็จ!</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          {loading 
            ? 'กำลังบันทึกรายการคำสั่งซื้อเข้าสู่ระบบ...' 
            : 'ระบบได้เพิ่ม E-Book เข้าสู่ชั้นหนังสือของคุณเรียบร้อยแล้ว'}
        </p>
        
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGoToLibrary}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            ไปที่ชั้นหนังสือของฉัน
          </button>

          <button
            type="button"
            onClick={handleGoHome}
            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold py-3 rounded-xl transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            กลับสู่หน้าแรก
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-[#0B1120]" />}>
      <SuccessContent />
    </Suspense>
  );
}