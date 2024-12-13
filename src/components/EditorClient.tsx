'use client';

import * as Y from "yjs";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useRoom } from "@liveblocks/react/suspense";
import React, { useCallback, useEffect, useState } from "react";
import styles from "./CollaborativeEditor.module.css";
import { Avatars } from "@/components/Avatars";
import { Editor } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { MonacoBinding } from "y-monaco";
import { Awareness } from "y-protocols/awareness.js";
import { Cursors } from "@/components/Cursors";
import { Toolbar } from "@/components/Toolbar";
import { useOthers, useSelf } from "@liveblocks/react/suspense";
import { Buttons } from "./Buttons";
import Clock from "./Clock";
import { useRouter } from 'next/navigation';
import { Copy, Check } from 'lucide-react';

interface RoomData {
  roomId: string;
  language: string;
  exists: boolean;
  codeRunner: string;
  data?: {
    roomId: string;
    codeRunner: string;
    bucketid: string;
    language: string;
    members: string[];
  };
}

interface RoomProps {
  roomData: RoomData;
  username: string;
}

interface SnapshotResponse {
  message: string;
  snapshot_id: string;
  code: string;
  metadata: {
    snapId: string;
    user_id: string;
    room_id: string;
    s3_key: string;
    timestamp: string;
  };
}

interface SaveSnapshotResponse {
  message: string;
  snapshot_id: string;
  s3_key: string;
  metadata: {
    snapId: string;
    room_id: string;
    user_id: string;
    s3_key: string;
    timestamp: string;
  };
}

// Helper function to copy text
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // Try the modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers or non-HTTPS environments
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make the textarea out of viewport
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      textArea.remove();
      return true;
    } catch (err) {
      textArea.remove();
      return false;
    }
  } catch (err) {
    return false;
  }
};

// Copy button component
const CopyButton: React.FC<{ roomId: string }> = ({ roomId }) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(roomId);
    
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`ml-2 p-1 rounded-md transition-colors ${
        error ? 'bg-red-200 hover:bg-red-300' :
        copied ? 'bg-green-200 hover:bg-green-300' :
        'hover:bg-gray-200'
      }`}
      title={error ? 'Failed to copy' : 'Copy Room ID'}
      disabled={copied || error}
    >
      {copied ? <Check size={16} className="text-green-600" /> :
       error ? <Copy size={16} className="text-red-600" /> :
       <Copy size={16} />}
    </button>
  );
};

