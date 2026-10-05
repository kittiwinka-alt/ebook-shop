# Win's Dev E-Book Shop

แพลตฟอร์มอีคอมเมิร์ซสำหรับจัดจำหน่ายหนังสืออิเล็กทรอนิกส์และดิจิทัลแอสเซท (E-Books & Digital Products) พัฒนาด้วย **Next.js (App Router)** ร่วมกับ **Supabase** สำหรับระบบฐานข้อมูลและการจัดการสิทธิ์การเข้าถึง พร้อมรองรับระบบรับชำระเงินออนไลน์ผ่าน **Stripe** และระบบส่งใบเสร็จอัตโนมัติด้วย **Nodemailer**

---

## 🌟 ฟีเจอร์หลักของระบบ (Key Features)

### หน้าร้านค้าและผู้ใช้งานทั่วไป (Storefront & User Features)
* **การจัดการแคตตาล็อกสินค้า:** ค้นหา กรองหมวดหมู่ และเรียงลำดับสินค้าตามราคา วันที่วางจำหน่าย หรือความนิยม
* **ระบบตะกร้าสินค้า (Shopping Cart):** คำนวณยอดชำระสุทธิแบบเรียลไทม์ พร้อมตรวจสอบความถูกต้องของรายการสั่งซื้อ
* **ระบบชำระเงินแบบหลายช่องทาง (Payment Gateway):** รองรับการชำระเงินผ่านบัตรเครดิต/เดบิต และ QR PromptPay ด้วย Stripe Checkout
* **ชั้นหนังสือดิจิทัลส่วนตัว (Personal Library):** ลูกค้าสามารถเข้าถึงและดาวน์โหลดไฟล์ E-Book หรือ Source Code ได้ทันทีหลังการชำระเงินเสร็จสิ้น
* **ระบบแจ้งเตือนทางอีเมล (Email Notification):** จัดส่งใบเสร็จยืนยันคำสั่งซื้อพร้อมลิงก์ดาวน์โหลดเข้าสู่อีเมลผู้ซื้ออัตโนมัติ

### ระบบจัดการหลังบ้านสำหรับผู้ดูแลระบบ (Admin Dashboard)
* **การควบคุมสิทธิ์อย่างเข้มงวด (Access Control & Security):** ตรวจสอบสิทธิ์เฉพาะอีเมลผู้ดูแลระบบที่ได้รับอนุญาต และป้องกันการเข้าถึงข้อมูลผ่าน Row Level Security (RLS)
* **ภาพรวมยอดขายและสถิติ (Analytics Overview):** แสดงผลข้อมูลยอดขายรวม จำนวนออเดอร์ ลูกค้า และสินค้า พร้อมกราฟแนวโน้มยอดขายทั้งแบบรายสัปดาห์และรายเดือน
* **การจัดการคำสั่งซื้อ (Order Management):** ตรวจสอบประวัติคำสั่งซื้อ ค้นหาตามรหัสคำสั่งซื้อหรือข้อมูลลูกค้า และส่งออกข้อมูลเป็นไฟล์ CSV
* **การจัดการสินค้าและระบบ (Product & Site Settings):** เพิ่ม แก้ไข ปรับสถานะสินค้า และปรับแต่งข้อมูลร้านค้า เช่น โลโก้ ชื่อร้าน หมวดหมู่ และตัวเลือกการจัดเรียง

---

## 🛠 เทคโนโลยีที่ใช้งาน (Tech Stack)

* **Frontend & Backend Framework:** [Next.js](https://nextjs.org/) (App Router, TypeScript, Tailwind CSS)
* **Database & Authentication:** [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Storage & Row Level Security)
* **Payment Gateway:** [Stripe](https://stripe.com/) (Stripe Checkout Session API)
* **Email Service:** [Nodemailer](https://nodemailer.com/) (Gmail SMTP Integration)
* **Deployment & Hosting:** [Vercel](https://vercel.com/)

---

## ⚙️ ตัวแปรสภาพแวดล้อม (Environment Variables)

สร้างไฟล์ `.env.local` ที่ Root directory ของโปรเจกต์ และระบุค่าการกำหนดค่าดังต่อไปนี้:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe Payment Gateway
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email Service (Gmail SMTP)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Site Domain Configuration
NEXT_PUBLIC_SITE_URL=[https://your-domain.vercel.app](https://your-domain.vercel.app)
