import { createClient } from '@/utils/supabase/server';
import { generatePairingCode } from './actions';
import { RefreshCw, Smartphone, ShieldCheck, CheckCircle, Send, BrainCircuit, Zap, Shield, Activity } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { RealtimeRedirect } from '@/components/auth/RealtimeRedirect';

import { PairingTimer } from '@/components/dashboard/PairingTimer';
import { LanguageSwitcher } from '@/components/dashboard/LanguageSwitcher';
import {
  getUserDisplayName,
  generatePairingCodeData,
  isPairingCodeExpired,
  isUserPaired,
  isUserPendingContact,
} from '@/lib/pairing/helpers';
import type { Profile } from '@/lib/pairing/types';

export default async function PairingPage() {
  const t = await getTranslations('Pairing');
  const supabase = await createClient();


  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .schema('mindops')
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Error fetching profile:', profileError);
  }

  if (isUserPaired(profile)) {
    redirect('/dashboard');
  }

  const userName = getUserDisplayName(profile, user.user_metadata, user.email);

  // ── PENDING CONTACT VIEW ───────────────────────────────
  if (isUserPendingContact(profile)) {
    return (
      <main className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500/30">
        <RealtimeRedirect userId={user.id} />

        {/* Language switcher — top right overlay */}
        <div className="fixed top-4 right-4 z-50 [&_div]:text-white [&_span]:text-white/50 [&_button]:text-white/50 hover:[&_button]:text-white [&_.bg-slate-100]:bg-white/10 [&_.bg-white]:bg-white/20">
          <LanguageSwitcher />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
          {/* Left — Brand panel */}
          <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-950 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }} />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-emerald-500">
                  <BrainCircuit className="text-white" size={18} />
                </div>
                <span className="text-lg font-black tracking-tight">
                  <span className="text-white">MIND</span>
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">OPS</span>
                </span>
              </div>
            </div>

            <div className="relative z-10 space-y-8">
              <h2 className="text-5xl font-black italic tracking-tight leading-[1.05]">
                {t.rich('almostThere', {
                  br: (chunks) => <><br />{chunks}</>
                })}
              </h2>
              <p className="text-white/40 text-lg font-medium max-w-sm leading-relaxed">
                {t('pendingDescription')}
              </p>
            </div>


            <div className="relative z-10 flex items-center gap-6 text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">
              <span className="flex items-center gap-2"><CheckCircle size={12} /> {t('codeVerified')}</span>
              <span className="flex items-center gap-2"><Send size={12} /> {t('contactPending')}</span>
            </div>

            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
          </div>

          {/* Right — Action panel */}
          <div className="flex flex-col items-center justify-center p-8 md:p-16 relative">
            <div className="w-full max-w-lg space-y-10">
              <div className="text-center lg:text-left">
                <div className="lg:hidden mb-6">
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500">
                      <BrainCircuit className="text-white" size={18} />
                    </div>
                    <span className="text-lg font-black tracking-tight">
                      <span className="text-white">MIND</span>
                      <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">OPS</span>
                    </span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-6">
                  <CheckCircle size={12} /> {t('codeAccepted')}
                </div>
                <h1 className="text-4xl md:text-5xl font-black italic tracking-tight leading-none mb-4">
                  {t.rich('shareContact', {
                    br: (chunks) => <><br />{chunks}</>
                  })}
                </h1>
                <p className="text-white/40 text-lg font-medium leading-relaxed">
                  {t('oneLastStep', { name: userName })}
                </p>

              </div>

              <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-3 text-white/30">
                  <Smartphone size={18} />
                  <span className="text-xs font-black uppercase tracking-[0.3em]">{t('inTelegram')}</span>
                </div>
                <p className="text-white/60 text-sm font-medium leading-relaxed">
                  {t('sharePrompt')}
                </p>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl text-emerald-400 font-black text-xl text-center">
                  {t('shareBadge')}
                </div>
                <p className="text-white/20 text-xs font-medium text-center">
                  {t('autoUpdate')}
                </p>

              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── NORMAL PAIRING FLOW ───────────────────────────────
  const pairingData = await ensureValidPairingCode(supabase, user, profile);

  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30">
      <RealtimeRedirect userId={user.id} />

      {/* Language switcher — top right overlay */}
      <div className="fixed top-4 right-4 z-50 [&_div]:text-white [&_span]:text-white/50 [&_button]:text-white/50 hover:[&_button]:text-white [&_.bg-slate-100]:bg-white/10 [&_.bg-white]:bg-white/20">
        <LanguageSwitcher />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left — Brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-950 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-indigo-600">
                <BrainCircuit className="text-white" size={18} />
              </div>
              <span className="text-lg font-black tracking-tight">
                <span className="text-white">MIND</span>
                <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">OPS</span>
              </span>
            </div>
          </div>

          <div className="relative z-10 space-y-8">
            <h2 className="text-5xl font-black italic tracking-tight leading-[1.05]">
              {t.rich('connectMind', {
                br: (chunks) => <><br />{chunks}</>
              })}
            </h2>
            <p className="text-white/40 text-lg font-medium max-w-sm leading-relaxed">
              {t('pairingDescription')}
            </p>


            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Activity, label: t('trackFriction'), desc: t('trackFrictionDesc') },
                { icon: Zap, label: t('aiInsights'), desc: t('aiInsightsDesc') },
                { icon: Shield, label: t('protection'), desc: t('protectionDesc') },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 space-y-2">
                  <Icon size={16} className="text-indigo-400" />
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/60">{label}</p>
                  <p className="text-[10px] text-white/25 font-medium">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-6 text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">
            <span>Mental Performance Engineering</span>
          </div>
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
        </div>

        {/* Right — Code panel */}
        <div className="flex flex-col items-center justify-center p-8 md:p-16 relative">
          <div className="w-full max-w-lg space-y-10">
            {/* Header */}
            <div className="text-center lg:text-left">
              <div className="lg:hidden mb-6">
                <div className="flex items-center justify-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-600">
                    <BrainCircuit className="text-white" size={18} />
                  </div>
                  <span className="text-lg font-black tracking-tight">
                    <span className="text-white">MIND</span>
                    <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">OPS</span>
                  </span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black italic tracking-tight leading-none mb-4">
                {t.rich('connectSpace', {
                  br: (chunks) => <><br />{chunks}</>
                })}
              </h1>
              <p className="text-white/40 text-lg font-medium leading-relaxed">
                {t('linkAccount', { name: userName })}
              </p>

            </div>

            {/* Code card */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8 md:p-10 space-y-8">
              <div className="flex items-center justify-center gap-3 text-white/30">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">{t('securityKey')}</span>
              </div>


              <div className="text-center">
                <div className="text-7xl md:text-8xl font-mono font-black tracking-[0.15em] text-white py-6 border-y border-white/[0.06]">
                  {pairingData.code}
                </div>
              </div>

              <div className="space-y-6">
                <PairingTimer expiresAt={pairingData.expiresAt} />

                <form action={async (_formData: FormData) => {
                  'use server';
                  await generatePairingCode();
                }} className="flex justify-center">
                  <button
                    type="submit"
                    className="cursor-pointer flex items-center gap-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                  >
                    <RefreshCw size={14} />
                    {t('requestNewCode')}
                  </button>

                </form>
              </div>
            </div>

            {/* Telegram instruction */}
            <div className="bg-indigo-600 rounded-3xl p-8 relative overflow-hidden group">
              <div className="relative z-10 space-y-5">
                <div className="flex items-center gap-3">
                  <Smartphone size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">{t('inTelegram')}</span>
                </div>

                <p className="text-white/80 text-sm font-medium leading-relaxed">
                  {t('sendExactMessage')}
                </p>
                <div className="cursor-pointer bg-white/10 backdrop-blur-xl p-5 rounded-2xl border border-white/20 font-mono text-xl font-black text-center hover:bg-white/20 transition-all select-all">
                  {t('linkCommand', { code: pairingData.code })}
                </div>

              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

async function ensureValidPairingCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; user_metadata: Record<string, string>; email?: string },
  profile: Profile | null
) {
  const currentCode = profile?.pairing_code;
  const currentExpiresAt = profile?.pairing_code_expires_at;

  if (currentCode && !isPairingCodeExpired(currentExpiresAt)) {
    return {
      code: currentCode,
      expiresAt: currentExpiresAt!,
      profile,
    };
  }

  const { code, expiresAt } = generatePairingCodeData();
  const userName = getUserDisplayName(profile, user.user_metadata, user.email);

  const { data: updatedProfile, error: upsertError } = await supabase
    .schema('mindops')
    .from('profiles')
    .upsert(
      {
        id: user.id,
        pairing_code: code,
        pairing_code_expires_at: expiresAt,
        first_name: profile?.first_name || userName,
        onboarding_state: 'PENDING_LINK',
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (upsertError) {
    console.error('Error upserting pairing code:', upsertError);
  }

  return {
    code,
    expiresAt,
    profile: updatedProfile || profile,
  };
}