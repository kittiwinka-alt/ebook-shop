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

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  const [totalSales, setTotalSales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalBooks, setTotalBooks] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allBooksList, setAllBooksList] = useState<any[]>([]);
  
  // สถิติยอดขายกราฟ: รายสัปดาห์ และ รายเดือน
  const [chartViewMode, setChartViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [dailySales, setDailySales] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [monthlySales, setMonthlySales] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const [siteSettings, setSiteSettings] = useState({
    store_name: "Win's Dev Store",
    store_subtitle: 'DIGITAL ASSETS & E-BOOKS',
    items_label: 'แสดง {count} รายการ',
    logo_url: '/logo.png',
    categories: ['ทั้งหมด', 'E-Book', 'Template', 'Source Code'],
    default_sort: 'date_desc',
    sort_labels: {
      date_desc: 'วันที่วางจำหน่าย',
      popular: 'ความนิยม',
      title: 'ชื่อเรื่อง',
      price_asc: 'ราคา (ต่ำไปสูง)',
      price_desc: 'ราคา (สูงไปต่ำ)',
    },
  });

  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warn' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warn' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'orders') {
      setActiveTab('orders');
    } else if (tab === 'settings') {
      setActiveTab('settings');
    } else {
      setActiveTab('overview');
    }
  }, [searchParams]);

  const fetchDashboardData = async () => {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      router.replace('/login');
      return;
    }

    const userEmail = session.user.email?.toLowerCase().trim() || '';
    const isAuthorized = ADMIN_EMAILS.some((adm) => adm.toLowerCase().trim() === userEmail);

    if (!isAuthorized) {
      setIsAccessDenied(true);
      setLoading(false);
      return;
    }

    setAdminUser(session.user);

    try {
      let orders: any[] | null = null;

      // พยายามดึงจาก view ก่อนเพื่อดึง customer_name และ customer_email
      const { data: viewData, error: viewError } = await supabase
        .from('admin_orders_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (!viewError && viewData) {
        orders = viewData;
      } else {
        const { data: fallbackOrders } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        orders = fallbackOrders;
      }

      if (orders) {
        setAllOrders(orders);
        setTotalOrders(orders.length);
        setRecentOrders(orders.slice(0, 5));

        const sales = orders.reduce((sum, ord) => {
          return sum + Number(ord.total_amount ?? ord.amount ?? ord.price ?? 0);
        }, 0);
        setTotalSales(sales);

        const uniqueUsers = new Set(orders.map((ord) => ord.user_id));
        setTotalCustomers(uniqueUsers.size);

        const weekly = [0, 0, 0, 0, 0, 0, 0];
        const monthly = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        orders.forEach((ord) => {
          const dateStr = ord.created_at;
          if (dateStr) {
            const date = new Date(dateStr);
            const val = Number(ord.total_amount ?? ord.amount ?? ord.price ?? 0);

            // คำนวณรายสัปดาห์ (จันทร์ - อาทิตย์)
            const day = date.getDay();
            const dayIndex = (day + 6) % 7;
            weekly[dayIndex] += val;

            // คำนวณรายเดือน (0 = ม.ค. ถึง 11 = ธ.ค.)
            const monthIndex = date.getMonth();
            monthly[monthIndex] += val;
          }
        });

        setDailySales(weekly);
        setMonthlySales(monthly);
      }

      const { data: booksData } = await supabase.from('books').select('*');
      if (booksData) {
        setAllBooksList(booksData);
        setTotalBooks(booksData.length);
      }

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
          categories: Array.isArray(settingsData.categories) && settingsData.categories.length > 0
            ? settingsData.categories
            : ['ทั้งหมด', 'E-Book', 'Template', 'Source Code'],
          default_sort: settingsData.default_sort || 'date_desc',
          sort_labels: settingsData.sort_labels || {
            date_desc: 'วันที่วางจำหน่าย',
            popular: 'ความนิยม',
            title: 'ชื่อเรื่อง',
            price_asc: 'ราคา (ต่ำไปสูง)',
            price_desc: 'ราคา (สูงไปต่ำ)',
          },
        });
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getCustomerDisplayName = (ord: any) => {
    if (!ord) return 'ลูกค้าทั่วไป';
    if (ord.customer_name && ord.customer_name !== 'Customer') return ord.customer_name;
    if (ord.customer_email) return ord.customer_email.split('@')[0];
    if (ord.email) return ord.email.split('@')[0];
    if (adminUser && ord.user_id === adminUser.id) {
      return adminUser.user_metadata?.display_name || adminUser.email?.split('@')[0] || 'Admin';
    }
    return ord.user_id ? String(ord.user_id).slice(0, 8) : 'ลูกค้าทั่วไป';
  };

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
    return allBooksList.filter((b) => ids.includes(String(b.id)));
  };

  const handleExportOrdersCSV = () => {
    if (allOrders.length === 0) {
      showToast('ไม่มีรายการคำสั่งซื้อสำหรับส่งออก', 'warn');
      return;
    }

    const headers = ['id', 'customer', 'customer_email', 'user_id', 'total_amount', 'book_ids', 'status', 'created_at'];
    const csvRows = [
      headers.join(','),
      ...allOrders.map((o) => {
        const customer = getCustomerDisplayName(o);
        const row = {
          ...o,
          customer,
          customer_email: o.customer_email || '',
        };
        return headers
          .map((key) => {
            let val = (row as any)[key] ?? '';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',');
      }),
    ];

    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orders_list_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ส่งออกประวัติคำสั่งซื้อ (CSV) เรียบร้อยแล้ว', 'success');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `site_logo_${Date.now()}.${fileExt}`;
      const filePath = `store/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setSiteSettings((prev) => ({ ...prev, logo_url: data.publicUrl }));
      showToast('อัปโหลดไฟล์โลโก้สำเร็จ', 'success');
    } catch (err: any) {
      showToast('อัปโหลดโลโก้ไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (siteSettings.categories.includes(trimmed)) {
      showToast('หมวดหมู่นี้มีอยู่ในรายการแล้ว', 'warn');
      return;
    }
    setSiteSettings((prev) => ({
      ...prev,
      categories: [...prev.categories, trimmed],
    }));
    setNewCategoryInput('');
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (catToRemove === 'ทั้งหมด') {
      showToast('ไม่สามารถลบหมวดหมู่ "ทั้งหมด" ได้', 'warn');
      return;
    }
    setSiteSettings((prev) => ({
      ...prev,
      categories: prev.categories.filter((cat) => cat !== catToRemove),
    }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);

    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: 'default',
          store_name: siteSettings.store_name,
          store_subtitle: siteSettings.store_subtitle,
          items_label: siteSettings.items_label,
          logo_url: siteSettings.logo_url,
          categories: siteSettings.categories,
          default_sort: siteSettings.default_sort,
          sort_labels: siteSettings.sort_labels,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      showToast('บันทึกการตั้งค่าเว็บไซต์เรียบร้อยแล้ว', 'success');
    } catch (err: any) {
      showToast('บันทึกไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const daysLabel = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

  const filteredOrders = allOrders.filter((ord) => {
    const query = orderSearchQuery.toLowerCase().trim();
    if (!query) return true;
    const shortId = `ORD-${ord.id.substring(0, 8).toUpperCase()}`;
    const customer = getCustomerDisplayName(ord).toLowerCase();
    const email = (ord.customer_email || '').toLowerCase();
    return (
      shortId.toLowerCase().includes(query) ||
      String(ord.id).toLowerCase().includes(query) ||
      customer.includes(query) ||
      email.includes(query) ||
      String(ord.user_id).toLowerCase().includes(query) ||
      (ord.book_ids && String(ord.book_ids).toLowerCase().includes(query))
    );
  });

  return (
    <div className="relative min-h-screen bg-[#0B1120] text-slate-200 flex flex-col md:flex-row w-full max-w-full overflow-x-hidden font-sans">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className={`px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-2xl flex items-center gap-3 pointer-events-auto ${
            toast.type === 'success'
              ? 'bg-[#0F172A]/95 border-emerald-500/40 text-emerald-300 shadow-emerald-500/20'
              : toast.type === 'error'
              ? 'bg-[#0F172A]/95 border-rose-500/40 text-rose-300 shadow-rose-500/20'
              : 'bg-[#0F172A]/95 border-amber-500/40 text-amber-300 shadow-amber-500/20'
          }`}>
            <span className="text-sm font-semibold tracking-wide text-white">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Access Denied Modal */}
      {isAccessDenied && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#0F172A]/90 border border-slate-700/80 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center backdrop-blur-2xl">
            <h3 className="text-xl font-bold text-white mb-2">ปฏิเสธการเข้าถึง (Access Denied)</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
              บัญชีนี้ไม่มีสิทธิ์เข้าถึงแดชบอร์ดจัดการระบบหลังบ้าน เฉพาะผู้ดูแลระบบที่ได้รับอนุญาตเท่านั้น
            </p>
            <button
              onClick={() => router.replace('/')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-98 cursor-pointer"
            >
              กลับสู่หน้าร้านค้า
            </button>
          </div>
        </div>
      )}

      <div className={`flex flex-col md:flex-row w-full transition-all duration-300 ${isAccessDenied ? 'filter blur-md pointer-events-none select-none' : ''}`}>
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-[#0F172A] border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0 p-1">
                <img 
                  src={siteSettings.logo_url || '/logo.png'} 
                  alt="Store Logo" 
                  className="w-full h-full object-contain"
                  onError={(e: any) => { e.target.src = '/logo.png'; }}
                />
              </div>
              <div>
                <h1 className="font-bold text-white text-base leading-tight">Admin Panel</h1>
                <p className="text-[11px] text-slate-400 truncate max-w-[120px]">{siteSettings.store_name}</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">เมนูจัดการระบบ</p>
            <nav className="flex flex-col gap-1.5">
              <button
                onClick={() => { setActiveTab('overview'); router.push('/admin'); }}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
                  activeTab === 'overview'
                    ? 'bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>ภาพรวม</span>
              </button>

              <Link
                href="/admin/books"
                className="flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors"
              >
                <span>จัดการสินค้า</span>
                <span className="text-[11px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full">{totalBooks}</span>
              </Link>

              <button
                onClick={() => { setActiveTab('orders'); router.push('/admin?tab=orders'); }}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
                  activeTab === 'orders'
                    ? 'bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>รายการสั่งซื้อ</span>
                <span className="text-[11px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full">{totalOrders}</span>
              </button>

              <button
                onClick={() => { setActiveTab('settings'); router.push('/admin?tab=settings'); }}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
                  activeTab === 'settings'
                    ? 'bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>ตั้งค่าเว็บไซต์</span>
              </button>
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
              กลับไปหน้าร้าน
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white tracking-wide">
                {activeTab === 'overview' && 'ภาพรวมระบบร้านค้า (Overview)'}
                {activeTab === 'orders' && 'รายการสั่งซื้อทั้งหมด (Orders)'}
                {activeTab === 'settings' && 'ตั้งค่าข้อมูลเว็บไซต์ (Site Settings)'}
              </h2>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-medium">
                แดชบอร์ดจัดการหลังบ้าน
              </span>
            </div>

            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer w-fit"
            >
              รีเฟรชข้อมูล
            </button>
          </div>

          {/* TAB 1: ภาพรวม */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-[#131C31] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs text-slate-400 font-medium mb-2">ยอดขายรวม</div>
                  <div className="text-2xl font-black text-white mb-2">฿{totalSales.toLocaleString()}</div>
                  <div className="text-[11px] text-indigo-400 font-medium">อัปเดตจากยอดสั่งซื้อจริง</div>
                </div>

                <div className="bg-[#131C31] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs text-slate-400 font-medium mb-2">ออเดอร์</div>
                  <div className="text-2xl font-black text-white mb-2">{totalOrders}</div>
                  <div className="text-[11px] text-slate-400 font-medium">ชำระผ่าน PromptPay / อื่นๆ</div>
                </div>

                <div className="bg-[#131C31] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs text-slate-400 font-medium mb-2">ลูกค้า</div>
                  <div className="text-2xl font-black text-white mb-2">{totalCustomers}</div>
                  <div className="text-[11px] text-purple-400 font-medium">ลูกค้าที่มีการสั่งซื้อจริง</div>
                </div>

                <div className="bg-[#131C31] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs text-slate-400 font-medium mb-2">สินค้า</div>
                  <div className="text-2xl font-black text-white mb-2">{totalBooks} เล่ม</div>
                  <div className="text-[11px] text-amber-400 font-medium">พร้อมดาวน์โหลดดิจิทัลทันที</div>
                </div>
              </div>

              {/* กราฟยอดขาย (สลับดูรายสัปดาห์ / รายเดือน) */}
              <div className="bg-[#131C31] border border-slate-800/80 rounded-2xl p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-white">
                      {chartViewMode === 'weekly' ? 'กราฟแนวโน้มยอดขายรายสัปดาห์' : 'กราฟแนวโน้มยอดขายรายเดือน'}
                    </h3>
                    
                    {/* ปุ่มสลับโหมด รายสัปดาห์ / รายเดือน */}
                    <div className="flex bg-[#0B1120] p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setChartViewMode('weekly')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          chartViewMode === 'weekly'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        รายสัปดาห์
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartViewMode('monthly')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          chartViewMode === 'monthly'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        รายเดือน
                      </button>
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700 w-fit">
                    {chartViewMode === 'weekly'
                      ? `ยอดสูงสุดในสัปดาห์นี้: ฿${Math.max(...dailySales).toLocaleString()}`
                      : `ยอดสูงสุดในรอบปีนี้: ฿${Math.max(...monthlySales).toLocaleString()}`}
                  </span>
                </div>

                {/* แสดงผลแท่งกราฟ */}
                {(() => {
                  const monthsLabel = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                  const activeData = chartViewMode === 'weekly' ? dailySales : monthlySales;
                  const activeLabels = chartViewMode === 'weekly' ? daysLabel : monthsLabel;
                  const currentMax = Math.max(...activeData, 100);

                  return (
                    <>
                      <div className="h-56 w-full flex items-end justify-between gap-1.5 sm:gap-2 pt-8 pb-2 px-2 sm:px-4 border-b border-slate-800">
                        {activeData.map((amount, idx) => {
                          const heightPercent = currentMax > 0 ? (amount / currentMax) * 100 : 0;
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                              <span className="text-[10px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                ฿{amount.toLocaleString()}
                              </span>
                              <div
                                style={{ height: `${Math.max(heightPercent, 6)}%` }}
                                className={`w-full ${chartViewMode === 'weekly' ? 'max-w-[42px]' : 'max-w-[28px]'} rounded-t-lg transition-all duration-500 ${
                                  amount > 0
                                    ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-lg shadow-indigo-500/20'
                                    : 'bg-slate-800/50'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-between px-2 sm:px-4 pt-3 text-[11px] text-slate-400 font-medium">
                        {activeLabels.map((lbl, idx) => (
                          <span key={idx} className="flex-1 text-center truncate">
                            {lbl}
                          </span>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* รายการสั่งซื้อล่าสุด */}
              <div className="bg-[#131C31] border border-slate-800/80 rounded-2xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white">รายการสั่งซื้อล่าสุด</h3>
                  <button 
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    ดูทั้งหมด
                  </button>
                </div>

                {recentOrders.length === 0 ? (
                  <p className="text-slate-500 text-xs py-6 text-center">ยังไม่มีรายการสั่งซื้อ</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase">
                          <th className="py-2.5 px-3">รหัสสั่งซื้อ</th>
                          <th className="py-2.5 px-3">วันที่สั่งซื้อ</th>
                          <th className="py-2.5 px-3">ยอดชำระ</th>
                          <th className="py-2.5 px-3">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {recentOrders.map((ord) => (
                          <tr 
                            key={ord.id} 
                            onClick={() => setSelectedOrder(ord)}
                            className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-3 font-bold text-indigo-400 group-hover:underline">
                              ORD-{ord.id.substring(0, 8).toUpperCase()}
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              {new Date(ord.created_at).toLocaleString('th-TH')}
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-400">
                              ฿{Number(ord.total_amount ?? ord.price ?? 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-medium">
                                ชำระเงินสำเร็จ
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: รายการสั่งซื้อทั้งหมด */}
          {activeTab === 'orders' && (
            <div className="bg-[#131C31] border border-slate-800/80 rounded-2xl p-6 shadow-lg animate-in fade-in duration-300">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-white">
                    รายการสั่งซื้อทั้งหมด ({filteredOrders.length} รายการ)
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">คลิกที่แถวรายการเพื่อดูรายละเอียดสินค้าฉบับเต็ม</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="ค้นหารหัสสั่งซื้อ, ชื่อลูกค้า..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      className="w-full bg-[#0F172A] border border-slate-700 focus:border-indigo-500 text-white rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                    />
                    {orderSearchQuery && (
                      <button
                        onClick={() => setOrderSearchQuery('')}
                        className="absolute right-3 top-2 text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleExportOrdersCSV}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              
              {filteredOrders.length === 0 ? (
                <p className="text-slate-500 text-sm py-12 text-center">
                  {orderSearchQuery ? 'ไม่พบรายการสั่งซื้อที่ตรงกับคำค้นหา' : 'ยังไม่มีรายการสั่งซื้อในระบบ'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-xs font-semibold">
                        <th className="py-3 px-3">รหัสสั่งซื้อ</th>
                        <th className="py-3 px-3">ผู้ซื้อ (CUSTOMER)</th>
                        <th className="py-3 px-3">วันที่สั่งซื้อ</th>
                        <th className="py-3 px-3">สินค้าที่ซื้อ (ITEMS)</th>
                        <th className="py-3 px-3">ยอดชำระ</th>
                        <th className="py-3 px-3">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredOrders.map((ord) => {
                        const items = getOrderItems(ord);
                        const customerName = getCustomerDisplayName(ord);
                        const customerEmail = ord.customer_email || ord.email || '';

                        return (
                          <tr 
                            key={ord.id} 
                            onClick={() => setSelectedOrder(ord)}
                            className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                          >
                            <td className="py-4 px-3 font-bold text-indigo-400 group-hover:underline whitespace-nowrap">
                              ORD-{ord.id.substring(0, 8).toUpperCase()}
                            </td>

                            <td className="py-4 px-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-slate-100 font-medium text-xs">
                                  {customerName}
                                </span>
                                {customerEmail && customerEmail !== customerName && (
                                  <span className="text-[11px] text-slate-400">
                                    {customerEmail}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-3 text-slate-300 whitespace-nowrap text-xs">
                              {new Date(ord.created_at).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })} น.
                            </td>

                            <td className="py-4 px-3">
                              <div className="flex flex-col gap-1.5 min-w-[200px] max-w-sm">
                                {items.length > 0 ? (
                                  items.map((bookItem: any) => (
                                    <div 
                                      key={bookItem.id} 
                                      className="flex items-center gap-2 bg-[#0F172A] border border-slate-700/60 rounded-lg px-2.5 py-1.5 shadow-sm"
                                    >
                                      <img 
                                        src={bookItem.cover_url} 
                                        alt={bookItem.title} 
                                        className="w-5 h-7 object-cover rounded shrink-0 border border-slate-700"
                                      />
                                      <span className="text-slate-200 text-xs font-medium truncate flex-1">
                                        {bookItem.title}
                                      </span>
                                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shrink-0 font-medium">
                                        ฿{Number(bookItem.price).toLocaleString()}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-xs truncate max-w-[200px]">
                                    {ord.book_ids || '-'}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-3 font-bold text-emerald-400 whitespace-nowrap">
                              ฿{Number(ord.total_amount ?? ord.price ?? 0).toLocaleString()}
                            </td>

                            <td className="py-4 px-3 whitespace-nowrap">
                              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                                ชำระแล้ว
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
          )}

          {/* TAB 3: ตั้งค่าข้อมูลเว็บไซต์ */}
          {activeTab === 'settings' && (
            <div className="bg-[#131C31] border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-lg w-full animate-in fade-in duration-300">
              <h3 className="text-lg font-bold text-white mb-1">ตั้งค่าข้อมูลเว็บไซต์ (Site Settings)</h3>
              <p className="text-slate-400 text-xs mb-6">จัดการชื่อร้าน, ข้อความใต้ชื่อร้าน, โลโก้, หมวดหมู่ และตัวเลือกการเรียงลำดับสินค้า</p>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* 1. ชื่อร้านค้า & ข้อความใต้ชื่อร้าน */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      ชื่อร้านค้า (Store Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={siteSettings.store_name}
                      onChange={(e) => setSiteSettings({ ...siteSettings, store_name: e.target.value })}
                      className="w-full bg-[#0F172A] border border-slate-700 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                      placeholder="Win's Dev Store"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      ข้อความใต้ชื่อร้าน (Store Subtitle) *
                    </label>
                    <input
                      type="text"
                      required
                      value={siteSettings.store_subtitle || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, store_subtitle: e.target.value })}
                      className="w-full bg-[#0F172A] border border-slate-700 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                      placeholder="DIGITAL ASSETS & E-BOOKS"
                    />
                  </div>
                </div>

                {/* 2. ข้อความแสดงรายการสินค้า */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    ข้อความแสดงรายการ (Item Count Label)
                  </label>
                  <input
                    type="text"
                    value={siteSettings.items_label || 'แสดง {count} รายการ'}
                    onChange={(e) => setSiteSettings({ ...siteSettings, items_label: e.target.value })}
                    className="w-full bg-[#0F172A] border border-slate-700 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                    placeholder="แสดง {count} รายการ"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    * ใช้แท็ก <code className="text-indigo-400 font-mono">{"{count}"}</code> แทนตัวเลขจำนวนสินค้า เช่น <span className="text-slate-300">"แสดง {"{count}"} รายการ"</span>
                  </p>
                </div>

                {/* 3. จัดการตัวเลือกและชื่อการเรียงลำดับสินค้า */}
                <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        ตัวเลือกการเรียงลำดับสินค้า (Sort Options)
                      </h4>
                      <p className="text-[11px] text-slate-400">แก้ไขข้อความปุ่มเมนูดรอปดาวน์สำหรับเรียงลำดับสินค้าหน้าร้าน</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">ค่าเริ่มต้น:</span>
                      <select
                        value={siteSettings.default_sort}
                        onChange={(e) => setSiteSettings({ ...siteSettings, default_sort: e.target.value })}
                        className="bg-[#131C31] border border-slate-700 text-indigo-400 rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer"
                      >
                        <option value="date_desc">วันที่วางจำหน่าย</option>
                        <option value="title">ชื่อเรื่อง</option>
                        <option value="price_asc">ราคา (ต่ำไปสูง)</option>
                        <option value="price_desc">ราคา (สูงไปต่ำ)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">1. ลำดับตามวันที่ล่าสุด (date_desc)</label>
                      <input
                        type="text"
                        value={siteSettings.sort_labels?.date_desc || ''}
                        onChange={(e) => setSiteSettings({
                          ...siteSettings,
                          sort_labels: { ...siteSettings.sort_labels, date_desc: e.target.value }
                        })}
                        className="w-full bg-[#131C31] border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">2. ลำดับตามชื่อเรื่อง (title)</label>
                      <input
                        type="text"
                        value={siteSettings.sort_labels?.title || ''}
                        onChange={(e) => setSiteSettings({
                          ...siteSettings,
                          sort_labels: { ...siteSettings.sort_labels, title: e.target.value }
                        })}
                        className="w-full bg-[#131C31] border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">3. ราคาต่ำไปสูง (price_asc)</label>
                      <input
                        type="text"
                        value={siteSettings.sort_labels?.price_asc || ''}
                        onChange={(e) => setSiteSettings({
                          ...siteSettings,
                          sort_labels: { ...siteSettings.sort_labels, price_asc: e.target.value }
                        })}
                        className="w-full bg-[#131C31] border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">4. ราคาสูงไปต่ำ (price_desc)</label>
                      <input
                        type="text"
                        value={siteSettings.sort_labels?.price_desc || ''}
                        onChange={(e) => setSiteSettings({
                          ...siteSettings,
                          sort_labels: { ...siteSettings.sort_labels, price_desc: e.target.value }
                        })}
                        className="w-full bg-[#131C31] border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. โลโก้ร้านค้า */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    โลโก้ร้านค้า (Store Logo)
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#0F172A] border border-slate-700/80 rounded-2xl p-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 p-1.5 shadow-md">
                      <img 
                        src={siteSettings.logo_url || '/logo.png'} 
                        alt="Logo Preview" 
                        className="w-full h-full object-contain"
                        onError={(e: any) => { e.target.src = '/logo.png'; }}
                      />
                    </div>
                    
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center gap-3">
                        <label className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-md">
                          <span>{isUploadingLogo ? 'กำลังอัปโหลด...' : 'เลือกไฟล์รูปใหม่'}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            disabled={isUploadingLogo}
                            onChange={handleLogoUpload} 
                            className="hidden" 
                          />
                        </label>
                        <span className="text-[11px] text-slate-400">หรือระบุ URL โลโก้ในช่องด้านล่าง</span>
                      </div>
                      <input
                        type="text"
                        value={siteSettings.logo_url}
                        onChange={(e) => setSiteSettings({ ...siteSettings, logo_url: e.target.value })}
                        placeholder="https://... หรือ /logo.png"
                        className="w-full bg-[#131C31] border border-slate-700/80 focus:border-indigo-500 text-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. หมวดหมู่แสดงรายการหน้าร้าน */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    หมวดหมู่แสดงรายการหน้าร้าน (Product Categories)
                  </label>
                  
                  <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-4 mb-3">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {siteSettings.categories.map((cat) => (
                        <span 
                          key={cat} 
                          className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2"
                        >
                          {cat}
                          {cat !== 'ทั้งหมด' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCategory(cat)}
                              className="text-indigo-400 hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer"
                              title="ลบหมวดหมู่นี้"
                            >
                              ✕
                            </button>
                          )}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                        placeholder="พิมพ์ชื่อหมวดหมู่ใหม่..."
                        className="flex-1 bg-[#131C31] border border-slate-700 focus:border-indigo-500 text-white rounded-xl px-3.5 py-2 text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                      >
                        + เพิ่มหมวดหมู่
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingSettings || isUploadingLogo}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer active:scale-98"
                  >
                    {isSavingSettings ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าเว็บไซต์'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* MODAL แสดงรายละเอียดสินค้าในคำสั่งซื้อสำหรับ Admin */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#131C31] border border-slate-700/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0F172A]">
              <div>
                <span className="text-[11px] text-slate-400 block">รายละเอียดคำสั่งซื้อ (Admin View)</span>
                <h3 className="text-base font-bold text-indigo-400">
                  ORD-{selectedOrder.id.substring(0, 8).toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-3 bg-[#0B1120] border-b border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
              <div>
                <span>ลูกค้า: </span>
                <span className="font-bold text-slate-200">
                  {getCustomerDisplayName(selectedOrder)}
                </span>
              </div>
              <div>
                <span>วันที่: </span>
                <span className="text-slate-300">{new Date(selectedOrder.created_at).toLocaleString('th-TH')}</span>
              </div>
            </div>

            <div className="p-5 max-h-[55vh] overflow-y-auto divide-y divide-slate-800">
              {getOrderItems(selectedOrder).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  กำลังโหลดข้อมูลหรือสินค้าถูกนำออกจากระบบแล้ว (Book IDs: {selectedOrder.book_ids || '-'})
                </div>
              ) : (
                getOrderItems(selectedOrder).map((item: any) => (
                  <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-3.5">
                    <div className="w-14 h-18 bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-slate-700 shadow-xs">
                      <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{item.category}</p>
                      <div className="text-xs font-semibold text-indigo-400 mt-1">
                        ฿{Number(item.price).toLocaleString()}
                      </div>
                    </div>

                    <Link
                      href={`/books/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      ดูสินค้า
                    </Link>
                  </div>
                ))
              )}
            </div>

            <div className="p-5 bg-[#0F172A] border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[11px] font-semibold">
                  ชำระเงินสำเร็จ
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">ยอดรวมทั้งสิ้น</span>
                <span className="text-xl font-black text-white">
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

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B1120]" />}>
      <AdminDashboardContent />
    </Suspense>
  );
}