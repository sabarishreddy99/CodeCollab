import React from 'react';

export default function RoomRoute({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
        <>
        {children}
        </>
    );
  }