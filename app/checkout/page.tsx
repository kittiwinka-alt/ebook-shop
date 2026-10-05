'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookIdParam = searchParams.get('bookId');

  const [books, setBooks] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'promptpay'>('card');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
    });

    if (bookIdParam) {
      const ids = bookIdParam.split(',').map(id => id.trim());
      supabase
        .from('books')
        .select('*')
        .in('id', ids)
        .then(({ data }) => {
          if (data) setBooks(data);
        });
    }
  }, [bookIdParam, router]);

  const totalAmount = books.reduce((sum, item) => sum + Number(item.price), 0);

  const handlePayWithStripe = async () => {
    if (books.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: books,
          paymentMethod: paymentMethod,
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // ส่งต่อไปหน้าชำระเงินของ Stripe (QR PromptPay หรือ บัตร)
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Stripe');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* แถบลำดับขั้นตอน (Step Indicator) */}
        <div className="flex justify-center items-center mb-10 text-sm">
          <div className="flex flex-col items-center opacity-60">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold mb-2">1</div>
            <span className="font-medium">สินค้าในตะกร้า</span>
          </div>
          <div className="w-24 sm:w-48 h-[2px] bg-slate-300 dark:bg-slate-700 mx-2 sm:mx-4 -mt-6"></div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold mb-2 shadow-lg shadow-indigo-600/30">2</div>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">การจัดส่งและชำระเงิน</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* ฝั่งซ้าย: ตัวเลือกช่องทางชำระเงินผ่าน Stripe */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">เลือกช่องทางชำระเงิน</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. บัตรเครดิต/เดบิต */}
                <div
                  onClick={() => setPaymentMethod('card')}
                  className={`border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between h-36 ${
                    paymentMethod === 'card'
                      ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-600/10'
                      : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 text-2xl">
                    💳 <span className="text-xs font-bold uppercase tracking-wider text-slate-400">VISA / MASTERCARD / JCB</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">ชำระเงินผ่านบัตรเครดิต</h4>
                    <p className="text-xs text-slate-400 mt-1">ปลอดภัยด้วยระบบ Stripe Checkout</p>
                  </div>
                </div>

                {/* 2. PromptPay QR Code */}
                <div
                  onClick={() => setPaymentMethod('promptpay')}
                  className={`border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between h-36 ${
                    paymentMethod === 'promptpay'
                      ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-600/10'
                      : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 text-2xl">
                    📱 <span className="text-xs font-bold uppercase tracking-wider text-slate-400">THAI QR PAYMENT</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">ชำระเงินผ่าน QR Code (พร้อมเพย์)</h4>
                    <p className="text-xs text-slate-400 mt-1">สแกนจ่ายผ่าน Mobile Banking ทุกธนาคาร</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ฝั่งขวา: รายการสรุปยอดเงิน */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm sticky top-10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">รายการสินค้า ({books.length})</h3>
              
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-1">
                {books.map(book => (
                  <div key={book.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate flex-1 text-slate-700 dark:text-slate-300">{book.title}</span>
                    <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">฿{Number(book.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700/60 pt-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>ค่าจัดส่ง</span>
                  <span className="text-teal-600 dark:text-teal-400 font-semibold">ฟรี (ไฟล์ดิจิทัล)</span>
                </div>
                <div className="flex justify-between items-baseline pt-2">
                  <span className="font-bold text-slate-900 dark:text-white">ราคาสุทธิ</span>
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">฿{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/?cart=open')}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  ย้อนกลับ
                </button>
                <button
                  disabled={loading || books.length === 0}
                  onClick={handlePayWithStripe}
                  className="flex-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  {loading ? 'กำลังเชื่อมต่อ Stripe...' : 'ดำเนินการต่อ'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-[#0B1120]" />}>
      <CheckoutContent />
    </Suspense>
  );
}