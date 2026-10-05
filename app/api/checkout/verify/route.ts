import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

// สร้าง Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// สร้าง Transporter ส่งอีเมลผ่าน Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // 1. ตรวจสอบว่ามีบันทึกไปแล้วหรือไม่
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (existingOrder) {
      return NextResponse.json({ success: true, message: 'Already recorded' });
    }

    // 2. ดึงข้อมูล Session จาก Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const userId = session.metadata?.userId;
    const bookIds = session.metadata?.bookIds;
    const totalAmount = (session.amount_total || 0) / 100;

    if (!userId || !bookIds) {
      return NextResponse.json({ error: 'Metadata missing' }, { status: 400 });
    }

    // 3. ดึงอีเมลจริงของ User จาก Supabase โดยตรง
    let targetEmail = session.customer_details?.email || session.customer_email;
    
    // ค้นหาอีเมลของบัญชีที่ล็อกอินอยู่จากตาราง profiles หรือ auth metadata
    if (session.metadata?.userEmail) {
      targetEmail = session.metadata.userEmail;
    } else {
      // ดึงอีเมลผู้ใช้จาก Supabase
      const { data: userData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle();

      if (userData?.email) {
        targetEmail = userData.email;
      }
    }

    // 4. บันทึกคำสั่งซื้อลง Supabase
    const { data: insertedData, error: insertError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: userId,
          book_ids: bookIds,
          total_amount: totalAmount,
          status: 'completed',
          stripe_session_id: sessionId,
        },
      ])
      .select();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true, message: 'Already recorded' });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 5. ส่งอีเมลยืนยันคำสั่งซื้อเข้าอีเมลของบัญชีผู้ใช้
    if (targetEmail && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const orderId = insertedData?.[0]?.id ? `ORD-${insertedData[0].id.substring(0, 8).toUpperCase()}` : 'ORD-SUCCESS';

      try {
        await transporter.sendMail({
          from: `"Win's Dev Store" <${process.env.GMAIL_USER}>`,
          to: targetEmail,
          subject: `ยืนยันคำสั่งซื้อสำเร็จ (${orderId}) - Win's Dev Store`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <h2 style="color: #4f46e5; margin-bottom: 8px;">ชำระเงินสำเร็จเรียบร้อย!</h2>
              <p style="color: #475569; font-size: 14px;">ขอบคุณสำหรับการสั่งซื้อสินค้ากับ Win's Dev Store</p>
              
              <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin: 20px 0;">
                <p style="margin: 4px 0; font-size: 14px;"><strong>รหัสคำสั่งซื้อ:</strong> ${orderId}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>ยอดชำระสุทธิ:</strong> ฿${totalAmount.toLocaleString()}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>สถานะ:</strong> ชำระเงินเรียบร้อย</p>
              </div>

              <p style="color: #475569; font-size: 14px;">
                E-Book หรือไฟล์ของคุณพร้อมให้ดาวน์โหลดแล้ว สามารถเข้าสู่ระบบและไปที่ชั้นหนังสือเพื่อดาวน์โหลดได้ทันที
              </p>

              <div style="margin-top: 24px;">
                <a href="http://localhost:3000/profile?tab=library" 
                   style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  ไปที่ชั้นหนังสือของฉัน
                </a>
              </div>
            </div>
          `,
        });
        console.log('ส่งอีเมลไปยังบัญชีผู้ใช้สำเร็จ:', targetEmail);
      } catch (mailErr) {
        console.error('การส่งอีเมลล้มเหลว:', mailErr);
      }
    }

    return NextResponse.json({ success: true, data: insertedData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}