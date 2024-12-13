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
    const roomId = searchParams.get('roomId');
    const username = searchParams.get('username');
    const language = searchParams.get('language');

    if (!roomId || !username || !language) {
      setError('Missing required parameters.');
      return;
    }

    try {
      // Retrieve room data from sessionStorage
      const storedRoomData = sessionStorage.getItem('roomData');
      if (storedRoomData) {
        const parsedRoomData = JSON.parse(storedRoomData);
        setRoomData(parsedRoomData);
      } else {
        setError('Room data not found.');
      }
    } catch (error) {
      setError('Error retrieving room data.');
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
        roomId={searchParams.get('roomId')!} 
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