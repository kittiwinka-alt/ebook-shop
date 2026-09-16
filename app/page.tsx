'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HomePage() {
  const router = useRouter();
  const [books, setBooks] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // ระบบ Dark Mode สลับ class 'dark' บนแท็ก <html>
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  // โหลดรายการ E-book
  useEffect(() => {
    async function loadBooks() {
      const { data } = await supabase.from('books').select('*').order('price', { ascending: true });
      if (data) setBooks(data);
      setLoading(false);
    }
    loadBooks();
  }, []);

  const addToCart = (book: any) => {
    if (!cart.some((item) => item.id === book.id)) {
      setCart([...cart, book]);
    }
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + Number(item.price), 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Navbar พร้อมปุ่ม Dark Mode */}
      <nav className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <span className="font-extrabold text-lg text-slate-900 dark:text-white">
            <span className="text-blue-600 dark:text-blue-400">E-Book</span> Shop
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* ปุ่มสลับโหมดกลางวัน / กลางคืน */}
            <button
              onClick={toggleDarkMode}
              title="สลับโหมดกลางวัน/กลางคืน"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-base transition"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            <Link
              href="/order-status"
              className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2"
            >
              🔍 ติดตามคำสั่งซื้อ
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl transition shadow-sm"
            >
              <span>🛒 ตะกร้า</span>
              {cart.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="py-8 px-4 text-center max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Win's Dev E-Book Shop
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          ระบบจำหน่าย E-book คู่มือพัฒนาโปรแกรม Desktop Application
        </p>
      </header>

      {/* รายการ E-book */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 flex-1 w-full">
        {loading ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-10">กำลังโหลดสินค้า...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3 sm:grid-cols-2 grid-cols-1">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition flex flex-col overflow-hidden"
              >
                <Link href={`/book/${book.id}`} className="block relative w-full h-52 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                </Link>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <Link href={`/book/${book.id}`} className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-base line-clamp-1 mb-2">
                      {book.title}
                    </Link>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {book.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-xs text-slate-400 dark:text-slate-500">ราคา</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white">฿{Number(book.price).toLocaleString()}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/book/${book.id}`}
                        className="text-center font-semibold text-xs border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 rounded-xl transition"
                      >
                        ดูรายละเอียด
                      </Link>
                      <button
                        onClick={() => addToCart(book)}
                        className="font-bold text-xs bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-2.5 rounded-xl transition"
                      >
                        + ใส่ตะกร้า
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col p-6 border-l border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">🛒 ตะกร้าสินค้า ({cart.length})</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 py-10 text-sm">ยังไม่มีสินค้าในตะกร้า</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center border border-slate-100 dark:border-slate-800 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <img src={item.cover_url} alt={item.title} className="w-12 h-14 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{item.title}</p>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">฿{Number(item.price).toLocaleString()}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 text-sm px-2">🗑</button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">รวมทั้งหมด:</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">฿{totalAmount.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    router.push(`/checkout?bookId=${cart[0].id}`);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition"
                >
                  ดำเนินการสั่งซื้อ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}