'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAILS = [
  'admin@winsdev.store',
  'kittiwin.ka@rmuti.ac.th',
];

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // ค้นหาบน Navbar & ค้นหาในตารางออเดอร์
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // ข้อมูลการตั้งค่าเว็บไซต์ (ดึงจาก site_settings)
  const [siteSettings, setSiteSettings] = useState({
    store_name: "Win's Dev Store",
    store_subtitle: 'DIGITAL ASSETS & E-BOOKS',
    logo_url: '/logo.png',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [birthdate, setBirthdate] = useState('-');
  const [gender, setGender] = useState('-');
  const [phone, setPhone] = useState('-');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cart, setCart] = useState<any[]>([]);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [libraryBooks, setLibraryBooks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [allBooks, setAllBooks] = useState<any[]>([]);

  // Modal ดูรายละเอียดคำสั่งซื้อ
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // ดึง site_settings มาแสดงบน Navbar
  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (data) {
        setSiteSettings({
          store_name: data.store_name || "Win's Dev Store",
          store_subtitle: data.store_subtitle || 'DIGITAL ASSETS & E-BOOKS',
          logo_url: data.logo_url || '/logo.png',
        });
      }
    }
    loadSettings();
  }, []);

  // ดึงข้อมูลตะกร้าที่แยกตาม user.id
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      if (currentUser) {
        const savedCart = localStorage.getItem(`cart_user_${currentUser.id}`);
        if (savedCart) {
          try {
            setCart(JSON.parse(savedCart));
          } catch (e) {
            setCart([]);
          }
        } else {
          setCart([]);
        }
      } else {
        const guestCart = localStorage.getItem('cart_guest');
        if (guestCart) {
          try {
            setCart(JSON.parse(guestCart));
          } catch (e) {
            setCart([]);
          }
        } else {
          setCart([]);
        }
      }
    });
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
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyNums = e.target.value.replace(/\D/g, '');
    if (onlyNums.length <= 10) {
      setPhone(onlyNums);
    }
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const isAdminUser = Boolean(
    user?.email && ADMIN_EMAILS.some((adm) => adm.toLowerCase().trim() === user.email.toLowerCase().trim())
  );

  const resetToCurrentUserData = (currentUser: any) => {
    const meta = currentUser.user_metadata || {};
    const initialName = meta.display_name || currentUser.email?.split('@')[0] || '';
    setDisplayName(initialName);
    setAvatarUrl(meta.avatar_url || '');
    setBirthdate(meta.birthdate || '-');
    setGender(meta.gender || '-');
    setPhone(meta.phone || '-');
  };

  useEffect(() => {
    async function fetchProfileData() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      const currentUser = session.user;
      setUser(currentUser);
      resetToCurrentUserData(currentUser);

      // โหลดสินค้าทั้งหมดเพื่อใช้จับคู่แสดงในออเดอร์และชั้นหนังสือ
      const { data: bookData } = await supabase.from('books').select('*');
      if (bookData) {
        setAllBooks(bookData);
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
        
      if (orderError) {
        console.error('เกิดข้อผิดพลาดตอนดึงรายการสั่งซื้อ:', orderError);
      }

      if (orderData && orderData.length > 0) {
        setOrders(orderData);

        let allBookIds: string[] = [];
        orderData.forEach((order) => {
          if (order.book_ids) {
            if (typeof order.book_ids === 'string') {
              const ids = order.book_ids.split(',').map((id: string) => String(id).trim());
              allBookIds.push(...ids);
            } else if (Array.isArray(order.book_ids)) {
              allBookIds.push(...order.book_ids.map((id: any) => String(id).trim()));
            } else {
              allBookIds.push(String(order.book_ids).trim());
            }
          }
        });

        const uniqueIds = Array.from(new Set(allBookIds));

        if (uniqueIds.length > 0 && bookData) {
          const purchasedBooks = bookData.filter((book: any) => 
            uniqueIds.includes(String(book.id))
          );
          setLibraryBooks(purchasedBooks);
        }
      }
      setLoading(false);
    }

    fetchProfileData();
  }, [router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('กรุณาเลือกไฟล์ภาพขนาดไม่เกิน 2 MB');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (err: any) {
      alert('อัปโหลดรูปภาพไม่สำเร็จ: ' + err.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      resetToCurrentUserData(user);
    }
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        avatar_url: avatarUrl,
        birthdate: birthdate === '-' ? '' : birthdate,
        gender: gender === '-' ? '' : gender,
        phone: phone === '-' ? '' : phone
      }
    });

    if (error) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    } else {
      if (data.user) {
        setUser(data.user);
      }
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  // ดึงรายการหนังสือที่อยู่ในออเดอร์นั้น
  const getOrderItems = (order: any) => {
    if (!order || !order.book_ids) return [];
    let ids: string[] = [];
    if (typeof order.book_ids === 'string') {
      ids = order.book_ids.split(',').map((id: string) => String(id).trim());
    } else if (Array.isArray(order.book_ids)) {
      ids = order.book_ids.map((id: any) => String(id).trim());
    } else {
      ids = [String(order.book_ids).trim()];
    }
    return allBooks.filter((b) => ids.includes(String(b.id)));
  };

  // กรองคำสั่งซื้อตามข้อความค้นหา
  const filteredOrders = orders.filter((order) => {
    const shortCode = `ORD-${order.id.substring(0, 8).toUpperCase()}`;
    const query = orderSearchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      shortCode.toLowerCase().includes(query) ||
      String(order.id).toLowerCase().includes(query) ||
      (order.book_ids && String(order.book_ids).toLowerCase().includes(query))
    );
  });

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(navSearchQuery.trim())}`);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120]" />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 font-sans transition-colors duration-200" onClick={() => isUserMenuOpen && setIsUserMenuOpen(false)}>
      
      {/* Navbar */}
      <nav className="w-full bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 shrink-0 flex items-center justify-center p-1 bg-slate-900/10 dark:bg-slate-800/50">
              <img 
                src={siteSettings.logo_url || '/logo.png'} 
                alt="Win's Dev Store Logo" 
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

          {/* ช่องค้นหาบน Navbar */}
          <form onSubmit={handleNavSearch} className="flex-1 max-w-xl relative">
            <span className="absolute left-4 top-2.5 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="ค้นหาชื่อ E-Book, Template, Source code..."
              value={navSearchQuery}
              onChange={(e) => setNavSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-full py-2.5 pl-10 pr-4 outline-none border border-transparent focus:border-indigo-500 transition-colors text-sm"
            />
          </form>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-2 bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span>{isDark ? '☀️' : '🌙'}</span> <span className="hidden lg:inline">{isDark ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
            </button>

            <Link
              href="/?cart=open"
              className="flex items-center gap-2 bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
            >
              <span>🛒</span> <span className="hidden sm:inline">ตะกร้า</span>
              <span className="bg-white text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                {cart.length}
              </span>
            </Link>

            {user && (
              <div className="relative ml-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsUserMenuOpen(!isUserMenuOpen); }}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-full px-2 sm:px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user.email.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="hidden sm:inline text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                    {displayName || user.email.split('@')[0]}
                  </span>
                  <span className="text-slate-400 text-xs ml-1">▼</span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-60 bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl shadow-black/20 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#0F172A]/50">
                      <p className="text-xs text-slate-500 dark:text-slate-400">บัญชีผู้ใช้</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.email}</p>
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
                        href="/profile?tab=profile" 
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
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 w-full flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-6 px-4">บัญชีผู้ใช้งานของฉัน</h2>
          <nav className="flex flex-col space-y-1">        

            <button 
              onClick={() => { setActiveTab('profile'); router.push('/profile?tab=profile'); }}
              className={`text-left px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer ${
                activeTab === 'profile' 
                ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-500 font-bold rounded-l-none' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50 font-medium'
              }`}
            >
              ข้อมูลผู้ใช้งาน
            </button>

            <button 
              onClick={() => { setActiveTab('library'); router.push('/profile?tab=library'); }}
              className={`flex items-center justify-between text-left px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer ${
                activeTab === 'library' 
                ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-500 font-bold rounded-l-none' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50 font-medium'
              }`}
            >
              <span>ชั้นหนังสือของฉัน</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'library' ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                {libraryBooks.length}
              </span>
            </button>

            <button 
              onClick={() => { setActiveTab('orders'); router.push('/profile?tab=orders'); }}
              className={`text-left px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer ${
                activeTab === 'orders' 
                ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-500 font-bold rounded-l-none' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50 font-medium'
              }`}
            >
              รายการสั่งซื้อของฉัน
            </button>

            <div className="my-2 border-t border-slate-200 dark:border-slate-800"></div>
            
            <button onClick={handleLogout} className="text-left px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors rounded-lg cursor-pointer">
              ออกจากระบบ
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 animate-in fade-in duration-500">
          
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">ข้อมูลผู้ใช้งาน</h2>
              
              <div className="bg-white dark:bg-[#1E293B]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-lg mb-8">
                <div className="flex flex-col md:flex-row gap-8 items-start relative">
                  
                  {!isEditing ? (
                    <button 
                      onClick={() => setIsEditing(true)} 
                      className="absolute top-0 right-0 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-bold flex items-center gap-1 cursor-pointer"
                    >
                      ✏ แก้ไข
                    </button>
                  ) : (
                    <button 
                      onClick={handleCancelEdit} 
                      className="absolute top-0 right-0 text-rose-500 hover:text-rose-600 text-sm font-bold flex items-center gap-1 cursor-pointer"
                    >
                      ✕ ยกเลิก
                    </button>
                  )}

                  <div className="flex flex-col items-center gap-3">
                    <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-4 border-slate-200 dark:border-slate-700 shrink-0 shadow-inner relative overflow-hidden group">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-6xl text-slate-400 dark:text-slate-600">👤</span>
                      )}

                      {isEditing && (
                        <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-[11px] font-bold cursor-pointer opacity-90 hover:opacity-100 transition-opacity">
                          <span>📷 เปลี่ยนรูป</span>
                          <span className="text-[9px] text-slate-300">คลิกที่นี่</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            disabled={isUploadingAvatar}
                            onChange={handleAvatarUpload} 
                            className="hidden" 
                          />
                        </label>
                      )}
                    </div>

                    {isEditing && (
                      <div className="w-full max-w-[200px]">
                        <input
                          type="text"
                          placeholder="หรือวาง URL รูปภาพ..."
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1 text-[11px] outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6">{displayName || 'User'}</h3>
                    
                    {!isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-4 text-sm mb-6">
                        <div className="text-slate-500 dark:text-slate-400">ชื่อที่แสดง</div>
                        <div className="sm:col-span-2 text-slate-900 dark:text-white font-medium">{displayName}</div>

                        <div className="text-slate-500 dark:text-slate-400">อีเมล</div>
                        <div className="sm:col-span-2 text-slate-900 dark:text-white font-medium">{user?.email || '-'}</div>

                        <div className="text-slate-500 dark:text-slate-400">วันเกิด</div>
                        <div className="sm:col-span-2 text-slate-900 dark:text-white font-medium">{birthdate}</div>

                        <div className="text-slate-500 dark:text-slate-400">เพศ</div>
                        <div className="sm:col-span-2 text-slate-900 dark:text-white font-medium">{gender}</div>

                        <div className="text-slate-500 dark:text-slate-400 flex items-center">เบอร์ติดต่อ</div>
                        <div className="sm:col-span-2 text-slate-900 dark:text-white font-medium flex items-center gap-2">
                          {phone}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">ชื่อที่แสดง</label>
                          <input 
                            type="text" 
                            value={displayName} 
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2 text-sm outline-none focus:border-indigo-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">วันเกิด</label>
                          <input 
                            type="date" 
                            value={birthdate === '-' ? '' : birthdate} 
                            onChange={(e) => setBirthdate(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2 text-sm outline-none focus:border-indigo-500 cursor-pointer" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">เพศ</label>
                          <select 
                            value={gender === '-' ? 'ไม่ระบุ' : gender} 
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2 text-sm outline-none focus:border-indigo-500 cursor-pointer" 
                          >
                            <option value="ชาย">ชาย</option>
                            <option value="หญิง">หญิง</option>
                            <option value="ไม่ระบุ">ไม่ระบุ</option>
                            <option value="อื่นๆ">อื่นๆ</option>                         
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">เบอร์ติดต่อ (10 หลัก)</label>
                          <input 
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="08XXXXXXXX"
                            value={phone === '-' ? '' : phone} 
                            onChange={handlePhoneChange}
                            className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2 text-sm outline-none focus:border-indigo-500" 
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button 
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={isSaving || isUploadingAvatar}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
                          >
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                          </button>                         
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>                                
            </div>
          )}

          {activeTab === 'library' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">📚 ชั้นหนังสือของฉัน</h2>
                <div className="text-sm text-slate-500 dark:text-slate-400">มีสินค้าทั้งหมด {libraryBooks.length} รายการ</div>
              </div>

              {libraryBooks.length === 0 ? (
                <div className="bg-white dark:bg-[#1E293B]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-12 text-center shadow-lg">
                  <span className="text-6xl mb-4 block opacity-50">📂</span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">ยังไม่มีหนังสือในคลัง</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">คุณยังไม่ได้ทำการสั่งซื้อ E-Book หรือ Template ใดๆ</p>
                  <Link href="/" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors">
                    ไปเลือกซื้อสินค้ากันเลย
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {libraryBooks.map((book) => (
                    <div key={book.id} className="bg-white dark:bg-[#1E293B]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-lg flex gap-4 p-4 hover:border-indigo-500/50 transition-colors">
                      <div className="w-24 h-32 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 shadow-inner relative">
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col justify-between py-1 flex-1">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md mb-2 inline-block">
                            พร้อมดาวน์โหลด
                          </span>
                          <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 mb-1">{book.title}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">รูปแบบ: {book.category}</p>
                        </div>
                        <a 
                          href={book.file_path} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-3 w-fit shadow-md shadow-indigo-600/20"
                        >
                          <span>⬇</span> ดาวน์โหลดไฟล์
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* แถบหัวข้อพร้อมช่องค้นหารายการสั่งซื้อ */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🔍</span> รายการสั่งซื้อของฉัน
                </h2>

                <div className="relative w-full sm:w-72">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">🔍</span>
                  <input
                    type="text"
                    placeholder="ค้นหารหัสสั่งซื้อ (เช่น ORD-...) ..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700/80 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500 transition-colors shadow-sm"
                  />
                  {orderSearchQuery && (
                    <button
                      onClick={() => setOrderSearchQuery('')}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              
              {orders.length === 0 ? (
                <div className="bg-white dark:bg-[#1E293B]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-12 text-center shadow-lg">
                  <span className="text-6xl mb-4 block opacity-50">🧾</span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">ยังไม่มีประวัติการสั่งซื้อ</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">คุณยังไม่ได้ทำรายการสั่งซื้อใดๆ ในระบบ</p>
                  <Link href="/" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors">
                    ไปเลือกซื้อสินค้ากันเลย
                  </Link>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-[#1E293B]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-12 text-center shadow-lg">
                  <span className="text-5xl mb-3 block opacity-50">🔎</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">ไม่พบรหัสคำสั่งซื้อที่คุณค้นหา</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">ลองตรวจสอบรหัสสั่งซื้ออีกครั้ง หรือกดล้างช่องค้นหา</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1E293B]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-lg overflow-hidden">
                  <div className="hidden sm:grid grid-cols-12 gap-4 p-4 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#0F172A]/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                    <div className="col-span-3">รหัสสั่งซื้อ</div>
                    <div className="col-span-3">วันที่สั่งซื้อ</div>
                    <div className="col-span-2 text-center">จำนวน</div>
                    <div className="col-span-2 text-right">ยอดสุทธิ</div>
                    <div className="col-span-2 text-center">สถานะ</div>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                    {filteredOrders.map((order) => {
                      const itemCount = order.book_ids ? (typeof order.book_ids === 'string' ? order.book_ids.split(',').length : order.book_ids.length) : 0;
                      const shortId = `ORD-${order.id.substring(0, 8).toUpperCase()}`;
                      const orderDate = new Date(order.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

                      return (
                        <div 
                          key={order.id} 
                          onClick={() => setSelectedOrder(order)}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          <div className="sm:col-span-3 flex items-center gap-2">
                            <span className="sm:hidden text-xs text-slate-400 font-medium mr-1">รหัส:</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-1.5">
                              {shortId}
                              <span className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"></span>
                            </span>
                          </div>
                          <div className="sm:col-span-3 text-sm text-slate-600 dark:text-slate-300">
                            <span className="sm:hidden text-xs text-slate-400 font-medium mr-2">วันที่:</span>
                            {orderDate}
                          </div>
                          <div className="sm:col-span-2 text-sm text-slate-600 dark:text-slate-300 sm:text-center">
                            <span className="sm:hidden text-xs text-slate-400 font-medium mr-2">รายการ:</span>
                            {itemCount} รายการ
                          </div>
                          <div className="sm:col-span-2 text-sm font-bold text-slate-900 dark:text-white sm:text-right">
                            <span className="sm:hidden text-xs text-slate-400 font-medium mr-2">ยอดรวม:</span>
                            ฿{Number(order.total_amount ?? order.price ?? 0).toLocaleString()}
                          </div>
                          <div className="sm:col-span-2 flex justify-start sm:justify-center">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                              ชำระเงินสำเร็จ
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* 🚀 MODAL แสดงรายละเอียดสินค้าในคำสั่งซื้อ (Order Details Modal) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-700/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* หัวข้อ Modal */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0F172A]">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">รายละเอียดคำสั่งซื้อ</span>
                <h3 className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                  ORD-{selectedOrder.id.substring(0, 8).toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* รายการสินค้าที่ซื้อในออเดอร์นี้ */}
            <div className="p-5 max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {getOrderItems(selectedOrder).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  กำลังโหลดข้อมูลหรือสินค้าถูกนำออกจากระบบแล้ว
                </div>
              ) : (
                getOrderItems(selectedOrder).map((item: any) => (
                  <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-3.5">
                    <div className="w-14 h-18 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs">
                      <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.category}</p>
                      <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                        ฿{Number(item.price).toLocaleString()}
                      </div>
                    </div>

                    <a
                      href={item.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <span>⬇️</span> โหลดไฟล์
                    </a>
                  </div>
                ))
              )}
            </div>

            {/* สรุปยอดและข้อมูลชำระเงิน */}
            <div className="p-5 bg-slate-50 dark:bg-[#0F172A] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  สั่งซื้อเมื่อ: {new Date(selectedOrder.created_at).toLocaleString('th-TH')}
                </span>
                <span className="text-[11px] text-emerald-500 font-medium">✓ ชำระเงินเรียบร้อยแล้ว</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">ยอดรวมทั้งสิ้น</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  ฿{Number(selectedOrder.total_amount ?? selectedOrder.price ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-[#0B1120]" />}>
      <ProfileContent />
    </Suspense>
  );
}