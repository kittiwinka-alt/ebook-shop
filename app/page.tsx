import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 0;

export default async function HomePage() {
  const { data: books, error } = await supabase.from('books').select('*');

  if (error) {
    return (
      <main className="p-8 text-center text-red-500">
        เกิดข้อผิดพลาดในการโหลดข้อมูล: {error.message}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            📚 Win's Dev E-Book Shop
          </h1>
          <p className="mt-2 text-base text-gray-600">
            ระบบจำหน่าย E-book คู่มือพัฒนาโปรแกรม Desktop Application
          </p>
        </header>
        <div className="mt-4">
  <Link
    href="/order-status"
    className="inline-block text-sm bg-white border border-gray-300 text-gray-700 px-4 py-1.5 rounded-full hover:bg-gray-100 transition shadow-sm"
  >
    🔍 ติดตามสถานะคำสั่งซื้อ
  </Link>
</div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {books?.map((book) => (
            <div
              key={book.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between"
            >
              <div>
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-5">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">{book.title}</h2>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {book.description}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700">
                    PDF File
                  </span>
                  <span className="text-2xl font-black text-gray-900">
                    ฿{Number(book.price).toLocaleString()}
                  </span>
                </div>

                <Link
                  href={`/checkout?bookId=${book.id}`}
                  className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
                >
                  สั่งซื้อ E-book
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}