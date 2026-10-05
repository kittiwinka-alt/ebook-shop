'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface OrderItem {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  user_id: string;
  book_ids: string;
  stripe_session_id?: string;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
   const [adminUser, setAdminUser] = useState<any>(null);

  // ดึงรายการสั่งซื้อทั้งหมดจาก Supabase
  const fetchOrders = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    setAdminUser(session.user);

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 flex flex-col md:flex-row w-full max-w-full overflow-x-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#0F172A] border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30">
              W
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight">[Admin Panel]</h1>
              <p className="text-[11px] text-slate-400">Win's Dev Store</p>
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">เมนูจัดการระบบ</p>
          <nav className="flex flex-col gap-1.5">
            <Link
              href="/admin"
              className="flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors"
            >
              <span className="flex items-center gap-2.5">📊 ภาพรวม</span>
            </Link>

            <Link
              href="/admin/books"
              className="flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors"
            >
              <span className="flex items-center gap-2.5">📦 จัดการสินค้า</span>
            </Link>

            <Link
              href="/admin/orders"
              className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/20 text-sm"
            >
              <span className="flex items-center gap-2.5">🧾 รายการสั่งซื้อ</span>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{orders.length}</span>
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col gap-3">
            <div className="px-1 text-xs">
              <span className="text-slate-500 block text-[10px]">ผู้ดูแลระบบ:</span>
              <span className="text-slate-300 font-medium truncate block">
                {adminUser?.email || 'kittiwin.ka@rmuti.ac.th'}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-medium mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Supabase DB เชื่อมต่ออยู่
              </div>
              <p className="text-slate-500 text-[10px]">Postgres • Latency ปกติ</p>
            </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-medium px-2 py-1.5 transition-colors"
          >
            ← กลับไปหน้าร้าน
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">🧾 รายการสั่งซื้อทั้งหมด (Orders)</h2>
            <p className="text-slate-400 text-sm mt-1">ประวัติการชำระเงินและคำสั่งซื้อทั้งหมดที่บันทึกลงในระบบ</p>
          </div>

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            🔄 {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
        </div>

        {/* Orders Table */}
        <div className="bg-[#131C31] border border-slate-800/80 rounded-2xl p-6 shadow-lg">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">กำลังโหลดข้อมูลรายการสั่งซื้อ...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">ยังไม่มีคำสั่งซื้อในระบบ</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-medium">
                    <th className="pb-3 px-3">รหัสสั่งซื้อ</th>
                    <th className="pb-3 px-3">วันที่สั่งซื้อ</th>
                    <th className="pb-3 px-3">User ID</th>
                    <th className="pb-3 px-3">ยอดรวม</th>
                    <th className="pb-3 px-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orders.map((ord) => {
                    const shortId = `ORD-${ord.id.substring(0, 8).toUpperCase()}`;
                    const orderDate = new Date(ord.created_at).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-3 font-semibold text-indigo-400">
                          {shortId}
                        </td>
                        <td className="py-3.5 px-3 text-slate-300">
                          {orderDate}
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 text-xs font-mono truncate max-w-[140px]">
                          {ord.user_id}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-white">
                          ฿{Number(ord.total_amount).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-full">
                            ชำระเงินสำเร็จ
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}