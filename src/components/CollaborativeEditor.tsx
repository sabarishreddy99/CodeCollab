'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Dynamic import for components that use browser-specific APIs
const EditorComponent = dynamic(() => 
  import('@/components/EditorClient').then(mod => mod.EditorClient), 
  { 
    ssr: false,
    loading: () => <div>Loading editor...</div>
  }
);

interface RoomProps {
  roomId: string;
  username: string;
}

export function CollaborativeEditor({ roomId, username }: RoomProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <EditorComponent roomId={roomId} username={username} />;
}