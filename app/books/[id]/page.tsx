'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAILS = [
  'admin@winsdev.store',
  'kittiwin.ka@rmuti.ac.th',
];

interface Book {
  id: string;
  title: string;
  author?: string;
  price: number;
  category: string;
  cover_url: string;
  file_path: string;
  description?: string;
  delivery_format?: string;
  file_type?: string;
  access_type?: string;
  warranty?: string;
  created_at?: string;
}

export default function BookDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id as string;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
  
  // สถานะตรวจสอบว่าเคยซื้อเล่มนี้ไปหรือยัง
  const [isPurchased, setIsPurchased] = useState(false);

  // การตั้งค่าร้านค้าพร้อมโลโก้
  const [siteSettings, setSiteSettings] = useState({
    store_name: "Win's Dev Store",
    store_subtitle: 'DIGITAL ASSETS & E-BOOKS',
    items_label: 'แสดง {count} รายการ',
    logo_url: '/logo.png',
    categories: ['ทั้งหมด', 'E-Book', 'Template', 'Source Code'],
  });
  
  // State สำหรับ Modern Toast Notification
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'warn' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'warn' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
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

  const loadData = useCallback(async () => {
    if (!rawId) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      const cartKey = currentUser ? `cart_user_${currentUser.id}` : 'cart_guest';
      const savedCart = localStorage.getItem(cartKey);
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch {
          setCart([]);
        }
      }

      // ดึงข้อมูลสินค้าโดยใช้ String ID ตรงๆ
      const { data: bookData, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', String(rawId))
        .maybeSingle();

      if (!error && bookData) {
        setBook(bookData);
      }

      // ดึงข้อมูลการตั้งค่าร้านค้าและโลโก้ล่าสุดจาก Database
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (settingsData) {
        setSiteSettings({
          store_name: settingsData.store_name || "Win's Dev Store",
          store_subtitle: settingsData.store_subtitle || 'DIGITAL ASSETS & E-BOOKS',
          items_label: settingsData.items_label || 'แสดง {count} รายการ',
          logo_url: settingsData.logo_url || '/logo.png',
          categories: Array.isArray(settingsData.categories) ? settingsData.categories : ['ทั้งหมด', 'E-Book', 'Template', 'Source Code'],
        });
      }

      setCacheBuster(Date.now());

      if (currentUser) {
        const { data: orders } = await supabase
          .from('orders')
          .select('book_ids')
          .eq('user_id', currentUser.id)
          .eq('status', 'completed');

        if (orders && orders.length > 0) {
          const purchased = orders.some((ord) => {
            const ids = (ord.book_ids || '').split(',').map((id: string) => id.trim());
            return ids.includes(String(rawId));
          });
          setIsPurchased(purchased);
        }
      }
    } catch (err) {
      console.error('Error fetching book detail or settings:', err);
    } finally {
      setLoading(false);
    }
  }, [rawId]);

  useEffect(() => {
    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [loadData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCart([]);
    setIsUserMenuOpen(false);
    setIsPurchased(false);
    router.refresh();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleAddToCart = () => {
    if (!book) return;

    if (isPurchased) {
      showToast('คุณมีหนังสือเล่มนี้ในชั้นหนังสือเรียบร้อยแล้ว', 'warn');
      return;
    }

    const cartKey = user ? `cart_user_${user.id}` : 'cart_guest';
    const isAlreadyInCart = cart.some((item) => String(item.id) === String(book.id));

    if (isAlreadyInCart) {
      showToast('สินค้านี้อยู่ในตะกร้าของคุณแล้ว', 'warn');
      return;
    }

    const updatedCart = [...cart, book];
    setCart(updatedCart);
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    showToast('เพิ่มสินค้าลงในตะกร้าเรียบร้อยแล้ว 🎉', 'success');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isAdminUser = Boolean(
    user?.email && ADMIN_EMAILS.some((adm) => adm.toLowerCase().trim() === user.email.toLowerCase().trim())
  );

  const avatarUrl = user?.user_metadata?.avatar_url;
  const userDisplayName = user?.user_metadata?.display_name || user?.email?.split('@')[0];

  const formatUploadDate = (dateString?: string) => {
    if (!dateString) return 'เพิ่งอัปโหลดเร็วๆ นี้';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'เพิ่งอัปโหลดเร็วๆ นี้';
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' น.';
    } catch {
      return 'เพิ่งอัปโหลดเร็วๆ นี้';
    }
  };

  const getImageSource = (url?: string) => {
    if (!url) return 'https://placehold.co/400x500/1e293b/FFFFFF?text=No+Cover';
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${cacheBuster}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-400 flex items-center justify-center font-sans">
        กำลังโหลดข้อมูลสินค้า...
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 flex flex-col items-center justify-center gap-4 font-sans">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">ไม่พบรายการสินค้านี้</h2>
        <Link href="/" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-5 py-2.5 rounded-xl font-medium transition-colors">
          กลับสู่หน้าหลัก
        </Link>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 font-sans pb-16 transition-colors duration-200"
      onClick={() => { if (isUserMenuOpen) setIsUserMenuOpen(false); }}
    >
      {/* Toast แจ้งเตือนสไตล์ Modern */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl ${
            toast.type === 'success'
              ? 'bg-[#0F172A]/90 border-indigo-500/40 text-white shadow-indigo-600/20'
              : 'bg-[#0F172A]/90 border-amber-500/40 text-amber-300 shadow-amber-600/20'
          }`}>
            <span className="text-base">{toast.type === 'success' ? '🛒' : '⚠️'}</span>
            <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* แถบ Navbar ด้านบน */}
      <nav className="w-full bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 shrink-0 flex items-center justify-center">
              <img 
                src={siteSettings.logo_url || '/logo.png'} 
                alt="Store Logo" 
                className="w-full h-full object-contain" 
                onError={(e: any) => { e.target.src = '/logo.png'; }}
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-slate-900 dark:text-white font-bold text-lg leading-none tracking-wide">
                {siteSettings.store_name}
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {siteSettings.store_subtitle}
              </p>
            </div>
          </Link>

          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl relative">
            <span className="absolute left-4 top-2.5 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="ค้นหาชื่อ E-Book, Template, Source code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-full py-2.5 pl-10 pr-4 outline-none border border-transparent focus:border-indigo-500 transition-colors text-sm"
            />
          </form>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-2 bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span>{isDark ? '☀️' : '🌙'}</span> 
              <span className="hidden lg:inline">{isDark ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
            </button>

            <Link
              href="/?cart=open"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm transition-colors shadow-lg shadow-indigo-600/20"
            >
              <span>🛒</span> <span className="hidden sm:inline">ตะกร้า</span>
              <span className="bg-white text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                {cart.length}
              </span>
            </Link>

            {user ? (
              <div className="relative ml-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUserMenuOpen(!isUserMenuOpen);
                  }}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-full px-2 sm:px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user.email.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="hidden sm:inline text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                    {userDisplayName}
                  </span>
                  <span className="text-slate-400 text-xs ml-1">▼</span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-60 bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl shadow-black/20 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#0F172A]/50 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-300 dark:border-slate-600">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-500 dark:text-slate-300">
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {userDisplayName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="p-2 flex flex-col gap-1">
                      {isAdminUser && (
                        <Link 
                          href="/admin" 
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                        >
                          <span>⚙️</span> จัดการหลังบ้าน (Admin)
                        </Link>
                      )}

                      <Link 
                        href="/profile" 
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        <span>👤</span> บัญชีผู้ใช้งานของฉัน
                      </Link>
                    </div>
                    
                    <div className="p-2 border-t border-slate-200 dark:border-slate-700/50">
                      <button 
                        onClick={handleLogout} 
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <span>🚪</span> ออกจากระบบ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-full text-xs sm:text-sm hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors ml-1 font-bold"
              >
                <span>👤</span> <span className="hidden sm:inline">เข้าสู่ระบบ</span>
              </Link>
            )}

          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">หน้าแรก</Link>
          <span>/</span>
          <span className="text-slate-400 dark:text-slate-500">{book.category}</span>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 truncate max-w-xs">{book.title}</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* คอลัมน์ซ้าย: รูปหน้าปกพร้อมกลไกตัดแคช */}
          <div className="lg:col-span-4 flex flex-col items-center">
            <div className="w-full max-w-[320px] aspect-[3/4] bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-2 relative">
              <img
                key={`${book.cover_url}_${cacheBuster}`}
                src={getImageSource(book.cover_url)}
                alt={book.title}
                className="w-full h-full object-cover rounded-xl"
                onError={(e: any) => {
                  e.target.src = 'https://placehold.co/400x500/1e293b/FFFFFF?text=No+Cover';
                }}
              />
              {isPurchased && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                  <span>✓</span> ซื้อแล้ว
                </div>
              )}
            </div>
          </div>

          {/* คอลัมน์กลาง: รายละเอียดสินค้า */}
          <div className="lg:col-span-5 flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-3">
              {book.title}
            </h1>

            <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-6">
              <p>ผู้เขียน / ผู้อัปโหลด: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{book.author || "Win's Dev Store"}</span></p>
              <p>หมวดหมู่: <span className="text-slate-700 dark:text-slate-300 font-medium">{book.category}</span></p>
              <p className="flex items-center gap-1.5 text-slate-400">
                วันที่วางจำหน่าย: <span className="text-slate-700 dark:text-slate-300 font-medium">{formatUploadDate(book.created_at)}</span>
              </p>
            </div>

            <div className="bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 mb-6 text-xs divide-y divide-slate-100 dark:divide-slate-800/60 shadow-sm">
              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 dark:text-slate-400">รูปแบบการจัดส่ง</span>
                <span className="text-slate-900 dark:text-white font-medium">
                  {book.delivery_format || 'ดิจิทัลดาวน์โหลด (Instant Delivery)'}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 dark:text-slate-400">ประเภทไฟล์</span>
                <span className="text-slate-900 dark:text-white font-medium">
                  {book.file_type || 'PDF, Source Code, Assets'}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 dark:text-slate-400">การเข้าถึง</span>
                <span className="text-slate-900 dark:text-white font-medium">
                  {book.access_type || 'ตลอดชีพ (Lifetime Access)'}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 dark:text-slate-400">การรับรอง</span>
                <span className="text-emerald-500 dark:text-emerald-400 font-medium">
                  {book.warranty || '✓ ชำระผ่าน PromptPay / บัตร ปลอดภัย 100%'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                <span>🔗</span> {isCopied ? 'คัดลอกลิงก์แล้ว!' : 'แชร์ลิงก์'}
              </button>
            </div>

            <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">คำอธิบายสินค้า</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                {book.description || 'ไม่มีคำอธิบายเพิ่มเติมสำหรับสินค้านี้'}
              </p>
            </div>
          </div>

          {/* คอลัมน์ขวา: กล่องราคาและปุ่ม Action */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-[#131C31] border border-indigo-500/30 rounded-2xl p-5 shadow-xl relative sticky top-24">
              <div className="border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-600/10 rounded-xl p-3 mb-5">
                <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">
                  E-Book & Digital
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  ฿{Number(book.price).toLocaleString()}
                </div>
              </div>

              {isPurchased ? (
                <Link
                  href="/profile?tab=library"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>📖</span> อ่านหนังสือในชั้นหนังสือ
                </Link>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>🛒</span> เพิ่มลงในตะกร้า
                </button>
              )}

              <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-4 leading-normal">
                {isPurchased ? (
                  <span className="text-emerald-500 dark:text-emerald-400 font-medium">
                    ✓ คุณเป็นเจ้าของสินค้านี้แล้ว สามารถดาวน์โหลดไฟล์ได้ตลอดเวลา
                  </span>
                ) : (
                  <>หลังการสั่งซื้อ หนังสือจะเข้าสู่ <Link href="/profile?tab=library" className="text-indigo-600 dark:text-indigo-400 hover:underline">ชั้นหนังสือของคุณ</Link> ทันที</>
                )}
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}