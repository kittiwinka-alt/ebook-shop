'use client';

import { useState, useEffect } from 'react';
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

export default function AdminBooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [ordersCount, setOrdersCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
    store_name: "Win's Dev Store",
    logo_url: '/logo.png',
    categories: ['E-Book', 'Template', 'Source Code'],
  });

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warn';
  }>({
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: 'E-Book',
    price: '',
    cover_url: '',
    file_path: '',
    description: '',
    delivery_format: 'ดิจิทัลดาวน์โหลด (Instant Delivery)',
    file_type: 'PDF, Source Code, Assets',
    access_type: 'ตลอดชีพ (Lifetime Access)',
    warranty: 'ชำระผ่าน PromptPay / บัตร ปลอดภัย 100%',
  });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    bookId: string | null;
    bookTitle: string;
  }>({
    isOpen: false,
    bookId: null,
    bookTitle: '',
  });

  const fetchBooks = async () => {
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
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .order('id', { ascending: false });

      if (booksError) throw booksError;
      setBooks(booksData || []);

      const { count: ordCount, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      if (!ordersError && ordCount !== null) {
        setOrdersCount(ordCount);
      }

      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (settingsData) {
        const rawCats: string[] = Array.isArray(settingsData.categories) ? settingsData.categories : [];
        const filteredCats = rawCats.filter((c) => c !== 'ทั้งหมด');
        
        setSiteSettings({
          store_name: settingsData.store_name || "Win's Dev Store",
          logo_url: settingsData.logo_url || '/logo.png',
          categories: filteredCats.length > 0 ? filteredCats : ['E-Book', 'Template', 'Source Code'],
        });
      }
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleExportCSV = () => {
    if (books.length === 0) {
      showToast('ไม่มีข้อมูลสินค้าให้ส่งออก', 'warn');
      return;
    }

    const columns: { key: keyof Book; label: string }[] = [
      { key: 'id', label: 'ID สินค้า' },
      { key: 'title', label: 'ชื่อสินค้า' },
      { key: 'author', label: 'ผู้เขียน/ผู้อัปโหลด' },
      { key: 'category', label: 'หมวดหมู่' },
      { key: 'price', label: 'ราคา (บาท)' },
      { key: 'cover_url', label: 'URL รูปหน้าปก' },
      { key: 'file_path', label: 'ลิงก์ดาวน์โหลดไฟล์' },
      { key: 'delivery_format', label: 'รูปแบบการจัดส่ง' },
      { key: 'file_type', label: 'ประเภทไฟล์' },
      { key: 'access_type', label: 'การเข้าถึง' },
      { key: 'warranty', label: 'การรับประกัน' },
      { key: 'description', label: 'คำอธิบายสินค้า' },
      { key: 'created_at', label: 'วันที่อัปโหลด' },
    ];

    const headerRow = columns.map((col) => `"${col.label}"`).join(',');
    const dataRows = books.map((book) => {
      return columns
        .map((col) => {
          let val = (book as any)[col.key] ?? '';
          if (typeof val === 'object') val = JSON.stringify(val);
          const cleanText = String(val).replace(/\r?\n/g, ' ').replace(/"/g, '""');
          return `"${cleanText}"`;
        })
        .join(',');
    });

    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `books_full_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('ส่งออกไฟล์ CSV สำเร็จ', 'success');
  };

  const handleExportJSON = () => {
    if (books.length === 0) {
      showToast('ไม่มีข้อมูลสินค้าให้ส่งออก', 'warn');
      return;
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(books, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.setAttribute('download', `books_list_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ส่งออกไฟล์ JSON สำเร็จ', 'success');
  };

  const handleOpenAddModal = () => {
    setEditingBookId(null);
    const defaultCategory = siteSettings.categories[0] || 'E-Book';
    setFormData({
      title: 'ชื่อหนังสือ / หัวข้อ E-Book',
      author: "Win's Dev Store",
      category: defaultCategory,
      price: '390',
      cover_url: 'https://placehold.co/400x500/1e293b/FFFFFF?text=Upload+Cover',
      file_path: '',
      description: 'กรอกคำอธิบายสินค้าตรงนี้...',
      delivery_format: 'ดิจิทัลดาวน์โหลด (Instant Delivery)',
      file_type: 'PDF, Source Code, Assets',
      access_type: 'ตลอดชีพ (Lifetime Access)',
      warranty: 'ชำระผ่าน PromptPay / บัตร ปลอดภัย 100%',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (book: Book) => {
    setEditingBookId(book.id);
    setFormData({
      title: book.title || '',
      author: book.author || "Win's Dev Store",
      category: book.category || siteSettings.categories[0] || 'E-Book',
      price: String(book.price || 0),
      cover_url: book.cover_url || '',
      file_path: book.file_path || '',
      description: book.description || '',
      delivery_format: book.delivery_format || 'ดิจิทัลดาวน์โหลด (Instant Delivery)',
      file_type: book.file_type || 'PDF, Source Code, Assets',
      access_type: book.access_type || 'ตลอดชีพ (Lifetime Access)',
      warranty: book.warranty || 'ชำระผ่าน PromptPay / บัตร ปลอดภัย 100%',
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('book-covers')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('book-covers').getPublicUrl(filePath);
      setFormData((prev) => ({ ...prev, cover_url: data.publicUrl }));
      showToast('อัปโหลดรูปภาพสำเร็จ', 'success');
    } catch (err: any) {
      showToast('อัปโหลดรูปภาพไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const confirmDeleteBook = async () => {
    if (!deleteModal.bookId) return;

    const { error } = await supabase.from('books').delete().eq('id', deleteModal.bookId);
    if (error) {
      showToast('ลบไม่สำเร็จ: ' + error.message, 'error');
    } else {
      setBooks((prev) => prev.filter((b) => b?.id !== deleteModal.bookId));
      setDeleteModal({ isOpen: false, bookId: null, bookTitle: '' });
      showToast('ลบสินค้าออกจากระบบเรียบร้อยแล้ว', 'success');
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.cover_url) {
      showToast('กรุณากรอกข้อมูลสำคัญ (ชื่อ, ราคา, รูปภาพ) ให้ครบถ้วน', 'warn');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: formData.title.trim(),
      author: formData.author.trim() || "Win's Dev Store",
      category: formData.category,
      price: Number(formData.price),
      cover_url: formData.cover_url.trim(),
      file_path: formData.file_path.trim(),
      description: formData.description || '',
      delivery_format: formData.delivery_format || 'ดิจิทัลดาวน์โหลด (Instant Delivery)',
      file_type: formData.file_type || 'PDF, Source Code, Assets',
      access_type: formData.access_type || 'ตลอดชีพ (Lifetime Access)',
      warranty: formData.warranty || 'ชำระผ่าน PromptPay / บัตร ปลอดภัย 100%',
    };

    try {
      if (editingBookId) {
        const targetId = isNaN(Number(editingBookId)) ? editingBookId : Number(editingBookId);

        const { data, error } = await supabase
          .from('books')
          .update(payload)
          .eq('id', targetId)
          .select();

        if (error) {
          console.error('Update Error:', error);
          showToast('อัปเดตข้อมูลไม่สำเร็จ: ' + error.message, 'error');
          setIsSubmitting(false);
          return;
        }

        if (data && data.length > 0) {
          setBooks((prev) => prev.map((b) => (String(b?.id) === String(editingBookId) ? data[0] : b)));
        } else {
          await fetchBooks();
        }

        setIsModalOpen(false);
        showToast('บันทึกการแก้ไขเรียบร้อยแล้ว', 'success');
      } else {
        const { data, error } = await supabase
          .from('books')
          .insert([{
            ...payload,
            created_at: new Date().toISOString(),
          }])
          .select();

        if (error) {
          console.error('Insert Error:', error);
          showToast('เพิ่มสินค้าไม่สำเร็จ: ' + error.message, 'error');
          setIsSubmitting(false);
          return;
        }

        if (data && data.length > 0) {
          setBooks((prev) => [data[0], ...prev]);
        } else {
          await fetchBooks();
        }

        setIsModalOpen(false);
        showToast('เพิ่มสินค้าใหม่ลงร้านค้าเรียบร้อยแล้ว', 'success');
      }
    } catch (err: any) {
      console.error('Submit Error:', err);
      showToast('เกิดข้อผิดพลาด: ' + (err.message || err), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        
        {/* Sidebar เมนูด้านซ้าย */}
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
                <h1 className="font-bold text-white text-base leading-tight">[Admin Panel]</h1>
                <p className="text-[11px] text-slate-400 truncate max-w-[120px]">{siteSettings.store_name}</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">เมนูจัดการระบบ</p>
            <nav className="flex flex-col gap-1.5">
              <Link
                href="/admin"
                className="flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors"
              >
                <span>ภาพรวม</span>
              </Link>

              <Link
                href="/admin/books"
                className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/20 text-sm"
              >
                <span>จัดการสินค้า</span>
                <span className="text-[11px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full">{books.length}</span>
              </Link>

              <Link
                href="/admin?tab=orders"
                className="flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors"
              >
                <span>รายการสั่งซื้อ</span>
                <span className="text-[11px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full">{ordersCount}</span>
              </Link>

              <Link
                href="/admin?tab=settings"
                className="flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors"
              >
                <span>ตั้งค่าเว็บไซต์</span>
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
              กลับไปหน้าร้าน
            </Link>
          </div>
        </aside>

        {/* Main Content หน้ารวมสินค้า */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white tracking-wide">จัดการสินค้า (Books Management)</h2>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-medium">
                  แดชบอร์ดจัดการหลังบ้าน
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">เพิ่ม ลบ หรือแก้ไขข้อมูลและรายละเอียดสินค้า</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={handleExportCSV}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                Export CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                Export JSON
              </button>

              <button
                onClick={handleOpenAddModal}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-colors flex items-center gap-2 cursor-pointer"
              >
                เพิ่มสินค้าใหม่
              </button>
              
              <button
                onClick={fetchBooks}
                disabled={loading}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                รีเฟรช
              </button>
            </div>
          </div>

          {/* Books Table */}
          <div className="bg-[#131C31] border border-slate-800/80 rounded-2xl p-6 shadow-lg">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">กำลังโหลดข้อมูล...</div>
            ) : books.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">ยังไม่มีสินค้าในระบบ</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-medium">
                      <th className="pb-3 px-3">รูปภาพ</th>
                      <th className="pb-3 px-3">ชื่อสินค้า / ผู้เขียน</th>
                      <th className="pb-3 px-3">หมวดหมู่</th>
                      <th className="pb-3 px-3">ราคา</th>
                      <th className="pb-3 px-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {books?.filter(Boolean).map((book) => (
                      <tr key={book?.id || Math.random()} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3">
                          <div className="w-12 h-16 bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-slate-700 flex items-center justify-center">
                            {book?.cover_url ? (
                              <img 
                                src={book.cover_url} 
                                alt={book?.title || 'Book Cover'} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <span className="text-[10px] text-slate-500">ไม่มีรูป</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <div className="font-bold text-white truncate">{book?.title || 'ไม่มีชื่อสินค้า'}</div>
                          <div className="text-xs text-slate-400 truncate">{book?.author || "Win's Dev Store"}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          <span className="bg-slate-800 px-2.5 py-1 rounded-md text-xs font-medium">
                            {book?.category || 'E-Book'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-400">
                          ฿{Number(book?.price || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/books/${book.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/20 transition-colors cursor-pointer"
                            >
                              ดูตัวอย่าง
                            </Link>

                            <button
                              onClick={() => handleOpenEditModal(book)}
                              className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-500/20 transition-colors cursor-pointer"
                            >
                              แก้ไข
                            </button>
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, bookId: book?.id, bookTitle: book?.title || '' })}
                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-500/20 transition-colors cursor-pointer"
                            >
                              ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* LIVE PREVIEW EDITOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0B1120] border border-slate-700/80 rounded-3xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="bg-[#0F172A] border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {editingBookId ? 'แก้ไขข้อมูลสินค้า' : 'สร้างสินค้าใหม่'}
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                {editingBookId && (
                  <Link
                    href={`/books/${editingBookId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  >
                    ดูหน้าร้านจริง
                  </Link>
                )}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* 1. คอลัมน์ซ้าย: รูปหน้าปก */}
                <div className="lg:col-span-4 flex flex-col items-center">
                  <div className="w-full max-w-[300px] aspect-[3/4] bg-[#131C31] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-2 relative group">
                    <img
                      src={formData.cover_url || 'https://placehold.co/400x500/1e293b/FFFFFF?text=No+Cover'}
                      alt={formData.title}
                      className="w-full h-full object-cover rounded-xl"
                    />

                    <label className="absolute inset-2 bg-black/70 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-xs font-semibold gap-1.5 border-2 border-dashed border-indigo-400">
                      <span>เปลี่ยนรูปหน้าปก</span>
                      <span className="text-[10px] text-slate-400">(JPG, PNG, WEBP)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="w-full max-w-[300px] mt-3">
                    <label className="block text-[11px] text-slate-400 mb-1">หรือระบุ URL รูปหน้าปก:</label>
                    <input
                      type="text"
                      value={formData.cover_url}
                      onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-[#131C31] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* 2. คอลัมน์กลาง: ข้อมูลสินค้า */}
                <div className="lg:col-span-5 flex flex-col space-y-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-400 mb-1 uppercase tracking-wider">
                      ชื่อสินค้า / รายการ *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full text-xl sm:text-2xl font-black text-white bg-[#131C31] border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 outline-none transition-colors"
                      placeholder="ชื่อสินค้า..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        ผู้เขียน / เจ้าของผลงาน
                      </label>
                      <input
                        type="text"
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        className="w-full bg-[#131C31] border border-slate-800 focus:border-indigo-500 text-indigo-400 font-bold rounded-xl px-3 py-2 text-xs outline-none"
                        placeholder="Win's Dev Store"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        หมวดหมู่สินค้า
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-[#131C31] border border-slate-800 focus:border-indigo-500 text-slate-200 rounded-xl px-3 py-2 text-xs outline-none cursor-pointer"
                      >
                        {siteSettings.categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-[#131C31] border border-slate-800 rounded-2xl p-4 text-xs divide-y divide-slate-800/80 shadow-inner space-y-1">
                    <div className="flex items-center justify-between py-2 gap-3">
                      <span className="text-slate-400 shrink-0">รูปแบบการจัดส่ง</span>
                      <input
                        type="text"
                        value={formData.delivery_format}
                        onChange={(e) => setFormData({ ...formData, delivery_format: e.target.value })}
                        className="text-right text-white font-medium bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 outline-none w-full"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 gap-3">
                      <span className="text-slate-400 shrink-0">ประเภทไฟล์</span>
                      <input
                        type="text"
                        value={formData.file_type}
                        onChange={(e) => setFormData({ ...formData, file_type: e.target.value })}
                        className="text-right text-white font-medium bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 outline-none w-full"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 gap-3">
                      <span className="text-slate-400 shrink-0">การเข้าถึง</span>
                      <input
                        type="text"
                        value={formData.access_type}
                        onChange={(e) => setFormData({ ...formData, access_type: e.target.value })}
                        className="text-right text-white font-medium bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 outline-none w-full"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 gap-3">
                      <span className="text-slate-400 shrink-0">การรับรอง</span>
                      <input
                        type="text"
                        value={formData.warranty}
                        onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                        className="text-right text-emerald-400 font-medium bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 outline-none w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-400 mb-1">
                      ลิงก์ดาวน์โหลดไฟล์ (URL) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.file_path}
                      onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      className="w-full bg-[#131C31] border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* 3. คอลัมน์ขวา: ราคา */}
                <div className="lg:col-span-3">
                  <div className="bg-[#131C31] border border-indigo-500/40 rounded-2xl p-5 shadow-xl sticky top-4 space-y-4">
                    <div className="border border-indigo-500/50 bg-indigo-600/10 rounded-xl p-3">
                      <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wide mb-1">
                        ราคาจำหน่าย
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-2xl font-black text-white">฿</span>
                        <input
                          type="number"
                          required
                          min="0"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="w-full text-2xl font-black text-white bg-transparent border-b border-indigo-400/50 outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-center text-slate-400 leading-relaxed">
                      หลังชำระเงิน สินค้าจะปรากฏในระบบของลูกค้าทันที
                    </p>
                  </div>
                </div>

              </div>

              {/* ส่วนคำอธิบายสินค้า */}
              <div className="border-t border-slate-800 pt-6">
                <label className="block text-sm font-bold text-white mb-2">
                  รายละเอียดสินค้า (Description)
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="กรอกรายละเอียดสินค้า..."
                  className="w-full bg-[#131C31] border border-slate-800 focus:border-indigo-500 text-slate-300 text-xs rounded-2xl p-4 outline-none leading-relaxed"
                />
              </div>

              {/* ปุ่ม Actions ด้านล่าง */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800 sticky bottom-0 bg-[#0B1120]/95 backdrop-blur-xs py-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploadingImage}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-7 py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Modal ยืนยันการลบสินค้า */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1E293B] border border-slate-700/80 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <h4 className="text-lg font-bold text-white mb-2">ยืนยันการลบรายการสินค้า</h4>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              ต้องการลบรายการ <span className="text-white font-semibold">"{deleteModal.bookTitle}"</span> ใช่หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, bookId: null, bookTitle: '' })}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteBook}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}