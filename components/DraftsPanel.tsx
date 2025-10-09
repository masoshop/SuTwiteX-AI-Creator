
import React from 'react';
import type { Draft } from '../types';
import FolderIcon from './icons/FolderIcon';
import TrashIcon from './icons/TrashIcon';
import UploadIcon from './icons/UploadIcon';

interface DraftsPanelProps {
  drafts: Draft[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

const DraftsPanel: React.FC<DraftsPanelProps> = ({ drafts, onLoad, onDelete }) => {
  return (
    <div className="bg-bg-secondary p-6 rounded-xl border border-border-primary animate-fade-in">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <FolderIcon className="h-6 w-6 text-accent-secondary" />
        Borradores Guardados
      </h2>
      {drafts.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {drafts.map((draft) => (
            <div key={draft.id} className="bg-bg-primary p-3 rounded-lg border border-border-primary/50 flex items-center justify-between gap-3 animate-fade-in">
              <div className="overflow-hidden">
                <p className="font-semibold text-sm truncate text-text-primary">
                  {draft.tweets[0]?.content || draft.prompt || 'Borrador sin título'}
                </p>
                <p className="text-xs text-text-secondary">
                  Guardado el {new Date(draft.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button 
                  onClick={() => onLoad(draft.id)} 
                  className="action-button p-2"
                  title="Cargar Borrador"
                >
                  <UploadIcon className="h-4 w-4 rotate-180" />
                </button>
                <button 
                  onClick={() => onDelete(draft.id)} 
                  className="action-button p-2 !bg-red-900/70 hover:!bg-red-800/70"
                  title="Eliminar Borrador"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-text-secondary">No tienes borradores guardados.</p>
        </div>
      )}
    </div>
  );
};

export default DraftsPanel;