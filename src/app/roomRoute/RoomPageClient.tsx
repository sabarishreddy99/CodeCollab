'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Room } from '@/app/Room';
import dynamic from 'next/dynamic';
import { Loading } from '@/components/Loading';

const CollaborativeEditor = dynamic(
  () => import('@/components/CollaborativeEditor').then(mod => mod.CollaborativeEditor),
  { 
    ssr: false,
    loading: () => <Loading />
  }
);

export function RoomPage() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');
  const username = searchParams.get('username');

  if (!roomId || !username) {
    return <div>Error: Missing roomId or username.</div>;
  }

  return (
    <main>
      <Room roomId={roomId} username={username}>
        <Suspense fallback={<Loading />}>
          <CollaborativeEditor roomId={roomId} username={username} />
        </Suspense>
      </Room>
    </main>
  );
}

export default RoomPage;