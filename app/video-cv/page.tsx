'use client';

import { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';

export default function VideoCVPage() {
  const [videoMode, setVideoMode] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [script, setScript] = useState('');
  const [showPrompter, setShowPrompter] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (videoMode) {
      initCamera();
    }
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [videoMode]);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      alert('Errore nell\'accesso alla camera. Assicurati di aver concesso i permessi.');
    }
  };

  const selectVideoMode = (mode: string) => {
    setVideoMode(mode);
    setRecordedVideo(null);
  };

  const startRecording = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideo(url);
        setIsRecording(false);
        setShowPrompter(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setShowPrompter(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const reRecord = () => {
    setRecordedVideo(null);
    chunksRef.current = [];
    alert('🎬 Pronto per una nuova registrazione!');
  };

  const publishVideo = () => {
    if (recordedVideo) {
      alert('✅ Video CV pubblicato con successo!');
    } else {
      alert('⚠️ Registra prima un video!');
    }
  };

  return (
    <>
      <Header />
      <div className="main-container" style={{ display: 'block' }}>
        <div className="card">
          <h2>🎥 Crea il Tuo Video CV</h2>
          
          {!videoMode ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
              <div className="video-mode-card featured" onClick={() => selectVideoMode('professional')}>
                <h3>🎯 Professionale</h3>
                <p>Presentazione formale per aziende corporate</p>
                <span>Consigliato</span>
              </div>
              <div className="video-mode-card" onClick={() => selectVideoMode('creative')}>
                <h3>✨ Creativo</h3>
                <p>Stile dinamico per settori creativi</p>
                <span>Creativo</span>
              </div>
              <div className="video-mode-card" onClick={() => selectVideoMode('casual')}>
                <h3>👋 Informale</h3>
                <p>Tono amichevole e accessibile</p>
                <span>Informale</span>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative', background: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
                {showPrompter && (
                  <div id="prompter-display" className={showPrompter ? 'active' : ''}>
                    <div id="prompter-text">{script || 'Inizia a parlare...'}</div>
                  </div>
                )}
                {recordedVideo ? (
                  <video
                    src={recordedVideo}
                    controls
                    style={{ width: '100%', maxHeight: '500px' }}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    style={{ width: '100%', maxHeight: '500px' }}
                  />
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label>Script Prompter (opzionale)</label>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Inserisci il testo che vuoi visualizzare durante la registrazione..."
                  rows={4}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {!recordedVideo ? (
                  <>
                    {!isRecording ? (
                      <button className="btn-submit" onClick={startRecording}>
                        <i className="fas fa-video"></i> Inizia Registrazione
                      </button>
                    ) : (
                      <button className="btn-submit" onClick={stopRecording} style={{ background: '#ff0000' }}>
                        <i className="fas fa-stop"></i> Ferma Registrazione
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button className="btn-submit" onClick={publishVideo}>
                      <i className="fas fa-check"></i> Pubblica Video CV
                    </button>
                    <button className="btn-submit" onClick={reRecord} style={{ background: '#333' }}>
                      <i className="fas fa-redo"></i> Registra di Nuovo
                    </button>
                  </>
                )}
                <button className="btn-submit" onClick={() => setVideoMode(null)} style={{ background: '#666' }}>
                  <i className="fas fa-arrow-left"></i> Torna Indietro
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

