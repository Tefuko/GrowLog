'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center">読み込み中...</main>;
  }
  if (!session) {
    return null; // リダイレクト中
  }
  return <>{children}</>;
}