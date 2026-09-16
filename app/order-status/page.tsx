'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function OrderStatusContent() {
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams.get('orderNumber') || '';
  const initialEmail = searchParams.get('email') || '';

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState(initialEmail);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ฟังก์ชันค้นหาคำสั่งซื้อ (บังคับจับคู่ทั้งเลขคำสั่งซื้อและอีเมลเพื่อความปลอดภัย)
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      setErrorMsg('กรุณากรอกทั้งเลขคำสั่งซื้อและอีเมล');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSearched(true);

    const { data, error } = await supabase
      .from('orders')
      .select('*, books(*)')
      .eq('order_number', orderNumber.trim())
      .eq('customer_email', email.trim())
      .single();

    setLoading(false);

    if (error || !data) {
      setOrder(null);
      setErrorMsg('ไม่พบข้อมูลคำสั่งซื้อ หรืออีเมลไม่ถูกต้อง');
    } else {
      setOrder(data);
    }
  };

  // ดึงข้อมูลอัตโนมัติหากมี Query Parameter ติดมากับ URL
  useEffect(() => {
    if (initialOrderNumber && initialEmail) {
      handleSearch();
    }
  }, [initialOrderNumber, initialEmail]);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🔍 ติดตามสถานะคำสั่งซื้อ</h1>
          <p className="text-sm text-gray-600 mt-1">
            ค้นหาด้วยเลขคำสั่งซื้อและอีเมลที่ใช้สั่งซื้อ
          </p>
        </div>

        {/* ฟอร์มค้นหา */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เลขคำสั่งซื้อ (เช่น ORD-xxxxxx)
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-123456"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                อีเมลที่ใช้สั่งซื้อ
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'กำลังค้นหา...' : 'ตรวจสอบสถานะ'}
            </button>
          </form>

          {errorMsg && (
            <p className="text-red-500 text-sm mt-4 text-center">{errorMsg}</p>
          )}
        </div>

        {/* ผลลัพธ์คำสั่งซื้อ */}
        {order && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <span className="text-sm text-gray-500">หมายเลขคำสั่งซื้อ</span>
              <span className="font-bold text-gray-900">{order.order_number}</span>
            </div>

            <div className="flex gap-4 items-center">
              <img
                src={order.books?.cover_url}
                alt={order.books?.title}
                className="w-16 h-20 object-cover rounded"
              />
              <div>
                <h3 className="font-bold text-gray-800">{order.books?.title}</h3>
                <p className="text-sm text-gray-500">ยอดชำระ: ฿{Number(order.total_amount).toLocaleString()}</p>
              </div>
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">สถานะคำสั่งซื้อ:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  order.status === 'PAID'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {order.status}
              </span>
            </div>

            {/* ส่วนการส่งมอบ/ดาวน์โหลด เมื่อสถานะเป็น PAID */}
            {order.status === 'PAID' ? (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center space-y-2">
                <p className="text-sm text-green-800 font-medium">
                  ✅ คำสั่งซื้อชำระเงินเรียบร้อยแล้ว
                </p>
                <p className="text-xs text-gray-600">
                  ระบบได้ส่งลิงก์ดาวน์โหลดไปยังอีเมล <strong>{order.customer_email}</strong> แล้ว
                </p>
              </div>
            ) : (
              <div className="text-center pt-2">
                <Link
                  href={`/payment/${order.order_number}`}
                  className="inline-block bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  ไปที่หน้าชำระเงิน (Mock Payment)
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← กลับไปหน้าร้านค้า
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function OrderStatusPage() {
  return (
    <Suspense fallback={<div className="text-center py-20">กำลังโหลด...</div>}>
      <OrderStatusContent />
    </Suspense>
  );
}