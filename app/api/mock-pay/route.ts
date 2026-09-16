import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: Request) {
  try {
    const { orderNumber } = await req.json();

    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'PAID' })
      .eq('order_number', orderNumber)
      .select('*, books(*)')
      .single();

    if (updateError || !order) {
      return NextResponse.json({ error: 'ไม่พบคำสั่งซื้อ' }, { status: 404 });
    }

    const downloadUrl = `https://download.example.com/files/${order.books?.file_path || 'ebook.pdf'}?token=temp_${order.order_number}`;

    // ส่งอีเมลจริงผ่าน Gmail
    await transporter.sendMail({
      from: `"Win's Dev E-Book Shop" <${process.env.GMAIL_USER}>`,
      to: order.customer_email,
      subject: `[คำสั่งซื้อสำเร็จ] ดาวน์โหลด E-book: ${order.books?.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">🎉 การสั่งซื้อเสร็จสมบูรณ์!</h2>
          <p>เรียนคุณ <strong>${order.customer_name}</strong>,</p>
          <p>ขอบคุณที่สั่งซื้อหนังสือกับเรา หมายเลขคำสั่งซื้อของคุณคือ <strong>${order.order_number}</strong></p>
          <div style="margin: 24px 0;">
            <a href="${downloadUrl}" style="background-color: #2563eb; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              📥 ลิงก์ดาวน์โหลด E-book (หมดอายุใน 60 นาที)
            </a>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      status: 'PAID',
      emailSent: true,
      recipientEmail: order.customer_email,
      downloadLink: downloadUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}