'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MockPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [deliveryResult, setDeliveryResult] = useState<any>(null);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;
      const { data, error } = await supabase
        .from('orders')
        .select('*, books(*)')
        .eq('order_number', orderId)
        .single();

      if (!error && data) {
        setOrder(data);
      }
      setLoading(false);
    }
    fetchOrder();
  }, [orderId]);

  const handleSimulatePayment = async () => {
    setPaying(true);

    try {
      const res = await fetch('/api/mock-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderId }),
      });

      const data = await res.json();
      setPaying(false);

      if (data.success) {
        setOrder((prev: any) => ({ ...prev, status: 'PAID' }));
        setDeliveryResult(data);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกสถานะ');
      }
    } catch (err) {
      setPaying(false);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-500">กำลังโหลดข้อมูลคำสั่งซื้อ...</div>;
  }

  if (!order) {
    return <div className="text-center py-20 text-red-500">ไม่พบข้อมูลคำสั่งซื้อหมายเลข {orderId}</div>;
  }

  const isPaid = order.status === 'PAID';

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        
        {/* ป้าย DEMO ONLY */}
        <div className="bg-amber-100 border-2 border-amber-500 text-amber-900 px-4 py-3 rounded-xl text-center font-bold mb-6">
          ⚠️ DEMO ONLY — ระบบจำลองการชำระเงิน ห้ามโอนเงินจริง
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-4">
          คำสั่งซื้อ: <span className="text-blue-600">{order.order_number}</span>
        </h1>

        {/* สรุปข้อมูลคำสั่งซื้อ */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-2 text-sm text-slate-700">
          <p><strong>หนังสือ:</strong> {order.books?.title}</p>
          <p><strong>ผู้สั่งซื้อ:</strong> {order.customer_name}</p>
          <p><strong>อีเมล:</strong> {order.customer_email}</p>
          <p><strong>ยอดชำระ:</strong> ฿{Number(order.total_amount).toLocaleString()}</p>
          <p>
            <strong>สถานะ:</strong>{' '}
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
              isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {order.status}
            </span>
          </p>
        </div>

        {/* ปุ่มชำระเงินจำลอง หรือกล่องแสดงผลการส่งมอบ */}
        {!isPaid ? (
          <div className="space-y-4">
            <button
              onClick={handleSimulatePayment}
              disabled={paying}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition disabled:opacity-50 shadow-sm"
            >
              {paying ? 'กำลังบันทึกข้อมูล...' : '✔ จำลองชำระเงินสำเร็จ'}
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 text-2xl mb-1">
              ✓
            </div>
            <h2 className="text-emerald-900 font-bold text-lg">สถานะคำสั่งซื้อ: PAID</h2>

            {/* กล่องแสดงผลการส่งอีเมลจำลองสำหรับการทดสอบ */}
            <div className="bg-white border border-emerald-200 p-4 rounded-lg text-left text-xs sm:text-sm text-slate-700 space-y-1.5">
              <p className="font-bold text-emerald-800">📧 บันทึกการส่งมอบ (Email Delivery Log):</p>
              <p>• ส่งไปยัง: <span className="font-mono">{order.customer_email}</span></p>
              <p>• หัวข้อ: ลิงก์ดาวน์โหลด E-book ({order.books?.title})</p>
              <p>• สถานะอีเมล: <span className="text-emerald-600 font-bold">ส่งสำเร็จ (Simulated Success)</span></p>
            </div>

            {/* ลิงก์ดาวน์โหลดชั่วคราวสำหรับการทดสอบ */}
            <div className="pt-2">
              <p className="text-xs text-slate-500 mb-2">ลิงก์ดาวน์โหลดชั่วคราว (หมดอายุภายใน 60 นาที):</p>
              <a
                href={deliveryResult?.downloadLink || '#'}
                onClick={(e) => {
                  e.preventDefault();
                  alert(`จำลองการเปิดไฟล์: ${order.books?.file_path || 'E-book.pdf'}\nลิงก์มีความปลอดภัยและหมดอายุภายใน 1 ชั่วโมง`);
                }}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm py-2.5 px-5 rounded-lg transition shadow-sm"
              >
                📥 ทดสอบเปิดไฟล์ E-book (Temporary Link)
              </a>
            </div>

            <div className="pt-3 border-t border-emerald-100">
              <button
                onClick={() => router.push(`/order-status?orderNumber=${order.order_number}&email=${order.customer_email}`)}
                className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
              >
                🔍 ดูหน้าติดตามสถานะคำสั่งซื้อแบบเต็ม →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}