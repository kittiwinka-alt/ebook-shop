// กำหนดอีเมลของแอดมินที่อนุญาตให้เข้าใช้งานหลังบ้าน
export const ADMIN_EMAILS: string[] = [
  'admin@winsdev.store',     // ใส่อีเมลแอดมินของคุณ
  // สามารถใส่อีเมลของคุณเพิ่มตรงนี้ได้
];

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}