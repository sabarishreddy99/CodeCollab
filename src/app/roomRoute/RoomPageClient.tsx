'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Room } from '@/app/Room';
import dynamic from 'next/dynamic';
import { Loading } from '@/components/Loading';

interface RoomData {
  roomId: string;
  language: string;
  exists: boolean;
  codeRunner: string;
  data: {
    roomId: string;
    codeRunner: string;
    bucketid: string;
    language: string;
    members: string[];
  };
}

const CollaborativeEditor = dynamic(
  () => import('@/components/CollaborativeEditor').then(mod => mod.CollaborativeEditor),
  { 
    loading: () => <Loading />,
    ssr: false
  }
);

const ErrorDisplay = ({ message }: { message: string }) => (
  <div className="flex h-screen items-center justify-center">
    <div className="text-center p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
      <p className="text-gray-700">{message}</p>
    </div>
  </div>
);

export function RoomPage() {
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    const encodedRoomData = searchParams.get('roomData');
    const username = searchParams.get('username');

    if (!encodedRoomData || !username) {
      setError('Missing required room data or username.');
      return;
    }

    try {
      const decoded = JSON.parse(decodeURIComponent(encodedRoomData));
      setRoomData(decoded);
    } catch (error) {
      setError('Invalid room data format.');
    }
  }, [searchParams]);

  if (!isClient) {
    return <Loading />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  if (!roomData || !searchParams.get('username')) {
    return <Loading />;
  }

  return (
    <main className="h-screen">
      <Room 
        roomId={roomData.roomId} 
        username={searchParams.get('username')!}
      >
        <Suspense fallback={<Loading />}>
          <CollaborativeEditor 
            roomData={roomData}
            username={searchParams.get('username')!}
          />
        </Suspense>
      </Room>
    </main>
  );
}

export default RoomPage;