'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'signup'>('signup');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ตรวจสอบเงื่อนไขความปลอดภัยรหัสผ่าน
  const passwordChecks = useMemo(() => {
    return {
      length: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    };
  }, [password]);

  // คำนวณคะแนนระดับความปลอดภัย (0 - 4)
  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordChecks.length) score += 1;
    if (passwordChecks.hasUpper) score += 1;
    if (passwordChecks.hasLower) score += 1;
    if (passwordChecks.hasNumber) score += 1;
    return score;
  }, [passwordChecks]);

  // การแสดงผลระดับความปลอดภัย
  const strengthInfo = useMemo(() => {
    if (!password) return { text: 'ไม่ได้ระบุ', color: 'text-slate-500', barColor: 'bg-slate-700' };
    if (strengthScore <= 1) return { text: 'ความปลอดภัยต่ำ', color: 'text-rose-400', barColor: 'bg-rose-500' };
    if (strengthScore === 2) return { text: 'ความปลอดภัยปานกลาง', color: 'text-amber-400', barColor: 'bg-amber-500' };
    if (strengthScore === 3) return { text: 'ความปลอดภัยมาตรฐาน', color: 'text-indigo-400', barColor: 'bg-indigo-500' };
    return { text: 'ความปลอดภัยสูง', color: 'text-emerald-400', barColor: 'bg-emerald-500' };
  }, [password, strengthScore]);

  // ตรวจสอบความตรงกันของรหัสผ่าน
  const isMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('กรุณากรอกรูปแบบอีเมลให้ถูกต้อง (เช่น name@example.com)');
      return;
    }

    if (mode === 'signup') {
      if (strengthScore < 3) {
        setErrorMessage('รหัสผ่านไม่ผ่านเกณฑ์ความปลอดภัยที่กำหนด');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }

      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setErrorMessage('อีเมลนี้ถูกลงทะเบียนในระบบแล้ว');
        } else {
          setErrorMessage('การลงทะเบียนไม่สำเร็จ: ' + error.message);
        }
      } else {
        // หากระบบ Supabase ส่งอีเมลยืนยัน Session จะยังไม่เกิดขึ้นทันที
        if (data?.user && !data.session) {
          setSuccessMessage(
            `ระบบได้ส่งลิงก์ยืนยันตัวตนไปยัง ${cleanEmail} เรียบร้อยแล้ว กรุณาตรวจสอบกล่องข้อความในอีเมลและกดยืนยันตัวตนก่อนดำเนินการเข้าสู่ระบบ`
          );
        } else {
          setSuccessMessage('ลงทะเบียนสำเร็จ สามารถเข้าสู่ระบบได้ทันที');
        }
      }
    } else {
      if (!password) {
        setErrorMessage('กรุณาระบุรหัสผ่าน');
        return;
      }

      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setErrorMessage('บัญชีนี้ยังไม่ได้รับการยืนยันตัวตน กรุณาตรวจสอบกล่องข้อความในอีเมลและกดยืนยันตัวตนก่อนเข้าสู่ระบบ');
        } else {
          setErrorMessage('ข้อมูลอีเมลหรือรหัสผ่านไม่ถูกต้อง');
        }
      } else {
        router.push('/');
        router.refresh();
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#070D18] flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white font-sans relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Form Container */}
      <div className="bg-[#0F172A]/95 border border-slate-800 rounded-2xl p-8 max-w-[420px] w-full shadow-2xl relative z-10">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white tracking-wide">
            {mode === 'signup' ? 'ลงทะเบียนบัญชีผู้ใช้' : 'เข้าสู่ระบบบัญชีผู้ใช้'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Win's Dev Store • Digital Assets Management
          </p>
        </div>

        {/* Tab Controls */}
        <div className="grid grid-cols-2 bg-[#0B1120] p-1 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ลงทะเบียน
          </button>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-3 leading-snug">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl p-3.5 leading-relaxed">
            <div className="font-semibold text-emerald-300 mb-1">การลงทะเบียนเสร็จสมบูรณ์</div>
            <div>{successMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          
          {/* Email Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              อีเมล
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0B1120] border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              รหัสผ่าน
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="ระบุรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0B1120] border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 pr-16 text-sm text-white placeholder-slate-600 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs transition-colors cursor-pointer select-none"
              >
                {showPassword ? 'ซ่อน' : 'แสดง'}
              </button>
            </div>
          </div>

          {/* Password Strength Section (Signup Only) */}
          {mode === 'signup' && (
            <div className="space-y-3 pt-1">
              
              <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">ระดับความปลอดภัย:</span>
                  <span className={`font-semibold ${strengthInfo.color}`}>{strengthInfo.text}</span>
                </div>
                
                <div className="grid grid-cols-4 gap-1.5 h-1.5">
                  <div className={`rounded-full transition-all duration-300 ${strengthScore >= 1 ? strengthInfo.barColor : 'bg-slate-800'}`} />
                  <div className={`rounded-full transition-all duration-300 ${strengthScore >= 2 ? strengthInfo.barColor : 'bg-slate-800'}`} />
                  <div className={`rounded-full transition-all duration-300 ${strengthScore >= 3 ? strengthInfo.barColor : 'bg-slate-800'}`} />
                  <div className={`rounded-full transition-all duration-300 ${strengthScore >= 4 ? strengthInfo.barColor : 'bg-slate-800'}`} />
                </div>

                <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordChecks.length ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span className={passwordChecks.length ? 'text-slate-200' : 'text-slate-500'}>
                      อย่างน้อย 8 ตัวอักษร
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordChecks.hasNumber ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span className={passwordChecks.hasNumber ? 'text-slate-200' : 'text-slate-500'}>
                      ตัวเลข (0-9)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordChecks.hasUpper ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span className={passwordChecks.hasUpper ? 'text-slate-200' : 'text-slate-500'}>
                      ตัวพิมพ์ใหญ่ (A-Z)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordChecks.hasLower ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span className={passwordChecks.hasLower ? 'text-slate-200' : 'text-slate-500'}>
                      ตัวพิมพ์เล็ก (a-z)
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ยืนยันรหัสผ่าน
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="ระบุรหัสผ่านอีกครั้ง"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full bg-[#0B1120] border rounded-xl px-4 py-2.5 pr-16 text-sm text-white placeholder-slate-600 outline-none transition-all ${
                      isMatch === false
                        ? 'border-rose-500/80 focus:border-rose-500'
                        : isMatch === true
                        ? 'border-emerald-500/80 focus:border-emerald-500'
                        : 'border-slate-800 focus:border-indigo-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs transition-colors cursor-pointer select-none"
                  >
                    {showConfirmPassword ? 'ซ่อน' : 'แสดง'}
                  </button>
                </div>

                {isMatch === false && (
                  <p className="text-[11px] text-rose-400 mt-1.5">
                    รหัสผ่านไม่ตรงกัน
                  </p>
                )}
                {isMatch === true && (
                  <p className="text-[11px] text-emerald-400 mt-1.5">
                    รหัสผ่านตรงกันสมบูรณ์
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-98 cursor-pointer mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                กำลังดำเนินการ...
              </span>
            ) : mode === 'signup' ? (
              'ลงทะเบียน'
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>
        </form>

        {/* Footer Switch */}
        <div className="mt-6 text-center text-xs text-slate-400">
          {mode === 'signup' ? (
            <span>
              มีบัญชีผู้ใช้อยู่แล้ว?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4 cursor-pointer"
              >
                เข้าสู่ระบบ
              </button>
            </span>
          ) : (
            <span>
              ยังไม่มีบัญชีผู้ใช้?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4 cursor-pointer"
              >
                ลงทะเบียน
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
}