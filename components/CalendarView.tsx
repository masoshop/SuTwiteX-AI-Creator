import React, { useState, useEffect } from 'react';
import type { Draft } from '../types';
// FIX: Imported CreateMode enum to resolve type error in mock data.
import { CreateMode } from '../types';
import FolderIcon from './icons/FolderIcon';

const CalendarView: React.FC = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [scheduled, setScheduled] = useState<Record<string, Draft[]>>({});
  const [draggingDraftId, setDraggingDraftId] = useState<string | null>(null);

  useEffect(() => {
    const savedDrafts = localStorage.getItem('twixai-drafts');
    if (savedDrafts) {
      setDrafts(JSON.parse(savedDrafts));
    }
    // Add some mock data for visual appeal
    // FIX: Explicitly typed the mockScheduled object to ensure it conforms to Record<string, Draft[]>.
    const mockScheduled: Record<string, Draft[]> = {
      // FIX: Removed 'engine' property as it does not exist in the Draft type.
      '15': [{ id: 'mock-1', prompt: 'Weekly AI Roundup', tweets: [{id:'t1', content: '...', media: null, isLoadingMedia: false, isCopied: false}], createMode: CreateMode.Text, audience: '', createdAt: '' }],
      // FIX: Removed 'engine' property as it does not exist in the Draft type.
      '22': [{ id: 'mock-2', prompt: 'New feature launch announcement', tweets: [{id:'t2', content: '...', media: null, isLoadingMedia: false, isCopied: false}], createMode: CreateMode.Text, audience: '', createdAt: '' }],
    };
    setScheduled(mockScheduled);
  }, []);
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggingDraftId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, day: number) => {
    e.preventDefault();
    if (!draggingDraftId) return;

    const draftToSchedule = drafts.find(d => d.id === draggingDraftId);
    if (draftToSchedule) {
      setScheduled(prev => {
        const dayStr = String(day);
        const daySchedule = prev[dayStr] ? [...prev[dayStr], draftToSchedule] : [draftToSchedule];
        return { ...prev, [dayStr]: daySchedule };
      });
      // Optionally remove from drafts list
      setDrafts(prev => prev.filter(d => d.id !== draggingDraftId));
    }
    setDraggingDraftId(null);
  };
  
  const daysInMonth = 31; // Simple representation for a month
  const firstDayOffset = 4; // Start on Friday

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-accent-primary">Content Calendar</h1>
      <p className="text-text-secondary mb-8">Plan your content strategy. Drag drafts onto the calendar to schedule them.</p>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Calendar */}
        <div className="flex-grow bg-bg-secondary border border-border-primary rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-px text-center font-bold text-text-secondary border-b border-border-primary mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="py-2 text-xs sm:text-base">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`empty-${i}`} className="h-24 sm:h-32"></div>)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayScheduled = scheduled[String(day)] || [];
              return (
                <div 
                  key={day}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                  className="h-24 sm:h-32 bg-bg-primary rounded-md border border-border-primary/50 p-2 flex flex-col hover:border-accent-primary/50 transition-colors"
                >
                  <span className="font-bold text-sm">{day}</span>
                  <div className="flex-grow overflow-y-auto space-y-1 mt-1 text-left">
                    {dayScheduled.map(item => (
                       <div key={item.id} className="bg-accent-secondary/20 text-accent-secondary text-xs p-1.5 rounded-md truncate">
                         {item.prompt || item.tweets[0]?.content}
                       </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Drafts Panel */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-bg-secondary p-4 rounded-xl border border-border-primary shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FolderIcon className="h-6 w-6 text-accent-secondary" />
              Unscheduled Drafts
            </h2>
            <div className="space-y-2 max-h-96 lg:max-h-[70vh] overflow-y-auto pr-2">
              {drafts.map(draft => (
                <div 
                  key={draft.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, draft.id)}
                  className={`bg-bg-primary p-3 rounded-lg border border-border-primary/50 cursor-move ${draggingDraftId === draft.id ? 'opacity-50' : ''}`}
                >
                  <p className="font-semibold text-sm truncate text-text-primary">
                    {draft.tweets[0]?.content || draft.prompt || 'Untitled Draft'}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {new Date(draft.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {drafts.length === 0 && <p className="text-center text-text-secondary py-4">No unscheduled drafts.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CalendarView;