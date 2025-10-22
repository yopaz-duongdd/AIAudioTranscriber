import { GoogleGenAI, Modality } from '@google/genai';
import { createPcmBlob } from './utils/audio.js';

const { createApp, ref, onMounted, onUnmounted } = Vue;

createApp({
    setup() {
        const isRecording = ref(false);
        const transcript = ref('');
        const status = ref('Bấm nút để bắt đầu ghi âm');
        const copyStatus = ref('');

        let ai = null;
        let sessionPromise = null;
        let audioContext = null;
        let processor = null;
        let localStream = null;
        let currentTranscript = '';

        const stopRecording = async () => {
            if (!isRecording.value) return;
            
            isRecording.value = false;
            status.value = 'Đang dừng...';

            try {
                if (localStream) {
                    localStream.getTracks().forEach(track => track.stop());
                    localStream = null;
                }
                if (processor) {
                    processor.disconnect();
                    processor = null;
                }
                if (audioContext && audioContext.state !== 'closed') {
                    await audioContext.close();
                    audioContext = null;
                }
                if (sessionPromise) {
                    const session = await sessionPromise;
                    session.close();
                    sessionPromise = null;
                }
            } catch (error) {
                console.error('Lỗi khi dừng ghi âm:', error);
                status.value = 'Lỗi khi dừng';
            } finally {
                status.value = 'Đã dừng. Bấm nút để ghi âm lại.';
                currentTranscript = '';
            }
        };

        const startRecording = async () => {
            if (isRecording.value || !ai) return;
            
            isRecording.value = true;
            transcript.value = '';
            currentTranscript = '';
            status.value = 'Đang khởi tạo...';

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                localStream = stream;

                audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                const source = audioContext.createMediaStreamSource(stream);
                
                processor = audioContext.createScriptProcessor(4096, 1, 1);
                
                source.connect(processor);
                processor.connect(audioContext.destination);

                status.value = 'Đang kết nối tới AI...';
                
                sessionPromise = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    config: {
                        responseModalities: [Modality.AUDIO],
                        inputAudioTranscription: {},
                    },
                    callbacks: {
                        onopen: () => {
                            status.value = 'Đang nghe... Hãy nói gì đó.';
                            processor.onaudioprocess = (audioProcessingEvent) => {
                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                const pcmBlob = createPcmBlob(inputData);
                                
                                if (sessionPromise) {
                                    sessionPromise.then((session) => {
                                        session.sendRealtimeInput({ media: pcmBlob });
                                    });
                                }
                            };
                        },
                        onmessage: (message) => {
                            if (message.serverContent?.inputTranscription) {
                                const { text } = message.serverContent.inputTranscription;
                                currentTranscript += text;
                                transcript.value = currentTranscript;
                            }
                            if (message.serverContent?.turnComplete) {
                                currentTranscript += '\n';
                                transcript.value = currentTranscript;
                            }
                        },
                        onclose: () => {
                           if(isRecording.value) stopRecording();
                        },
                        onerror: (e) => {
                            console.error('Lỗi kết nối:', e);
                            status.value = 'Lỗi kết nối. Vui lòng thử lại.';
                            if(isRecording.value) stopRecording();
                        },
                    },
                });

            } catch (error) {
                console.error('Không thể bắt đầu ghi âm:', error);
                status.value = 'Lỗi: Không thể truy cập microphone.';
                isRecording.value = false;
            }
        };

        const toggleRecording = () => {
            if (isRecording.value) {
                stopRecording();
            } else {
                startRecording();
            }
        };
        
        const handleCopy = () => {
            if (transcript.value) {
                navigator.clipboard.writeText(transcript.value.trim());
                copyStatus.value = 'Đã sao chép!';
                setTimeout(() => copyStatus.value = '', 2000);
            }
        };
        
        const handleClear = () => {
            transcript.value = '';
        };

        onMounted(() => {
            if (!process.env.API_KEY) {
                status.value = 'Lỗi: API_KEY không được định cấu hình.';
                console.error("API_KEY environment variable not set.");
                return;
            }
            ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        });

        onUnmounted(() => {
            stopRecording();
        });

        return {
            isRecording,
            transcript,
            status,
            copyStatus,
            toggleRecording,
            handleCopy,
            handleClear,
        };
    }
}).mount('#app');
