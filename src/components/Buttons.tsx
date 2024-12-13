import { useState, useEffect } from 'react';
import styles from './Buttons.module.css';
import { editor } from 'monaco-editor';

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

interface ButtonsProps {
    editorRef: editor.IStandaloneCodeEditor | undefined;
    updateOutput: (output: string) => void;
    codeRunnerUrl: string;
    language: string;
    onLogout?: () => void;
    onNavigateHome: () => void;
    roomData: RoomData;
    onSaveSnapshot?: () => Promise<any>;
    onRetrieveSnapshot: (snapshotId: string) => Promise<any>;
    username: string;
}

interface VersionListResponse {
    message: string;
    versionsList: string[];
}

export function Buttons({ 
    editorRef, 
    updateOutput, 
    codeRunnerUrl, 
    language, 
    onLogout,
    onNavigateHome,
    roomData,
    onSaveSnapshot,
    onRetrieveSnapshot,
    username 
}: ButtonsProps) {
    const [isRunning, setIsRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isRetrieving, setIsRetrieving] = useState(false);
    const [initialTimer, setInitialTimer] = useState<boolean>(true);
    const [timeRemaining, setTimeRemaining] = useState<number>(40);
    const [versionsList, setVersionsList] = useState<string[]>([]);
    const [showVersionsModal, setShowVersionsModal] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<string>("");
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [packageInput, setPackageInput] = useState("");
    const [isInstalling, setIsInstalling] = useState(false);
    const [installStatus, setInstallStatus] = useState("");

    const memberCount = roomData?.data?.members?.length ?? 0;

    useEffect(() => {
        let timer: NodeJS.Timeout;
        
        if (initialTimer && memberCount < 2) {
            timer = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setInitialTimer(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timer) {
                clearInterval(timer);
            }
        };
    }, [initialTimer, memberCount]);

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

    const handleSaveSnapshot = async () => {
        if (!onSaveSnapshot) return;

        setIsSaving(true);
        try {
            const result = await onSaveSnapshot();
        } catch (error) {
            console.error('Error saving snapshot:', error);
            alert('Failed to save snapshot. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const fetchVersionsList = async () => {
        try {
            const response = await fetch(
                `https://jrur6njinc.execute-api.us-east-2.amazonaws.com/dev/snapList?roomId=${roomData.roomId}&userId=${username}`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch versions list');
            }

            const data: VersionListResponse = await response.json();
            setVersionsList(data.versionsList);
            setShowVersionsModal(true);
        } catch (error) {
            console.error('Error fetching versions list:', error);
            alert('Failed to fetch versions list. Please try again.');
        }
    };

    const handleRetrieveSnapshot = async () => {
        await fetchVersionsList();
    };

    const handleVersionSelect = (versionId: string) => {
        setSelectedVersion(versionId);
    };

    const handleConfirmVersionChange = async () => {
        if (!selectedVersion) return;

        setIsRetrieving(true);
        try {
            await onRetrieveSnapshot(selectedVersion);
            setShowVersionsModal(false);
            setSelectedVersion("");
            alert('Version changed successfully!');
        } catch (error) {
            console.error('Error retrieving snapshot:', error);
            alert('Failed to change version. Please try again.');
        } finally {
            setIsRetrieving(false);
        }
    };

    const handleInstallPackages = async () => {
        if (!packageInput.trim()) return;

        setIsInstalling(true);
        const packages = packageInput.split(',').map(pkg => pkg.trim()).filter(pkg => pkg);
        setInstallStatus("");

        for (const pkg of packages) {
            try {
                setInstallStatus(prev => prev + `Installing ${pkg}...\n`);
                const response = await fetch(
                    `http://fargateload-928083646.us-east-2.elb.amazonaws.com:8080/install-package?language=python&package=${pkg}`,
                    { method: 'POST' }
                );

                const data = await response.json();
                setInstallStatus(prev => prev + `${data.message}\n`);
            } catch (error) {
                setInstallStatus(prev => prev + `Failed to install ${pkg}\n`);
            }
        }

        setIsInstalling(false);
    };

    const formatVersion = (version: string, index: number) => {
        return `Version ${versionsList.length - index}`;
    };

    const isRunDisabled = isRunning || (memberCount < 2 && initialTimer);
    const isPythonLanguage = language.toLowerCase() === 'python';

    return (
        <>
            <div className={styles.buttonContainer}>
                <div className={styles.languageIndicator}>
                    {language.toUpperCase()}
                </div>

                <button 
                    className={`${styles.button} ${styles.runButton}`} 
                    onClick={runCode}
                    disabled={isRunDisabled}
                    title={memberCount < 2 && initialTimer ? `Wait ${timeRemaining}s for more members` : ''}
                >
                    {isRunning ? 'Running...' : 
                     (memberCount < 2 && initialTimer) ? `Wait ${timeRemaining}s` : 'Run Code'}
                </button>
                {isPythonLanguage && (
                    <button 
                        className={`${styles.button} ${styles.installButton}`}
                        onClick={() => setShowPackageModal(true)}
                        disabled={isInstalling}
                    >
                        {isInstalling ? 'Installing...' : 'Install Packages'}
                    </button>
                )}
                <button 
                    className={`${styles.button} ${styles.saveButton}`} 
                    onClick={handleSaveSnapshot}
                    disabled={isRunning || isSaving || !onSaveSnapshot}
                >
                    {isSaving ? 'Saving...' : 'Save Snapshot'}
                </button>
                <button 
                    className={`${styles.button} ${styles.retrieveButton}`} 
                    onClick={handleRetrieveSnapshot}
                    disabled={isRunning || isRetrieving}
                >
                    {isRetrieving ? 'Retrieving...' : 'Version History'}
                </button>
                <button 
                    className={`${styles.button} ${styles.logoutButton}`} 
                    onClick={handleLogout}
                >
                    Logout
                </button>
            </div>

            {showVersionsModal && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h3>Select Version</h3>
                        <div className={styles.versionList}>
                            {versionsList.map((version, index) => (
                                <div 
                                    key={index}
                                    className={`${styles.versionItem} ${selectedVersion === version ? styles.selectedVersion : ''}`}
                                    onClick={() => handleVersionSelect(version)}
                                >
                                    <div className={styles.versionHeader}>
                                        {formatVersion(version, index)}
                                    </div>
                                    <div className={styles.versionId}>
                                        ID: {version}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className={styles.modalActions}>
                            <button 
                                className={`${styles.button} ${styles.confirmButton}`}
                                onClick={handleConfirmVersionChange}
                                disabled={!selectedVersion}
                            >
                                Confirm Change
                            </button>
                            <button 
                                className={`${styles.button} ${styles.cancelButton}`}
                                onClick={() => {
                                    setShowVersionsModal(false);
                                    setSelectedVersion("");
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPackageModal && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h3>Install Python Packages</h3>
                        <input
                            type="text"
                            className={styles.packageInput}
                            value={packageInput}
                            onChange={(e) => setPackageInput(e.target.value)}
                            placeholder="Enter package names (comma-separated)"
                            disabled={isInstalling}
                        />
                        {installStatus && (
                            <pre className={styles.installStatus}>
                                {installStatus}
                            </pre>
                        )}
                        <div className={styles.modalActions}>
                            <button 
                                className={`${styles.button} ${styles.confirmButton}`}
                                onClick={handleInstallPackages}
                                disabled={isInstalling || !packageInput.trim()}
                            >
                                {isInstalling ? 'Installing...' : 'Install'}
                            </button>
                            <button 
                                className={`${styles.button} ${styles.cancelButton}`}
                                onClick={() => {
                                    setShowPackageModal(false);
                                    setPackageInput("");
                                    setInstallStatus("");
                                }}
                                disabled={isInstalling}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}