import React, { useState, useEffect } from 'react';
import type { BrandVoiceProfile } from '../types';

interface BrandVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: BrandVoiceProfile) => void;
}

const BrandVoiceModal: React.FC<BrandVoiceModalProps> = ({ isOpen, onClose, onSave }) => {
  const [profile, setProfile] = useState<BrandVoiceProfile>({
    toneAndStyle: '',
    targetAudience: '',
    keyTopics: '',
    topicsToAvoid: ''
  });

  useEffect(() => {
    if (isOpen) {
      const savedProfile = localStorage.getItem('twixai-brand-voice');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      } else {
        setProfile({
            toneAndStyle: '',
            targetAudience: '',
            keyTopics: '',
            topicsToAvoid: ''
        });
      }
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(profile);
    onClose();
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-bg-secondary border border-border-primary rounded-xl p-6 w-full max-w-2xl relative shadow-2xl shadow-black/50">
        <h2 className="text-2xl font-bold mb-4 text-text-primary">Define tu Voz de Marca</h2>
        <p className="text-sm text-text-secondary mb-6">
          Proporciona detalles sobre la personalidad de tu marca. La IA usará esto como una instrucción central para toda la generación de contenido futuro, asegurando la consistencia.
        </p>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <label className="text-sm font-semibold text-text-primary mb-2 block">Tono y Estilo</label>
            <textarea name="toneAndStyle" value={profile.toneAndStyle} onChange={handleChange} rows={3} placeholder="Ej: Ingenioso, profesional y ligeramente sarcástico. Usamos insights basados en datos pero los presentamos de una manera conversacional y fácil de entender." className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:outline-none transition" />
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-2 block">Público Objetivo</label>
            <textarea name="targetAudience" value={profile.targetAudience} onChange={handleChange} rows={2} placeholder="Ej: Fundadores de tecnología, gerentes de marketing en empresas B2B SaaS y desarrolladores independientes." className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:outline-none transition" />
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-2 block">Temas Clave</label>
            <textarea name="keyTopics" value={profile.keyTopics} onChange={handleChange} rows={2} placeholder="Ej: IA en marketing, growth hacking, desarrollo de productos, mejores prácticas de ingeniería de software." className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:outline-none transition" />
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-2 block">Temas a Evitar</label>
            <textarea name="topicsToAvoid" value={profile.topicsToAvoid} onChange={handleChange} rows={2} placeholder="Ej: Política, especulación con criptomonedas, consejos de negocios demasiado genéricos." className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:outline-none transition" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="ai-button bg-bg-primary hover:bg-border-primary/50 text-text-primary px-6">Cancelar</button>
          <button onClick={handleSave} className="ai-button bg-accent-primary hover:opacity-90 text-white px-6">Guardar Voz</button>
        </div>
      </div>
    </div>
  );
};

export default BrandVoiceModal;