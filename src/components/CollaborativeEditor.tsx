'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

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

interface EditorProps {
  roomData: RoomData;
  username: string;
}

// Dynamic import for components that use browser-specific APIs
const EditorComponent = dynamic(() => 
  import('@/components/EditorClient').then(mod => mod.EditorClient), 
  { 
    ssr: false,
    loading: () => <div>Loading editor...</div>
  }
);

export function CollaborativeEditor({ roomData, username }: EditorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <EditorComponent 
    roomData={roomData}
    username={username}
  />;
}