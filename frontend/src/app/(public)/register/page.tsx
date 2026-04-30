'use client';
import { useRouter } from 'next/navigation';
export default function RegisterRedirect() {
  const router = useRouter();
  if (typeof window !== 'undefined') router.push('/apply');
  return null;
}
