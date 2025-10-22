
import React, { useState, useRef, useCallback, useEffect } from 'react';
// FIX: Removed 'LiveSession' as it is not an exported member of '@google/genai'.
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { MicIcon, StopIcon, CopyIcon, TrashIcon } from './components/Icon';
import { createPcmBlob } from './utils/audio';

// FIX: Removed type alias that depended on the unexported 'LiveSession' type.

const App: React.FC = () => {
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [transcript, setTranscript] = useState<string>('');
    const [status, setStatus] = useState<string>('Bấm nút để bắt đầu ghi âm');
    const [copyStatus, setCopyStatus] = useState<string>('');

    const aiRef = useRef<GoogleGenAI | null>(null);
    // FIX: Updated ref type to use Promise<any> since the LiveSession type is not available.
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const currentTranscriptRef = useRef('');

    useEffect(() => {
        if (!process.env.API_KEY) {
            setStatus('Lỗi: API_KEY không được định cấu hình.');
            console.error("API_KEY environment variable not set.");
            return;
        }
        aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });

        return () => {
            localStreamRef.current?.getTracks().forEach(track => track.stop());
            processorRef.current?.disconnect();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(e => console.error("Error closing audio context on unmount", e));
            }
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => session.close()).catch(e => console.error("Error closing session on unmount", e));
            }
        };
    }, []);

    const stopRecording = useCallback(async () => {
        if (!isRecording) return;
        
        setIsRecording(false);
        setStatus('Đang dừng...');

        try {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
            }
            if (processorRef.current) {
                processorRef.current.disconnect();
                processorRef.current = null;
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                await audioContextRef.current.close();
                audioContextRef.current = null;
            }
            if (sessionPromiseRef.current) {
                const session = await sessionPromiseRef.current;
                session.close();
                sessionPromiseRef.current = null;
            }
        } catch (error) {
            console.error('Lỗi khi dừng ghi âm:', error);
            setStatus('Lỗi khi dừng');
        } finally {
            setStatus('Đã dừng. Bấm nút để ghi âm lại.');
            currentTranscriptRef.current = '';
        }
    }, [isRecording]);

    const startRecording = useCallback(async () => {
        if (isRecording || !aiRef.current) return;
        
        setIsRecording(true);
        setTranscript('');
        currentTranscriptRef.current = '';
        setStatus('Đang khởi tạo...');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = audioContextRef.current.createMediaStreamSource(stream);
            
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            source.connect(processor);
            processor.connect(audioContextRef.current.destination);

            setStatus('Đang kết nối tới AI...');
            
            sessionPromiseRef.current = aiRef.current.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        setStatus('Đang nghe... Hãy nói gì đó.');
                        processor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createPcmBlob(inputData);
                            
                            if (sessionPromiseRef.current) {
                                sessionPromiseRef.current.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                    },
                    onmessage: (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const { text } = message.serverContent.inputTranscription;
                            currentTranscriptRef.current += text;
                            setTranscript(currentTranscriptRef.current);
                        }
                        if (message.serverContent?.turnComplete) {
                            currentTranscriptRef.current += '\n';
                            setTranscript(currentTranscriptRef.current);
                        }
                    },
                    onclose: () => {
                       if(isRecording) stopRecording();
                    },
                    // FIX: Changed onerror callback parameter type from Error to ErrorEvent.
                    onerror: (e: ErrorEvent) => {
                        console.error('Lỗi kết nối:', e);
                        setStatus('Lỗi kết nối. Vui lòng thử lại.');
                        if(isRecording) stopRecording();
                    },
                },
            });

        } catch (error) {
            console.error('Không thể bắt đầu ghi âm:', error);
            setStatus('Lỗi: Không thể truy cập microphone.');
            setIsRecording(false);
        }
    }, [isRecording, stopRecording]);

    const handleCopy = () => {
        if (transcript) {
            navigator.clipboard.writeText(transcript.trim());
            setCopyStatus('Đã sao chép!');
            setTimeout(() => setCopyStatus(''), 2000);
        }
    };
    
    const handleClear = () => {
        setTranscript('');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 border border-gray-700">
                <header className="text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-cyan-400">Trình Ghi Âm AI</h1>
                    <p className="text-gray-400 mt-2">Ghi âm và chuyển đổi giọng nói thành văn bản trong thời gian thực.</p>
                </header>
                
                <div className="flex flex-col items-center justify-center space-y-4">
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50
                        ${isRecording 
                            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                            : 'bg-cyan-500 hover:bg-cyan-600 focus:ring-cyan-400'}`}
                        aria-label={isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
                    >
                        {isRecording ? <StopIcon className="w-10 h-10 text-white" /> : <MicIcon className="w-10 h-10 text-white" />}
                        {isRecording && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>}
                    </button>
                    <p className="text-gray-400 h-6 transition-opacity duration-300">{status}</p>
                </div>

                <div className="bg-gray-900 rounded-lg p-4 min-h-[200px] border border-gray-700 relative group">
                    <pre className="whitespace-pre-wrap break-words text-gray-300 font-sans h-full max-h-96 overflow-y-auto">
                        {transcript || <span className="text-gray-500">Bản ghi sẽ xuất hiện ở đây...</span>}
                    </pre>
                    {transcript && (
                         <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={handleCopy} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500" title="Sao chép">
                                {copyStatus ? <span className="text-xs px-2 text-cyan-400">{copyStatus}</span> : <CopyIcon className="w-5 h-5" />}
                            </button>
                            <button onClick={handleClear} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500" title="Xóa">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <footer className="text-center mt-8 text-gray-500 text-sm">
                <p>Powered by Duongdd</p>
            </footer>
        </div>
    );
};

export default App;