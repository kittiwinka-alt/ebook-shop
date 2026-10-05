import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      console.error('Missing STRIPE_SECRET_KEY in environment variables');
      return NextResponse.json(
        { error: 'ระบบการชำระเงินยังไม่ได้กำหนดค่า API Key' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });

    const { items, paymentMethod, userId } = await req.json();

    // หา base URL ที่ปลอดภัย
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const lineItems = items.map((item: any) => {
      // ตรวจสอบรูปภาพ: Stripe อนุญาตเฉพาะ URL ที่ขึ้นต้นด้วย http:// หรือ https:// เท่านั้น
      const isValidImageUrl = 
        typeof item.cover_url === 'string' && 
        (item.cover_url.startsWith('http://') || item.cover_url.startsWith('https://'));

      return {
        price_data: {
          currency: 'thb',
          product_data: {
            name: item.title,
            // ถ้าไม่ใช่ Full URL ห้ามใส่ images ส่งไป Stripe
            ...(isValidImageUrl ? { images: [item.cover_url] } : {}),
          },
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: 1,
      };
    });

    const paymentMethodTypes = paymentMethod === 'promptpay' ? ['promptpay'] : ['card'];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethodTypes,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cart=open`,
      metadata: {
        userId: userId || '',
        bookIds: items.map((i: any) => String(i.id)).join(','),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}