'use client';

import { ReactNode } from "react";
import { RoomProvider } from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";
import { Loading } from "@/components/Loading";

interface RoomProps {
  roomId: string;
  username: string;
  children: ReactNode;
}

export function Room({ roomId, username, children }: RoomProps) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        name: username,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      }}
    >
      <ClientSideSuspense fallback={<Loading />}>
        {children}
      </ClientSideSuspense>
    </RoomProvider>
  );
}