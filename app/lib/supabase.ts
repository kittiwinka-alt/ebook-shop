import { createClient } from '@supabase/supabase-js';

// ดึงค่า URL และ Key จากไฟล์ .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// สร้างตัวเชื่อมต่อฐานข้อมูล
export const supabase = createClient(supabaseUrl, supabaseAnonKey);