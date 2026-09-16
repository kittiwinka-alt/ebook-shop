'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBook() {
      if (!bookId) return;
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (!error && data) {
        setBook(data);
      }
      setLoading(false);
    }
    fetchBook();
  }, [bookId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        กำลังโหลดรายละเอียด...
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500 font-bold">ไม่พบข้อมูลหนังสือ</p>
        <Link href="/" className="text-blue-600 dark:text-blue-400 underline text-sm">
          กลับหน้าร้าน
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 py-10 px-4 sm:px-6 transition-colors duration-200">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 sm:p-8">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 mb-6 transition-colors"
          >
            ← กลับไปหน้าร้าน
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* กรอบภาพสินค้า */}
            <div className="w-full h-80 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* รายละเอียดสินค้า */}
            <div className="flex flex-col justify-between h-full">
              <div>
                <span className="inline-block px-2.5 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold rounded mb-3 border border-blue-200/50 dark:border-blue-800">
                  Digital E-Book (PDF)
                </span>
                
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-4">
                  {book.title}
                </h1>
                
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base mb-6">
                  {book.description}
                </p>

                {/* กล่องสารบัญและสิ่งที่ได้รับ */}
                {book.details && (
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 my-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
                      เนื้อหาและสิ่งที่จะได้รับ:
                    </h3>
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {book.details}
                    </div>
                  </div>
                )}
              </div>

              {/* ส่วนราคาและปุ่มสั่งซื้อ */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-sm text-slate-400 dark:text-slate-500">ราคาจำหน่าย</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    ฿{Number(book.price).toLocaleString()}
                  </span>
                </div>

                <div className="flex gap-3">
                  <Link
                    href={`/checkout?bookId=${book.id}`}
                    className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-sm"
                  >
                    สั่งซื้อทันที
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}