export function EditorClient({ roomData, username }: RoomProps) {
  const router = useRouter();
  const room = useRoom();
  const users = useOthers();
  const currentUser = useSelf();
  const [provider, setProvider] = useState<LiveblocksYjsProvider>();
  const [editorRef, setEditorRef] = useState<editor.IStandaloneCodeEditor>();
  const [output, setOutput] = useState<string>("");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>("");

  const saveSnapshot = async () => {
    try {
      if (!editorRef) {
        throw new Error('Editor not initialized');
      }

      const currentCode = editorRef.getValue();
      
      const payload = {
        language: roomData.language,
        user_id: username,
        room_id: roomData.roomId,
        code: currentCode,
        action: "save"
      };

      const response = await fetch('https://ecygpoprbyzxp7r66x5762e74u0gvere.lambda-url.us-east-2.on.aws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to save snapshot');
      }

      const data: SaveSnapshotResponse = await response.json();
      setLastSavedSnapshot(data.snapshot_id);
      alert(`Snapshot saved successfully! Snapshot ID: ${data.snapshot_id}`);
      return data;
    } catch (error) {
      console.error('Error saving snapshot:', error);
      alert('Failed to save snapshot');
      throw error;
    }
  };

  const retrieveSnapshot = async (snapshotId: string) => {
    try {
      const payload = {
        language: roomData.language,
        user_id: username,
        room_id: roomData.roomId,
        action: "retrieve",
        snapshot_id: snapshotId
      };

      const response = await fetch('https://ecygpoprbyzxp7r66x5762e74u0gvere.lambda-url.us-east-2.on.aws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve snapshot');
      }

      const data: SnapshotResponse = await response.json();
      
      if (editorRef) {
        const model = editorRef.getModel();
        if (model) {
          model.setValue(data.code);
        }
      }

      return data;
    } catch (error) {
      console.error('Error retrieving snapshot:', error);
      throw error;
    }
  };

  const getUserCount = () => {
    if (!roomData?.data?.members) {
      return 1;
    }
    const memberCount = roomData.data.members.length;
    return memberCount > 0 ? memberCount : 1;
  };

  useEffect(() => {
    let yProvider: LiveblocksYjsProvider;
    let yDoc: Y.Doc;
    let binding: MonacoBinding;

    if (editorRef && typeof window !== 'undefined') {
      yDoc = new Y.Doc();
      const yText = yDoc.getText("monaco");
      yProvider = new LiveblocksYjsProvider(room, yDoc);
      setProvider(yProvider);

      binding = new MonacoBinding(
        yText,
        editorRef.getModel() as editor.ITextModel,
        new Set([editorRef]),
        yProvider.awareness as unknown as Awareness
      );
    }

    return () => {
      yDoc?.destroy();
      yProvider?.destroy();
      binding?.destroy();
    };
  }, [editorRef, room]);

  const handleOnMount = useCallback((e: editor.IStandaloneCodeEditor) => {
    setEditorRef(e);
    const model = e.getModel();
    if (model) {
      editor.setModelLanguage(model, roomData.language);
    }
    
    e.updateOptions({
      fontSize: 14,
      lineHeight: 1.6,
      minimap: { enabled: false },
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible'
      },
      padding: { top: 16, bottom: 16 }
    });
  }, [roomData.language]);

  const handleLogout = async () => {
    await room.disconnect();
  };

  return (
    <div className={styles.container}>
      {provider ? <Cursors yProvider={provider} /> : null}
      
      <div className={styles.editorHeader}>
        <div>{editorRef ? <Toolbar editor={editorRef} /> : null}</div>
        <Buttons 
          editorRef={editorRef} 
          updateOutput={setOutput}
          codeRunnerUrl={roomData.codeRunner}
          language={roomData.language}
          onLogout={handleLogout}
          onNavigateHome={() => router.push('/')}
          roomData={roomData}
          onSaveSnapshot={saveSnapshot}
          onRetrieveSnapshot={retrieveSnapshot}
          username={username}
        />
        <Avatars />
      </div>

      <div className={styles.userData}>
        <div className={styles.userDataItem}>
          <span className={styles.userDataLabel}>Room ID:</span>
          <span className={styles.userDataValue}>{roomData.roomId}</span>
          <CopyButton roomId={roomData.roomId} />
        </div>
        <div className={styles.userDataItem}>
          <span className={styles.userDataLabel}>Users in the room:</span>
          <span className={styles.userDataValue}>{getUserCount()}</span>
        </div>
        <div className={styles.userDataItem}>
          <span className={styles.userDataLabel}>Active Tabs:</span>
          <span className={styles.userDataValue}>{users.length + 1}</span>
        </div>
        <div className={styles.userDataItem}>
          <span className={styles.userDataLabel}>Current User:</span>
          <span className={styles.userDataValue} style={{ color: currentUser.info.color }}>
            {currentUser.info.name}
          </span>
        </div>
        <div className={styles.userDataItem}>
          <span className={styles.userDataLabel}>Language:</span>
          <span className={styles.userDataValue}>{roomData.language.toUpperCase()}</span>
        </div>
      </div>

      <div className={styles.editorContainer}>
        <Editor
          onMount={handleOnMount}
          height="100%"
          width="100%"
          theme="vs-dark"
          defaultLanguage={roomData.language as string}
          defaultValue=""
          options={{
            tabSize: 2,
            padding: { top: 20 },
          }}
        />
      </div>

      <div className={styles.outputContainer}>
        <h3>Execution Output</h3>
        <pre>{output || "Run your code to see the output here..."}</pre>
      </div>
    </div>
  );
}