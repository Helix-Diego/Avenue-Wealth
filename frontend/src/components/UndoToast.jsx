import React, { useState, useEffect } from 'react';
import { RotateCcw, X, CheckCircle2 } from 'lucide-react';

export default function UndoToast({
  message,
  count,
  duration = 8,
  onUndo,
  onClose
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isUndoing, setIsUndoing] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      onClose();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onClose]);

  const handleUndoClick = async () => {
    setIsUndoing(true);
    try {
      await onUndo();
    } finally {
      setIsUndoing(false);
    }
  };

  const percent = Math.max(0, (timeLeft / duration) * 100);

  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col shadow-2xl rounded-xl border border-neutral-700/60 bg-neutral-900/95 dark:bg-[#1c1c1c]/95 text-white backdrop-blur-md px-4 py-3 min-w-[340px] max-w-[500px] animate-in fade-in slide-in-from-bottom-5 duration-200 select-none"
      role="alert"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 truncate">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </span>
          <div className="truncate">
            <p className="text-xs font-semibold text-neutral-100 truncate">
              {message || 'Cambio masivo aplicado'}
            </p>
            {count && (
              <p className="text-[11px] text-neutral-400">
                {count} {count === 1 ? 'transacción afectada' : 'transacciones afectadas'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleUndoClick}
            disabled={isUndoing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Deshacer el último cambio masivo"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isUndoing ? 'animate-spin' : ''}`} />
            <span>{isUndoing ? 'Revirtiendo...' : `Deshacer (${timeLeft}s)`}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar Countdown */}
      <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden mt-2.5">
        <div 
          className="bg-indigo-500 h-full transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
