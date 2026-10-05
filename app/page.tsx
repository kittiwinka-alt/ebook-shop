'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAILS = [
  'admin@winsdev.store',
  'kittiwin.ka@rmuti.ac.th',
];

export default function HomePage() {
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  
  const [purchasedBookIds, setPurchasedBookIds] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState('date_desc'); 
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const [cart, setCart] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(true); 

  // State ข้อมูลตั้งค่าเว็บไซต์จาก Admin Panel
  const [siteSettings, setSiteSettings] = useState({
    store_name: "Win's Dev Store",
    store_subtitle: 'DIGITAL ASSETS & E-BOOKS',
    items_label: 'แสดง {count} รายการ',
    logo_url: '/logo.png',
    categories: ['ทั้งหมด', 'E-Book', 'Template', 'Source Code'],
  });

  // Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEbookWarningModalOpen, setIsEbookWarningModalOpen] = useState(false);
  const [isEbookConfirmed, setIsEbookConfirmed] = useState(false);

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

  // ดึงการตั้งค่าร้านค้าจากตาราง site_settings
  useEffect(() => {
    async function loadSiteSettings() {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (data) {
        setSiteSettings({
          store_name: data.store_name || "Win's Dev Store",
          store_subtitle: data.store_subtitle || 'DIGITAL ASSETS & E-BOOKS',
          items_label: data.items_label || 'แสดง {count} รายการ',
          logo_url: data.logo_url || '/logo.png',
          categories: Array.isArray(data.categories) && data.categories.length > 0
            ? data.categories
            : ['ทั้งหมด', 'E-Book', 'Template', 'Source Code'],
        });
      }
    }
    loadSiteSettings();
  }, []);

  const fetchPurchasedBooks = async (userId: string) => {
    const { data: orderData, error } = await supabase
      .from('orders')
      .select('book_ids')
      .eq('user_id', userId);

    if (!error && orderData) {
      let ids: any[] = [];
      orderData.forEach((order) => {
        if (order.book_ids) {
          if (typeof order.book_ids === 'string') {
            ids.push(...order.book_ids.split(',').map((id: string) => id.trim()));
          } else if (Array.isArray(order.book_ids)) {
            ids.push(...order.book_ids);
          } else {
            ids.push(order.book_ids);
          }
        }
      });
      setPurchasedBookIds(ids.map(id => String(id)));
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        fetchPurchasedBooks(currentUser.id);
        const savedCart = localStorage.getItem(`cart_user_${currentUser.id}`);
        if (savedCart) {
          try { 
            const parsed = JSON.parse(savedCart);
            setCart(parsed);
            setSelectedItems(parsed.map((item: any) => item.id));
          } catch (e) { 
            setCart([]); 
          }
        } else {
          setCart([]);
        }
      } else {
        setPurchasedBookIds([]);
        const guestCart = localStorage.getItem('cart_guest');
        if (guestCart) {
          try { 
            const parsed = JSON.parse(guestCart);
            setCart(parsed);
            setSelectedItems(parsed.map((item: any) => item.id));
          } catch (e) { 
            setCart([]); 
          }
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchPurchasedBooks(currentUser.id);
        const savedCart = localStorage.getItem(`cart_user_${currentUser.id}`);
        if (savedCart) {
          try { 
            const parsed = JSON.parse(savedCart);
            setCart(parsed);
            setSelectedItems(parsed.map((item: any) => item.id));
          } catch (e) { 
            setCart([]); 
          }
        } else {
          setCart([]);
        }
      } else {
        setPurchasedBookIds([]);
        const guestCart = localStorage.getItem('cart_guest');
        if (guestCart) {
          try { 
            const parsed = JSON.parse(guestCart);
            setCart(parsed);
            setSelectedItems(parsed.map((item: any) => item.id));
          } catch (e) { 
            setCart([]); 
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`cart_user_${user.id}`, JSON.stringify(cart));
    } else {
      localStorage.setItem('cart_guest', JSON.stringify(cart));
    }
  }, [cart, user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCart([]);
    setSelectedItems([]);
    setPurchasedBookIds([]);
    setIsUserMenuOpen(false);
    router.refresh();
  };

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cart') === 'open') {
      setIsCartOpen(true);
    }
  }, []);

  useEffect(() => {
    async function loadBooks() {
      const { data } = await supabase.from('books').select('*').order('id', { ascending: true });
      if (data) {
        setBooks(data);
        setFilteredBooks(data);
      }
      setLoading(false);
    }
    loadBooks();
  }, []);

  useEffect(() => {
    let result = [...books]; 

    if (selectedCategory !== 'ทั้งหมด') {
      result = result.filter(book => book.category === selectedCategory);
    }

    if (searchQuery) {
      result = result.filter(book => 
        book.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sortBy === 'date_desc') {
      result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (sortBy === 'popular') {
      result.sort((a, b) => Number(b.id) - Number(a.id));
    } else if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title, 'th'));
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    }

    setFilteredBooks(result);
  }, [searchQuery, selectedCategory, sortBy, books]); 

  const sortOptions = [
    { id: 'date_desc', label: 'วันที่วางจำหน่าย' },
    { id: 'title', label: 'ชื่อเรื่อง' },
    { id: 'price_asc', label: 'ราคา (ต่ำไปสูง)' },
    { id: 'price_desc', label: 'ราคา (สูงไปต่ำ)' },
  ];

  const currentSortLabel = sortOptions.find(opt => opt.id === sortBy)?.label || 'วันที่วางจำหน่าย';

  const addToCart = (book: any) => {
    if (purchasedBookIds.includes(String(book.id))) return;
    if (!cart.some((item) => item.id === book.id)) {
      setCart([...cart, book]);
      setSelectedItems([...selectedItems, book.id]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
    setSelectedItems(selectedItems.filter((selectedId) => selectedId !== id));
  };

  const selectedCartItems = cart.filter(item => selectedItems.includes(item.id));
  const totalAmount = selectedCartItems.reduce((sum, item) => sum + Number(item.price), 0);

  const isAdminUser = Boolean(
    user?.email && ADMIN_EMAILS.some((adm) => adm.toLowerCase().trim() === user.email.toLowerCase().trim())
  );

  const avatarUrl = user?.user_metadata?.avatar_url;
  const userDisplayName = user?.user_metadata?.display_name || user?.email?.split('@')[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 flex flex-col font-sans transition-colors duration-200 relative overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="w-full bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsCartOpen(false)}>
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 shrink-0 flex items-center justify-center">
              <img 
                src={siteSettings.logo_url || '/logo.png'} 
                alt="Store Logo" 
                className="w-full h-full object-contain" 
                onError={(e: any) => { e.target.src = '/logo.png'; }}
              />
            </div>
            {/* ชื่อร้าน & ข้อความใต้ชื่อร้านไดนามิก */}
            <div className="hidden sm:block">
              <h1 className="text-slate-900 dark:text-white font-bold text-lg leading-none tracking-wide">
                {siteSettings.store_name}
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {siteSettings.store_subtitle}
              </p>
            </div>
          </div>

          {!isCartOpen && (
            <div className="flex-1 max-w-xl relative">
              <span className="absolute left-4 top-2.5 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="ค้นหาชื่อ E-Book, Template, Source code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-full py-2.5 pl-10 pr-4 outline-none border border-transparent focus:border-indigo-500 transition-colors text-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-2 bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span>{isDark ? '☀️' : '🌙'}</span> <span className="hidden lg:inline">{isDark ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
            </button>

            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <span>🛒</span> <span className="hidden sm:inline">ตะกร้า</span>
              <span className="bg-white text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                {cart.length}
              </span>
            </button>

            {user ? (
              <div className="relative ml-1">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
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
                <span>👤</span> <span className="hidden sm:inline font-bold">เข้าสู่ระบบ</span>
              </Link>
            )}

          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 relative z-10" onClick={() => { if(isUserMenuOpen) setIsUserMenuOpen(false); }}>
        
        {isCartOpen ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button 
              onClick={() => setIsCartOpen(false)}
              className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium mb-6 transition-colors cursor-pointer"
            >
              <span>←</span> กลับไปเลือกซื้อสินค้าต่อ
            </button>

            <div className="flex justify-center items-center mb-10 text-sm">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold mb-2 shadow-lg shadow-indigo-600/30">1</div>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">สินค้าในตะกร้า</span>
              </div>
              <div className="w-24 sm:w-48 h-[2px] bg-slate-300 dark:bg-slate-700 mx-2 sm:mx-4 -mt-6"></div>
              <div className="flex flex-col items-center opacity-50">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold mb-2">2</div>
                <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">การจัดส่งและชำระเงิน</span>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <div className="text-6xl mb-4">🛒</div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">ยังไม่มีสินค้าในตะกร้า</h2>
                <p className="text-slate-500 mb-8">ค้นหา E-Book และ Template ที่น่าสนใจได้เลย</p>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  เลือกซื้อสินค้า
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* ตารางสินค้าในตะกร้า */}
                <div className="lg:col-span-2">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">สินค้าในตะกร้า</h2>
                  
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-sm">
                    
                    <div className="p-4 sm:px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 text-xs sm:text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-[#1E293B]">
                      <label className="flex items-center gap-3 cursor-pointer font-medium select-none">
                        <input 
                          type="checkbox" 
                          checked={selectedItems.length === cart.length && cart.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(cart.map(item => item.id));
                            } else {
                              setSelectedItems([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
                        />
                        <span>เลือกทั้งหมด ({cart.length})</span>
                      </label>

                      <div className="flex items-center gap-6 sm:gap-10">
                        <span className="hidden sm:inline w-20 text-right">ราคาต่อหน่วย</span>
                        <span className="hidden sm:inline w-12 text-center">จำนวน</span>
                        <span className="hidden sm:inline w-20 text-right">ราคารวม</span>
                        <button 
                          onClick={() => setIsDeleteModalOpen(true)}
                          disabled={selectedItems.length === 0}
                          className="text-red-500 hover:text-red-600 font-medium underline disabled:opacity-30 disabled:no-underline cursor-pointer"
                        >
                          ลบที่เลือก
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-[#0F172A]/50 px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-700/60 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                      <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">สินค้าดิจิทัล</span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {cart.map((item) => {
                        const isChecked = selectedItems.includes(item.id);

                        return (
                          <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/25 transition-colors">
                            <div className="flex items-start gap-4 flex-1">
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItems([...selectedItems, item.id]);
                                  } else {
                                    setSelectedItems(selectedItems.filter(id => id !== item.id));
                                  }
                                }}
                                className="w-4 h-4 mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer shrink-0"
                              />

                              <div className="w-16 h-22 sm:w-20 sm:h-28 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden shrink-0 shadow-sm border border-slate-200 dark:border-slate-700">
                                <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                              </div>

                              <div className="flex-1">
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-2 leading-snug">{item.title}</h3>
                                <p className="text-xs text-slate-400 mt-1">{item.category || 'E-Book'}</p>
                                <span className="inline-block mt-2 text-[11px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800/50">
                                  สินค้าพร้อมดาวน์โหลดทันที
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                              <div className="text-right sm:w-20">
                                <span className="sm:hidden text-xs text-slate-400 mr-2">ต่อหน่วย:</span>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">฿{Number(item.price).toLocaleString()}</span>
                              </div>

                              <div className="text-sm text-slate-500 dark:text-slate-400 w-12 text-center">
                                1
                              </div>

                              <div className="text-right sm:w-20">
                                <span className="sm:hidden text-xs text-slate-400 mr-2">รวม:</span>
                                <span className="text-sm sm:base font-bold text-slate-900 dark:text-white">฿{Number(item.price).toLocaleString()}</span>
                              </div>

                              <button 
                                onClick={() => removeFromCart(item.id)}
                                className="text-slate-400 hover:text-red-500 p-1 transition-colors text-lg cursor-pointer"
                                title="ลบสินค้านี้"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>

                {/* การ์ดสรุปคำสั่งซื้อ */}
                <div className="lg:col-span-1">
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm sticky top-24">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">สรุปคำสั่งซื้อ</h2>
                    
                    <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 mb-6">
                      <div className="flex justify-between">
                        <span>จำนวนสินค้าที่เลือก</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{selectedItems.length} รายการ</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ค่าจัดส่ง</span>
                        <span className="text-teal-600 dark:text-teal-400 font-medium">ฟรี (ไฟล์ดิจิทัล)</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700/60 pt-4 mb-6 flex justify-between items-baseline">
                      <span className="font-bold text-slate-900 dark:text-white">ยอดชำระสุทธิ</span>
                      <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                        ฿{totalAmount.toLocaleString()}
                      </span>
                    </div>

                    <button
                      disabled={selectedItems.length === 0}
                      onClick={() => {
                        if (!user) {
                          router.push('/login');
                          return;
                        }
                        setIsEbookConfirmed(false);
                        setIsEbookWarningModalOpen(true);
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                      {selectedItems.length === 0 ? 'กรุณาเลือกสินค้า' : 'ดำเนินการสั่งซื้อสินค้า'}
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
              
              {/* ปุ่มหมวดหมู่ไดนามิกที่ดึงจาก site_settings */}
              <div className="flex items-center gap-3 w-full overflow-x-auto pb-2 sm:pb-0">
                <span className="text-sm font-medium text-slate-500 whitespace-nowrap">หมวดหมู่:</span>
                {siteSettings.categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border cursor-pointer ${
                      selectedCategory === cat 
                      ? 'bg-indigo-600 border-indigo-600 text-white' 
                      : 'bg-transparent border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1E293B]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* ข้อความแสดงรายการไดนามิก (Items Label) & Dropdown เรียงลำดับ */}
              <div className="flex items-center gap-4 text-sm text-slate-500 whitespace-nowrap w-full sm:w-auto justify-end">
                <span>
                  {siteSettings.items_label
                    ? siteSettings.items_label.replace('{count}', String(filteredBooks.length))
                    : `แสดง ${filteredBooks.length} รายการ`}
                </span>
                
                <div className="relative" ref={sortRef}>
                  <button
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="flex items-center justify-between gap-6 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 px-5 py-2.5 rounded-full text-sm font-medium shadow-sm hover:border-indigo-500 transition-all cursor-pointer"
                  >
                    <span>{currentSortLabel}</span>
                    <span className="text-xs text-slate-400">
                      {isSortOpen ? '▲' : '▼'}
                    </span>
                  </button>

                  {isSortOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl shadow-black/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="p-1.5 flex flex-col gap-0.5">
                        {sortOptions.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setSortBy(opt.id);
                              setIsSortOpen(false);
                            }}
                            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer ${
                              sortBy === opt.id 
                              ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold' 
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {sortBy === opt.id && <span className="text-indigo-600 dark:text-indigo-400 font-bold">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <p className="text-center text-slate-500 py-20">กำลังโหลดสินค้า...</p>
            ) : filteredBooks.length === 0 ? (
              <p className="text-center text-slate-500 py-20">ไม่พบสินค้าที่คุณค้นหา</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredBooks.map((book) => {
                  const isPurchased = purchasedBookIds.includes(String(book.id));

                  return (
                    <div key={book.id} className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-700/50 overflow-hidden flex flex-col shadow-lg transition-transform hover:-translate-y-1 group">
                      
                      <Link href={`/books/${book.id}`} className="relative h-60 overflow-hidden block cursor-pointer">
                        <img 
                          src={book.cover_url || 'https://placehold.co/400x500/1e293b/FFFFFF?text=No+Image'} 
                          alt={book.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                        <div className="absolute top-3 left-3 z-10">
                          <span className="bg-indigo-600/90 backdrop-blur-xs px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-white shadow-md">
                            {book.category || 'E-BOOK'}
                          </span>
                        </div>
                      </Link>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <Link href={`/books/${book.id}`}>
                            <h3 className="text-base font-bold leading-snug line-clamp-2 text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
                              {book.title}
                            </h3>
                          </Link>
                          
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                            {book.author || "Win's Dev Store"}
                          </p>
                        </div>

                        <div className="pt-4 mt-auto">
                          <div className="flex items-baseline justify-between mb-3">
                            <span className="text-xs text-slate-500 dark:text-slate-400">ราคา</span>
                            <span className="text-xl font-black text-slate-900 dark:text-white">
                              ฿{Number(book.price).toLocaleString()}
                            </span>
                          </div>

                          {isPurchased ? (
                            <button
                              disabled
                              className="w-full font-bold text-xs sm:text-sm bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/25 py-2.5 rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5"
                            >
                              <span>✓</span> ซื้อไปแล้ว
                            </button>
                          ) : (
                            <button
                              onClick={() => addToCart(book)}
                              className="w-full font-bold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl transition shadow-md shadow-indigo-600/25 cursor-pointer active:scale-98 flex items-center justify-center gap-2"
                            >
                              <span>🛒</span> ใส่ตะกร้า
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal ยืนยันการลบสินค้าที่เลือก */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 max-w-sm sm:max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700/60 text-center animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-3">
              ลบสินค้าที่เลือก
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-8 leading-relaxed">
              ต้องการลบสินค้าที่เลือก {selectedItems.length} รายการใช่หรือไม่ ?
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 px-6 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  const remaining = cart.filter(item => !selectedItems.includes(item.id));
                  setCart(remaining);
                  setSelectedItems([]);
                  setIsDeleteModalOpen(false);
                }}
                className="flex-1 py-3 px-6 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal แจ้งเตือนสินค้า E-Book */}
      {isEbookWarningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-8 max-w-200 w-full shadow-2xl border border-slate-100 dark:border-slate-700/60 text-center animate-in zoom-in-95 duration-200">
            <h3 className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-2 leading-relaxed">
              ในตะกร้าของท่านมีสินค้ารูปแบบ E-Book / Template<br />(ไฟล์อิเล็กทรอนิกส์)
            </h3>
            
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">
              ท่านสามารถดาวน์โหลดไฟล์ได้ทันทีผ่านเว็บไซต์ หรือเข้าดูได้จากเมนู <strong>"ชั้นหนังสือของฉัน"</strong> บนอุปกรณ์ Mobile, Tablet และ Computer
            </p>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-4 mb-6 leading-relaxed">
              หลังจากชำระเงินเรียบร้อย ระบบจะตรวจสอบและเพิ่มไฟล์ให้ท่านใน <span className="text-indigo-600 dark:text-indigo-400 font-semibold">"ชั้นหนังสือของฉัน"</span> ทันที
            </p>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-3 mb-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-slate-700 dark:text-slate-300 select-none">
                <input 
                  type="checkbox"
                  checked={isEbookConfirmed}
                  onChange={(e) => setIsEbookConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                />
                <span>รับทราบและยืนยันการสั่งซื้อ E-Book / Template</span>
              </label>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsEbookWarningModalOpen(false)}
                className="flex-1 py-3 px-6 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                disabled={!isEbookConfirmed}
                onClick={() => {
                  setIsEbookWarningModalOpen(false);
                  const chosenItems = selectedCartItems;
                  const ids = chosenItems.map(item => item.id).join(',');
                  router.push(`/checkout?bookId=${ids}`);
                }}
                className="flex-1 py-3 px-6 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                ดำเนินการสั่งซื้อสินค้า
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}