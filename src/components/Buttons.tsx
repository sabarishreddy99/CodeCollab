import { useState } from 'react';
import styles from './Buttons.module.css';
import { editor } from 'monaco-editor';

interface ButtonsProps {
    editorRef: editor.IStandaloneCodeEditor | undefined;
    updateOutput: (output: string) => void;
    codeRunnerUrl: string;
    language: string;
    onLogout?: () => void;
    onNavigateHome: () => void;  // New prop for handling navigation
}

export function Buttons({ 
    editorRef, 
    updateOutput, 
    codeRunnerUrl, 
    language, 
    onLogout,
    onNavigateHome 
}: ButtonsProps) {
    const [isRunning, setIsRunning] = useState(false);

    const handleClick = (message: string) => {
        alert(message);
    };

    const handleLogout = async () => {
        if (onLogout) {
            await onLogout();
        }
        onNavigateHome();
    };

    const runCode = async () => {
        if (!editorRef) return;

        setIsRunning(true);
        updateOutput("Running code...");
        
        const code = editorRef.getValue();
        const postData = { code };

        try {
            const response = await fetch(codeRunnerUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(postData),
            });

            if (response.ok) {
                const result = await response.json();
                updateOutput(result.output);
            } else {
                const errorText = await response.text();
                updateOutput(`Error: ${errorText}`);
            }
        } catch (err) {
            if (err instanceof Error) {
                updateOutput(`Error: ${err.message}`);
            } else {
                updateOutput("An unknown error occurred.");
            }
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className={styles.buttonContainer}>
            <div className={styles.languageIndicator}>
                {language.toUpperCase()}
            </div>

            <button 
                className={`${styles.button} ${styles.runButton}`} 
                onClick={runCode}
                disabled={isRunning}
            >
                {isRunning ? 'Running...' : 'Run Code'}
            </button>
            <button 
                className={`${styles.button} ${styles.saveButton}`} 
                onClick={() => handleClick('Save Snapshot button clicked')}
                disabled={isRunning}
            >
                Save Snapshot
            </button>
            <button 
                className={`${styles.button} ${styles.logoutButton}`} 
                onClick={handleLogout}
            >
                Logout
            </button>
        </div>
    );
}