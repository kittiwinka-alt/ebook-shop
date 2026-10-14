# 📘 Win's Dev Store (Web & Desktop Application)

ระบบร้านค้าจัดจำหน่ายและจัดการสินทรัพย์ดิจิทัล (E-Books, Templates, Source Code) ที่รองรับทั้งการทำงานบนเว็บเบราว์เซอร์และแอปพลิเคชัน Desktop พร้อมระบบซิงค์ข้อมูลผ่าน Cloud แบบสมบูรณ์

---

## 🏗️ สถาปัตยกรรมระบบ (System Architecture)

| ส่วนประกอบ | ฝั่งเว็บ (Web Application) | ฝั่งคอมพิวเตอร์ (Desktop Application) |
| :--- | :--- | :--- |
| **Platform** | Web Browsers (Responsive Web) | Windows OS (Standalone Desktop Client) |
| **Core Framework** | React / Next.js | Tauri v2 + Rust (Backend Core) |
| **Frontend UI** | React + Vite + Tailwind CSS | React + Vite + Tailwind CSS |
| **Database & Auth** | Supabase (PostgreSQL + Auth Engine) | Supabase JS Client (Sync Realtime) |
| **Storage** | Supabase Storage (`books`, `avatars`) | Supabase Storage (`books`, `avatars`) |
| **Payment** | Stripe API / Payment Gateway | In-App Checkout Simulation / Stripe |

---

## 🌟 ฟีเจอร์หลัก (Core Features)

### 1. การแสดงรายการสินค้าและค้นหา (Storefront & Filtering)
* แคตตาล็อกแสดงรายการสินค้าพร้อมรูปปก ราคา และรายละเอียดแบบไดนามิก
* ตัวกรองหมวดหมู่สินค้า: ทั้งหมด, E-Book, Template, Source Code, Magazines
* ตัวกรองค้นหาแบบ Realtime (Search Bar)
* ตัวเลือกการจัดเรียงลำดับสินค้า (Sort): วันที่วางจำหน่าย, ชื่อเรื่อง, ราคา (ต่ำไปสูง / สูงไปต่ำ)

### 2. ตะกร้าสินค้าและการยืนยันคำสั่งซื้อ (Cart & Checkout Flow)
* หน้าตะกร้าสินค้าแบบเต็มจอ (Cart View):
  * เลือกลบหรือชำระเงินทีละรายการ หรือเลือกทั้งหมด (Select All)
  * สรุปยอดรวมและคำนวณราคาสุทธิแบบเรียลไทม์
* **Modal แจ้งเตือนข้อตกลงไฟล์ดิจิทัล:**
  * มีระบบตรวจสอบการกดยืนยันข้อตกลง E-Book/Template ก่อนเข้าสู่กระบวนการชำระเงิน
* **ระบบชำระเงิน (Payment System):**
  * ฝั่งเว็บ: รองรับการชำระผ่าน Stripe (บัตรเครดิต และ Thai QR PromptPay)
  * ฝั่ง Desktop: รองรับ In-App Checkout และหน้าต่างจำลองการชำระเงิน (Simulation Checkout) แบบไม่ต้องพึ่งเบราว์เซอร์ภายนอก

### 3. ระบบยืนยันตัวตนและความปลอดภัย (Modern Auth)
* ระบบล็อกอินและสมัครสมาชิกผ่าน Supabase Auth ในหน้าต่างเดียวกัน
* แถบวัดระดับความปลอดภัยของรหัสผ่าน (Password Strength) 4 ระดับ:
  * ความยาวอย่างน้อย 8 ตัวอักษร
  * ตัวเลข (0-9)
  * ตัวพิมพ์ใหญ่ (A-Z)
  * ตัวพิมพ์เล็ก (a-z)
* ปุ่มสลับแสดง/ซ่อนรหัสผ่าน (Show/Hide Password)

### 4. หน้าจัดการบัญชีผู้ใช้งาน (User Account & Library)
* **ข้อมูลผู้ใช้งาน (Profile):**
  * ซิงค์ชื่อผู้ใช้, วันเกิด, เพศ, เบอร์ติดต่อ และรูปประจำตัวผ่าน Supabase Auth `user_metadata`
  * อัปโหลดและเปลี่ยนรูปโปรไฟล์เข้าสู่ Bucket `avatars/avatars/`
* **ชั้นหนังสือของฉัน (Library):**
  * ตรวจสอบสิทธิ์การครอบครองสินค้าทันทีหลังชำระเงิน
  * ปุ่มดาวน์โหลดไฟล์ดิจิทัลตรงจาก Cloud Storage
* **รายการสั่งซื้อของฉัน (Orders):**
  * ประวัติการสั่งซื้อ วันที่ทำรายการ หมายเลขคำสั่งซื้อ และยอดสุทธิ

---

## 🗄️ โครงสร้างฐานข้อมูล (Database Schema)

### ตาราง `orders`
* `id` (uuid, primary key)
* `user_id` (uuid, foreign key referencing auth.users)
* `book_ids` (text, เก็บรายการ ID หนังสือ)
* `total_amount` (numeric, ยอดชำระเงิน)
* `status` (text, สถานะ เช่น `completed`)
* `created_at` (timestamptz, เวลาที่สั่งซื้อ)
* `stripe_session_id` (text, รหัสอ้างอิงธุรกรรม)

### ตาราง `books`
* `id` (uuid, primary key)
* `title` (text, ชื่อหนังสือ/สินค้า)
* `category` (text, หมวดหมู่)
* `cover_url` (text, รูปหน้าปก)
* `file_path` / `download_url` (text, ลิงก์ไฟล์ดาวน์โหลด)
* `price` (numeric, ราคา)
* `author` (text, ผู้แต่ง/ผู้พัฒนา)
* `description` (text, คำอธิบายสินค้า)

### Supabase Storage
* **Bucket `avatars`:** จัดเก็บรูปโปรไฟล์ในพาธ `avatars/<user_id>-<timestamp>.<ext>`
* **Bucket `books`:** จัดเก็บไฟล์ดิจิทัลสำหรับการดาวน์โหลด

---

## 🚀 วิธีการติดตั้งและรันโปรเจกต์ (Getting Started)

### 1. การเตรียมสภาพแวดล้อม (Prerequisites)
* Node.js (v18 ขึ้นไป)
* Rust & Cargo (สำหรับ Desktop App)
* Visual Studio Build Tools (C++ Desktop Development)

### 2. การรันในโหมดพัฒนา (Development)
```bash
# ติดตั้ง dependencies
npm install

# รันเฉพาะฝั่งเว็บ
npm run dev

# รันแอปพลิเคชัน Desktop (Tauri)
npm run tauri dev
