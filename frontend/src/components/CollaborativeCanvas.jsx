import React, { useState, useEffect } from 'react';
import { FileTextIcon } from 'lucide-react';

const CollaborativeNotepad = ({ channel, isHost }) => {
  const [text, setText] = useState('');

  useEffect(() => {
    if (channel) {
      const handleEvent = (event) => {
        if (event.type === 'notepad-update') {
          setText(event.data.text);
        }
      };
      channel.on(handleEvent);
      return () => channel.off(handleEvent);
    }
  }, [channel]);

  const handleChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    
    if (channel) {
      channel.sendEvent({
        type: 'notepad-update',
        data: { text: newText }
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-base-100 rounded-lg overflow-hidden border border-base-300 shadow-sm">
      {/* Simple Header */}
      <div className="px-4 py-2 bg-base-200 border-b border-base-300 flex items-center gap-2">
        <FileTextIcon className="size-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-base-content/60">
          Shared Notepad
        </span>
      </div>

      {/* Large Shared Text Area */}
      <textarea
        className="flex-1 p-6 bg-base-100 text-lg font-sans outline-none resize-none placeholder:text-base-content/20 leading-relaxed"
        placeholder={isHost ? "Type your question here..." : "Type your answer or notes here..."}
        value={text}
        onChange={handleChange}
      />

      {/* Small Hint */}
      <div className="px-4 py-1 bg-base-200 text-[10px] text-base-content/30 italic border-t border-base-300">
        Both you and the {isHost ? 'candidate' : 'interviewer'} see this text in real-time.
      </div>
    </div>
  );
};

export default CollaborativeNotepad;
