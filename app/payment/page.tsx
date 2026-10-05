'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const amountParam = searchParams.get('amount') || '0';
  const bookIdsParam = searchParams.get('bookIds') || '';

  const [paymentMethod, setPaymentMethod] = useState('promptpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
    });
  }, []);

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    
    if (user) {
      // คลีนค่าตัวเลขให้ชัวร์ว่าไม่มีลูกน้ำ (,) ติดไป
      const finalAmount = parseFloat(amountParam.replace(/,/g, '')) || 0;

      // เพิ่ม .select() เพื่อให้ Supabase รีเทิร์นผลลัพธ์กลับมาเช็คได้
      const { data, error } = await supabase.from('orders').insert([
        {
          user_id: user.id,
          book_ids: bookIdsParam,
          total_amount: finalAmount,
          payment_method: paymentMethod,
          status: 'completed'
        }
      ]).select(); 

      if (error) {
        // ให้แจ้งเตือน Error บนหน้าจอแบบละเอียด
        alert('พบข้อผิดพลาดจาก Supabase:\n' + JSON.stringify(error, null, 2));
        setIsProcessing(false);
        return; // หยุดการทำงาน ไม่ต้องเด้งไปหน้าอื่น
      }
    } else {
      alert('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      setIsProcessing(false);
      return;
    }

    // ถ้าบันทึกสำเร็จ (ไม่มี Error) ให้เปลี่ยนหน้าได้เลย
    router.push('/profile?tab=orders');
  };

  return (
    <main className="min-h-screen bg-[#0B1120] text-slate-200 font-sans flex flex-col items-center justify-center p-4">
      
      <div className="w-full max-w-md mb-6">
        <button 
          onClick={() => router.back()}
          className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-2"
        >
          ← กลับไปหน้ายืนยันคำสั่งซื้อ
        </button>
      </div>

      <div className="w-full max-w-md bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">เลือกช่องทางการชำระเงิน</h1>
          <p className="text-sm text-slate-400">
            ยอดชำระสุทธิ: <span className="text-xl font-black text-indigo-400">฿{Number(amountParam).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-[#0F172A] rounded-xl mb-6 border border-slate-700/50">
          <button 
            onClick={() => setPaymentMethod('promptpay')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              paymentMethod === 'promptpay' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-white'
            }`}
          >
            สแกน QR Code
          </button>
          <button 
            onClick={() => setPaymentMethod('card')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              paymentMethod === 'card' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-white'
            }`}
          >
            บัตรเครดิต / เดบิต
          </button>
        </div>

        {paymentMethod === 'promptpay' && (
          <div className="bg-white rounded-xl p-6 flex flex-col items-center justify-center mb-8 border-4 border-indigo-500/20">
            <div className="w-48 h-48 bg-slate-100 flex items-center justify-center mb-4 rounded-lg border-2 border-dashed border-slate-300 relative overflow-hidden">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" 
                alt="QR Code" 
                className="w-full h-full object-cover opacity-80"
              />
            </div>
            <p className="text-slate-800 font-bold text-sm">พร้อมเพย์ (PromptPay)</p>
            <p className="text-slate-500 text-xs mt-1">ชื่อบัญชี: บจก. วิน เดฟ สโตร์</p>
          </div>
        )}

        {paymentMethod === 'card' && (
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs text-slate-400 mb-1">หมายเลขบัตร</label>
              <input type="text" placeholder="0000 0000 0000 0000" className="w-full bg-[#0F172A] border border-slate-700 text-white rounded-lg px-4 py-3 outline-none text-sm font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">วันหมดอายุ</label>
                <input type="text" placeholder="MM/YY" className="w-full bg-[#0F172A] border border-slate-700 text-white rounded-lg px-4 py-3 outline-none text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">CVC</label>
                <input type="text" placeholder="123" className="w-full bg-[#0F172A] border border-slate-700 text-white rounded-lg px-4 py-3 outline-none text-sm font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">ชื่อบนบัตร</label>
              <input type="text" placeholder="WIN DEV" className="w-full bg-[#0F172A] border border-slate-700 text-white rounded-lg px-4 py-3 outline-none text-sm uppercase" />
            </div>
          </div>
        )}

        <button 
          onClick={handleConfirmPayment}
          disabled={isProcessing || !user}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex justify-center items-center gap-2"
        >
          {isProcessing ? 'กำลังดำเนินการบันทึก...' : 'ยืนยันการชำระเงิน'}
        </button>

      </div>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B1120]" />}>
      <PaymentContent />
    </Suspense>
  );
}