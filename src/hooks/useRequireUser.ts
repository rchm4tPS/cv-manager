'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import type { User } from '@supabase/supabase-js';

/**
 * Centralized accessor for the authenticated user on client components.
 *
 * Returns the current `user` (or `null` while loading / when signed out).
 * As a safety net for protected routes, it redirects to `/login` only after
 * auth has settled (`isLoading === false`) and no user is present — so it
 * never triggers a redirect during the initial session check.
 */
export function useRequireUser(): User | null {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  return user;
}
