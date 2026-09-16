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

  // ดึงข้อมูลออเดอร์ตาม order_number
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

  // จำลองการชำระเงินสำเร็จ -> อัปเดตสถานะเป็น PAID
  const handleSimulatePayment = async () => {
    setPaying(true);

    const { error } = await supabase
      .from('orders')
      .update({ status: 'PAID' })
      .eq('order_number', orderId);

    setPaying(false);

    if (error) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
      return;
    }

    // อัปเดตสถานะบนหน้าจอทันที
    setOrder((prev: any) => ({ ...prev, status: 'PAID' }));
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500">กำลังโหลดข้อมูลคำสั่งซื้อ...</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-20 text-red-500">
        ไม่พบข้อมูลคำสั่งซื้อหมายเลข {orderId}
      </div>
    );
  }

  const isPaid = order.status === 'PAID';

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
        
        {/* ป้ายเตือน DEMO ONLY บังคับตาม Requirement */}
        <div className="bg-amber-100 border-2 border-amber-500 text-amber-900 px-4 py-3 rounded-lg text-center font-bold mb-6">
          ⚠️ DEMO ONLY — ระบบจำลองการชำระเงิน ห้ามโอนเงินจริง
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-4">
          การชำระเงินสำหรับคำสั่งซื้อ: <span className="text-blue-600">{order.order_number}</span>
        </h1>

        {/* ข้อมูลสรุปคำสั่งซื้อ */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 space-y-2 text-sm text-gray-700">
          <p><strong>รายการหนังสือ:</strong> {order.books?.title}</p>
          <p><strong>ผู้สั่งซื้อ:</strong> {order.customer_name}</p>
          <p><strong>อีเมล:</strong> {order.customer_email}</p>
          <p><strong>ยอดชำระ:</strong> <span className="text-lg font-black text-gray-900">฿{Number(order.total_amount).toLocaleString()}</span></p>
          <p>
            <strong>สถานะปัจจุบัน:</strong>{' '}
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
              isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {order.status}
            </span>
          </p>
        </div>

        {/* ปุ่มควบคุมและผลลัพธ์ */}
        {!isPaid ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 text-center">
              กดปุ่มด้านล่างเพื่อจำลองสถานะว่าลูกค้าชำระเงินเรียบร้อยแล้ว
            </p>
            <button
              onClick={handleSimulatePayment}
              disabled={paying}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              {paying ? 'กำลังบันทึกสถานะ...' : '✔ จำลองชำระเงินสำเร็จ'}
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 p-5 rounded-lg text-center space-y-3">
            <h2 className="text-green-800 font-bold text-lg">ชำระเงินจำลองสำเร็จ (PAID)</h2>
            <p className="text-sm text-gray-600">
              สถานะคำสั่งซื้อได้รับการอัปเดตเรียบร้อยแล้ว ระบบเตรียมจัดส่งไฟล์ไปยังอีเมล {order.customer_email}
            </p>
            <button
              onClick={() => router.push(`/order-status?orderNumber=${order.order_number}&email=${order.customer_email}`)}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              🔍 ไปยังหน้าติดตามคำสั่งซื้อ
            </button>
          </div>
        )}
      </div>
    </main>
  );
}