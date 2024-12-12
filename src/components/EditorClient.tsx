'use client';

import * as Y from "yjs";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useRoom } from "@liveblocks/react/suspense";
import { useCallback, useEffect, useState } from "react";
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
import { Copy } from 'lucide-react'; // Import the copy icon

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

interface RoomProps {
  roomData: RoomData;
  username: string;
}

export function EditorClient({ roomData, username }: RoomProps) {
  const router = useRouter();
  const room = useRoom();
  const users = useOthers();
  const currentUser = useSelf();
  const [provider, setProvider] = useState<LiveblocksYjsProvider>();
  const [editorRef, setEditorRef] = useState<editor.IStandaloneCodeEditor>();
  const [output, setOutput] = useState<string>("");

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomData.roomId);
      alert('Room ID copied to clipboard!');
    } catch (err) {
      alert('Failed to copy room ID');
      console.error('Failed to copy:', err);
    }
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
        />
        <Avatars />
      </div>

      <div className={styles.userData}>
        <div className={styles.userDataItem}>
          <span className={styles.userDataLabel}>Room ID:</span>
          <span className={styles.userDataValue}>{roomData.roomId}</span>
          <button
            onClick={copyRoomId}
            className="ml-2 p-1 hover:bg-gray-200 rounded-md transition-colors"
            title="Copy Room ID"
          >
            <Copy size={16} />
          </button>
        </div>
        <div className={styles.userDataItem}>
          <span className={styles.userDataLabel}>Welcome,</span>
          <span className={styles.userDataValue}>{username}</span>
        </div>
        <div className={styles.userDataItem}>
          <span className={styles.userDataLabel}>Active Users:</span>
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