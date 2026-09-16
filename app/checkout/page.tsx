'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function CheckoutContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get('bookId');
  const router = useRouter();

  const [book, setBook] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingBook, setFetchingBook] = useState(true);

  // ดึงข้อมูลหนังสือที่เลือก
  useEffect(() => {
    async function loadBook() {
      if (!bookId) return;
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();
      
      if (!error && data) {
        setBook(data);
      }
      setFetchingBook(false);
    }
    loadBook();
  }, [bookId]);

  // ฟังก์ชันกดยืนยันคำสั่งซื้อ
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !book) return;

    setLoading(true);

    // สุ่มสร้างเลขออเดอร์ เช่น ORD-123456
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    // บันทึกลงตาราง orders ด้วยสถานะเริ่มต้น PENDING
    const { error } = await supabase.from('orders').insert([
      {
        order_number: orderNumber,
        customer_name: name,
        customer_email: email,
        book_id: book.id,
        total_amount: book.price,
        status: 'PENDING',
      },
    ]);

    setLoading(false);

    if (error) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
      return;
    }

    // ไปยังหน้า Mock Payment ต่อทันที
    router.push(`/payment/${orderNumber}`);
  };

  if (fetchingBook) {
    return <div className="text-center py-20 text-gray-500">กำลังโหลดข้อมูล...</div>;
  }

  if (!book) {
    return (
      <div className="text-center py-20 text-red-500">
        ไม่พบข้อมูลหนังสือ กรุณากลับไปเลือกจากหน้าร้านใหม่
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">สรุปคำสั่งซื้อ E-book</h1>

        {/* สรุปรายการหนังสือที่เลือก */}
        <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-20 h-24 object-cover rounded shadow-sm"
          />
          <div>
            <h2 className="font-bold text-gray-800">{book.title}</h2>
            <p className="text-sm text-gray-500">{book.description}</p>
            <p className="text-lg font-black text-blue-600 mt-2">
              ฿{Number(book.price).toLocaleString()}
            </p>
          </div>
        </div>

        {/* ฟอร์มกรอกข้อมูลผู้ซื้อ */}
        <form onSubmit={handleCheckout} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อ - นามสกุล
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="กรอกชื่อของคุณ"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              อีเมลสำหรับรับไฟล์ E-book
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 mt-4"
          >
            {loading ? 'กำลังสร้างคำสั่งซื้อ...' : 'ยืนยันสั่งซื้อและไปชำระเงิน'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="text-center py-20">กำลังโหลด...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}