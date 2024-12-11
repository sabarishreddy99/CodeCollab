import { useState } from 'react';
import styles from './Buttons.module.css';
import { editor } from 'monaco-editor';

interface ButtonsProps {
    editorRef: editor.IStandaloneCodeEditor | undefined;
    updateOutput: (output: string) => void; // New prop for updating output
}

export function Buttons({ editorRef, updateOutput }: ButtonsProps) {
    const [selectedLanguage, setSelectedLanguage] = useState('python'); // Default to Python

    const handleClick = (message: string) => {
        alert(message);
    };

    const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedLanguage(event.target.value);
    };

    const runCode = async () => {
        if (!editorRef) return; // Ensure editorRef is available


        const pythonLB = "http://fargateLoad-928083646.us-east-2.elb.amazonaws.com:8080/process_code?language=python";
        const cppLB = "http://ecscpploadbal-1198534135.us-east-2.elb.amazonaws.com:8080/process_code?language=cpp";
        const javascriptLB = "http://ecsnodeloadbal-789641141.us-east-2.elb.amazonaws.com:8080/process_code?language=javascript";

        let runtimeEnvLB = pythonLB;
        if (selectedLanguage === 'javascript') {
            runtimeEnvLB = javascriptLB;
        }
        else if (selectedLanguage === 'cpp') {
            runtimeEnvLB = cppLB;
        }

        const code = editorRef.getValue(); // Gets multiline code as a single string with line breaks
        const postData = {
            code,
        };

        try {
            const response = await fetch(runtimeEnvLB, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(postData),
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Execution Result:", result);
                updateOutput(result.output); // Update output state in parent component
            } else {
                console.error("Error:", await response.text());
                updateOutput("Error executing code."); // Update output with error message
            }
        } catch (err) {
            console.error("API Error:", err);
            if (err instanceof Error) {
                updateOutput(err.message); // Update output with error message
            } else {
                updateOutput("An unknown error occurred."); // Handle unknown error type
            }
            // updateOutput("API Error occurred."); // Update output with error message
        }
    };

    return (
        <div>
            <select value={selectedLanguage} onChange={handleLanguageChange}>
                <option value="javascript">Js</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
            </select>

            {/* Update Run button to call runCode */}
            <button className={`${styles.buttons}`} onClick={runCode}>Run</button>
            <button className={`${styles.buttons}`} onClick={() => handleClick('Save Snapshot button clicked')}>Save Snapshot</button>
        </div>
    );
}