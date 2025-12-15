import { useState, useRef, useEffect } from 'react';
import { Check, Mic, AlertCircle } from 'lucide-react';

export default function AudioRecorderDebug() {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [title, setTitle] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [debugInfo, setDebugInfo] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const startTimeRef = useRef(0);

  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  // Load available audio devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        addDebugLog('🔍 Checking for audio devices...');
        
        // Request permission first
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
        addDebugLog('✅ Microphone permission granted');
        
        // Get the actual settings being used
        const track = stream.getAudioTracks()[0];
        const settings = track.getSettings();
        addDebugLog(`📊 Current mic settings: ${JSON.stringify(settings)}`);
        
        // Stop the test stream
        stream.getTracks().forEach(t => t.stop());
        
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = deviceList.filter(device => device.kind === 'audioinput');
        setDevices(audioInputs);
        
        if (audioInputs.length > 0) {
          setSelectedDevice(audioInputs[0].deviceId);
          addDebugLog(`✅ Found ${audioInputs.length} audio input device(s)`);
          audioInputs.forEach((device, i) => {
            addDebugLog(`  Device ${i}: ${device.label || 'Unnamed device'} (${device.deviceId.substring(0, 12)}...)`);
          });
        } else {
          addDebugLog('❌ No audio input devices found!');
        }
      } catch (error) {
        addDebugLog(`❌ Error loading devices: ${error.name} - ${error.message}`);
        setHasPermission(false);
      }
    };
    
    loadDevices();
  }, []);

  useEffect(() => {
    let interval = null;
    if (recording) {
      startTimeRef.current = performance.now();
      interval = window.setInterval(() => {
        setElapsedMs(performance.now() - startTimeRef.current);
      }, 35);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recording]);

  // Monitor audio levels using BOTH time domain and frequency data
  useEffect(() => {
    const checkAudioLevel = () => {
      if (analyserRef.current && recording) {
        // Try frequency data first
        const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(freqData);
        const freqAverage = freqData.reduce((a, b) => a + b, 0) / freqData.length;
        
        // Also try time domain data
        const timeData = new Uint8Array(analyserRef.current.fftSize);
        analyserRef.current.getByteTimeDomainData(timeData);
        
        // Calculate RMS (Root Mean Square) for time domain
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          const normalized = (timeData[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / timeData.length);
        const timeAverage = rms * 100;
        
        // Use whichever gives us a better signal
        const level = Math.max(freqAverage, timeAverage);
        setAudioLevel(Math.round(level));
        
        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      }
    };

    if (recording && analyserRef.current) {
      checkAudioLevel();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      addDebugLog('🎤 Starting recording process...');

      // More permissive constraints
      const constraints = {
        audio: selectedDevice ? {
          deviceId: { exact: selectedDevice },
          echoCancellation: false,  // Disable processing that might cause issues
          noiseSuppression: false,
          autoGainControl: false,
        } : {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      };

      addDebugLog(`Using device: ${selectedDevice || 'default'}`);

      streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
      addDebugLog('✅ Media stream obtained');

      // Check track status
      const audioTracks = streamRef.current.getAudioTracks();
      addDebugLog(`📊 Audio tracks: ${audioTracks.length}`);
      
      audioTracks.forEach((track, i) => {
        const settings = track.getSettings();
        const constraints = track.getConstraints();
        addDebugLog(`  Track ${i}: ${track.label}`);
        addDebugLog(`    - enabled: ${track.enabled}, muted: ${track.muted}, readyState: ${track.readyState}`);
        addDebugLog(`    - settings: sampleRate=${settings.sampleRate}, channelCount=${settings.channelCount}`);
        
        // Check if track is actually getting audio
        track.onmute = () => addDebugLog('⚠️ Track was MUTED');
        track.onunmute = () => addDebugLog('✅ Track was UNMUTED');
        track.onended = () => addDebugLog('⚠️ Track ENDED');
      });

      // Setup audio context with explicit settings
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      addDebugLog(`🔊 AudioContext state: ${audioContextRef.current.state}`);
      
      // Resume if suspended (common on mobile/some browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        addDebugLog('▶️ AudioContext resumed');
      }

      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      analyserRef.current = audioContextRef.current.createAnalyser();
      

      // Test if we're getting any audio data at all
      setTimeout(() => {
        if (analyserRef.current) {
          const testData = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(testData);
          const testAvg = testData.reduce((a, b) => a + b, 0) / testData.length;
          addDebugLog(`🔍 Initial audio test: ${testAvg.toFixed(2)} (should be > 0 when speaking)`);
        }
      }, 1000);

      // Determine best MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];

      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          addDebugLog(`✅ Using MIME type: ${type}`);
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported audio format found');
      }

      const destination = audioContextRef.current.createMediaStreamDestination();

      source.connect(analyserRef.current);
      source.connect(destination);
      addDebugLog(`🔊 Audio analyzer connected (fftSize: ${analyserRef.current.fftSize})`);
      
      recorderRef.current = new MediaRecorder(destination.stream, {
        mimeType: selectedMimeType,
      });

      addDebugLog(`🎙️ MediaRecorder created (state: ${recorderRef.current.state})`);

      // Event handlers
      recorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          addDebugLog(`📦 Chunk ${chunksRef.current.length}: ${event.data.size} bytes`);
        } else {
          addDebugLog('⚠️ Empty chunk received');
        }
      };

      recorderRef.current.onstop = () => {
        addDebugLog('🛑 Recording stopped');
        saveAudioRecord();
      };

      recorderRef.current.onerror = (event) => {
        addDebugLog(`❌ MediaRecorder error: ${event.error?.name || 'Unknown'}`);
      };

      recorderRef.current.onstart = () => {
        addDebugLog('▶️ MediaRecorder started');
      };

      // Start with timeslice
      recorderRef.current.start(1000);
      
      setRecording(true);
      setElapsedMs(0);
      addDebugLog('⏺️ Recording initiated - speak now to test!');

    } catch (error) {
      addDebugLog(`❌ Fatal error: ${error.name} - ${error.message}`);
      console.error('Recording error:', error);
      alert(`Recording failed: ${error.message}`);
    }
  };

  const stopRecording = () => {
    addDebugLog('🛑 Stopping recording...');

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        addDebugLog(`🔇 Stopped: ${track.label}`);
      });
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      addDebugLog('🔇 AudioContext closed');
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setRecording(false);
    setAudioLevel(0);
  };

  const saveAudioRecord = () => {
    addDebugLog(`💾 Processing ${chunksRef.current.length} chunks...`);

    if (chunksRef.current.length === 0) {
      addDebugLog('❌ CRITICAL: No chunks collected!');
      addDebugLog('❌ This means MediaRecorder never fired ondataavailable');
      alert('No audio data recorded. The MediaRecorder did not capture any data.');
      return;
    }

    const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
    addDebugLog(`📊 Total size: ${totalSize} bytes from ${chunksRef.current.length} chunks`);

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    addDebugLog(`📦 Blob: ${blob.size} bytes, type: ${blob.type}`);

    if (blob.size === 0) {
      addDebugLog('❌ CRITICAL: Blob is empty!');
      alert('Recording failed - blob is empty');
      return;
    }

    // Test playback
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onloadedmetadata = () => {
      addDebugLog(`✅ Audio metadata loaded: duration=${audio.duration.toFixed(2)}s`);
      if (audio.duration === 0 || isNaN(audio.duration)) {
        addDebugLog('⚠️ WARNING: Duration is 0 or invalid - file may be silent');
      }
    };

    audio.onerror = () => {
      addDebugLog(`❌ Audio error: ${audio.error?.message || 'Cannot play audio'}`);
    };

    // Download
    downloadRecording(blob, title || 'test-recording');
    addDebugLog('⬇️ Download started');
  };

  const downloadRecording = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Audio Recorder Debugger
          </h1>
          <p className="text-gray-600 mb-6">
            Advanced diagnostic tool for microphone recording issues
          </p>

          {/* Permission Warning */}
          {!hasPermission && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Microphone permission required.</strong> Please allow access when prompted.
              </div>
            </div>
          )}

          {/* Title Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recording Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Microphone Test"
              disabled={recording}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Microphone Selection */}
          {devices.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Microphone
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                disabled={recording}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Try each microphone to find one that works
              </p>
            </div>
          )}

          {/* Recording Controls */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 text-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <Mic className={`w-8 h-8 ${recording ? 'animate-pulse' : ''}`} />
                  <div>
                    <div className="text-2xl font-mono font-bold">{formatTime(elapsedMs)}</div>
                    <div className="text-sm opacity-90">
                      {recording ? 'Recording - speak loudly!' : 'Ready to record'}
                    </div>
                  </div>
                </div>
                
                {recording && (
                  <div className="md:text-right">
                    <div className="text-xs opacity-90 mb-1">
                      Audio Level {audioLevel === 0 && '(NOT WORKING - See debug log!)'}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-full md:w-32 h-3 bg-white/30 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-100 ${
                            audioLevel > 0 ? 'bg-green-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono font-bold">{audioLevel}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {!recording ? (
                  <button
                    onClick={startRecording}
                    disabled={!title.trim()}
                    className="flex-1 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Mic className="w-5 h-5" />
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex-1 bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Stop & Save
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Debug Log */}
          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">Detailed Debug Log</h3>
              <button
                onClick={() => setDebugInfo([])}
                className="text-xs text-gray-400 hover:text-white transition px-2 py-1 rounded hover:bg-gray-800"
              >
                Clear
              </button>
            </div>
            <div className="space-y-0.5">
              {debugInfo.length === 0 ? (
                <p className="text-gray-500 text-xs">
                  Waiting for debug information... Start recording to see detailed logs.
                </p>
              ) : (
                debugInfo.map((log, i) => (
                  <div 
                    key={i} 
                    className={`text-xs font-mono ${
                      log.includes('❌') || log.includes('CRITICAL') 
                        ? 'text-red-400 font-bold' 
                        : log.includes('⚠️')
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Diagnosis */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">What to Check:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>If Audio Level = 0:</strong> Your microphone is not sending data. Check system settings, try a different mic, or test in another browser.</li>
              <li><strong>If no "Data chunk received":</strong> MediaRecorder isn't capturing. This is a browser/codec issue.</li>
              <li><strong>If Audio Level moves but file is silent:</strong> Recording works but playback doesn't - try different browser.</li>
              <li><strong>System Tests:</strong> Open Sound Settings and verify input levels move when you speak.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}