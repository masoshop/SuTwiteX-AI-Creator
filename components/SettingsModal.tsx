import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: { gemini: string; openrouter: string; deepseek: string }) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(localStorage.getItem('gemini_api_key') || '');
      setOpenrouterKey(localStorage.getItem('openrouter_api_key') || '');
      setDeepseekKey(localStorage.getItem('deepseek_api_key') || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    onSave({
      gemini: geminiKey,
      openrouter: openrouterKey,
      deepseek: deepseekKey,
    });
    setSaveStatus('saved');
    setTimeout(() => {
        setSaveStatus('idle');
        onClose();
    }, 1500);
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-bg-secondary border border-border-primary rounded-xl p-6 w-full max-w-lg relative shadow-2xl shadow-black/50">
        <h2 className="text-2xl font-bold mb-2 text-text-primary">Ajustes de API</h2>
        <p className="text-sm text-text-secondary mb-6">
          Introduce tus claves API para activar los motores de IA. Las claves se guardan de forma segura en el almacenamiento local de tu navegador.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-text-primary mb-2 block">
              Gemini API Key (<span className="text-accent-primary font-bold">Requerido</span>)
            </label>
            <input type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="Introduce tu clave de Gemini" className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:outline-none transition" />
          </div>
           <div>
            <label className="text-sm font-semibold text-text-primary mb-2 block">
              OpenRouter API Key (<span className="text-text-secondary">Opcional</span>)
            </label>
            <input type="password" value={openrouterKey} onChange={(e) => setOpenrouterKey(e.target.value)} placeholder="Introduce tu clave de OpenRouter.ai" className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-purple-400 focus:outline-none transition" />
          </div>
           <div>
            <label className="text-sm font-semibold text-text-primary mb-2 block">
              DeepSeek API Key (<span className="text-text-secondary">Opcional, vía OpenRouter</span>)
            </label>
            <input type="password" value={deepseekKey} onChange={(e) => setDeepseekKey(e.target.value)} placeholder="Introduce tu clave (puede ser la misma de OpenRouter)" className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-green-400 focus:outline-none transition" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="ai-button bg-bg-primary hover:bg-border-primary/50 text-text-primary px-6">Cancelar</button>
          <button onClick={handleSave} className="ai-button bg-accent-primary hover:opacity-90 text-black px-6">
            {saveStatus === 'saved' ? '¡Guardado!' : 'Guardar Claves'}
          </button>
        </div>
      </div>
       <style>{`
            .ai-button { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; border-radius: 9999px; font-weight: bold; transition: all 0.2s; text-align: center; white-space: nowrap; }
            .ai-button:hover:not(:disabled) { opacity: 0.9; }
            .ai-button:disabled { opacity: 0.5; cursor: not-allowed; }
            .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
            @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default SettingsModal;