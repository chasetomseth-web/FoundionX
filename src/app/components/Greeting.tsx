'use client';

import { useAuth } from '@/contexts/AuthContext';

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getName(user: any): string {
  return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
}

export default function Greeting() {
  const { user } = useAuth();
  const greeting = getTimeGreeting();
  const name = getName(user);

  return (
    <h1 className="text-2xl font-600 text-foreground">
      {greeting}, {name}
    </h1>
  );
}