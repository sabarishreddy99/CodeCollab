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

interface RoomProps {
  roomId: string;
  username: string;
}

export function EditorClient({ roomId, username }: RoomProps) {
  const room = useRoom();
  const users = useOthers();
  const currentUser = useSelf();
  const [provider, setProvider] = useState<LiveblocksYjsProvider>();
  const [editorRef, setEditorRef] = useState<editor.IStandaloneCodeEditor>();
  const [output, setOutput] = useState<string>(""); 

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
  }, []);

  const updateOutput = (newOutput: string) => {
    setOutput(newOutput);
  };

  return (
    <div className={styles.container}>
      {provider ? <Cursors yProvider={provider} /> : null}
      <div className={styles.editorHeader}>
        <div>{editorRef ? <Toolbar editor={editorRef} /> : null}</div>
        <Clock />
        <Buttons editorRef={editorRef} updateOutput={updateOutput} />
        <Avatars />
      </div>
      <div className={styles.userData}>
        <p><strong>Room Id:</strong> {roomId}</p>
        <p><strong>Welcome, </strong>{username}</p>      
      </div>
      <div className={styles.userData}>
        <p><strong>Active Users:</strong> {users.length + 1}</p>
        <p style={{ color: currentUser.info.color }}><strong>Current User:</strong> {currentUser.info.name}</p>      
      </div>
      <div className={styles.editorContainer}>
        <Editor
          onMount={handleOnMount}
          height="100%"
          width="100%"
          theme="vs-light"
          defaultLanguage="python"
          defaultValue=""
          options={{
            tabSize: 2,
            padding: { top: 20 },
          }}
        />
      </div>
      <div className={styles.outputContainer}>
        <h3>Execution Output:</h3>
        <pre>{output}</pre>
      </div>
    </div>
  );
}