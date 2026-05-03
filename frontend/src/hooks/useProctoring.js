import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * useProctoring hook to monitor tab switching, window focus, and fullscreen status.
 * 
 * @param {string} sessionId - Current interview session ID
 * @param {object} channel - Stream chat/event channel to broadcast violations
 * @param {boolean} enabled - Whether proctoring is active (usually only for candidates)
 */
export function useProctoring(sessionId, channel, enabled = false) {
  const violationsRef = useRef([]);
  const isFullScreenRef = useRef(false);

  const logViolation = (type, details = {}) => {
    const violation = {
      type,
      timestamp: new Date().toISOString(),
      details,
    };
    violationsRef.current.push(violation);
    console.warn(`[Proctoring] Violation: ${type}`, details);

    // Broadcast to interviewer via Stream channel
    if (channel) {
      channel.sendEvent({
        type: 'proctoring-violation',
        data: violation,
      });
    }

    // Show warning to candidate
    if (type === 'tab-switch') {
      toast.error('Warning: Tab switching is strictly prohibited during the interview.', {
        duration: 5000,
        position: 'top-center',
      });
    } else if (type === 'focus-lost') {
        toast.error('Warning: Please keep focus on the interview window.', {
            duration: 4000,
            position: 'top-center',
        });
    }
  };

  useEffect(() => {
    if (!enabled) return;
    console.log('[Proctoring] System Initialized & Active');

    // 1. Detect Tab Switching (Visibility API)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logViolation('tab-switch', { state: 'hidden' });
      }
    };

    // 2. Detect Window Focus Loss (Blur)
    const handleBlur = () => {
      logViolation('focus-lost', { context: 'window-blur' });
    };

    // 3. Detect Fullscreen Exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullScreenRef.current) {
        logViolation('fullscreen-exit', { context: 'manual-exit' });
        isFullScreenRef.current = false;
      } else if (document.fullscreenElement) {
        isFullScreenRef.current = true;
      }
    };

    // 4. Disable Right-Click (Context Menu)
    const handleContextMenu = (e) => {
        e.preventDefault();
        logViolation('context-menu-attempt', { context: 'right-click' });
        toast.error('Right-click is disabled during the interview.', { id: 'ctx-menu' });
    };

    // 5. Disable Copy/Paste
    const handleCopy = (e) => {
        e.preventDefault();
        logViolation('copy-attempt', { context: 'clipboard-copy' });
        toast.error('Copying is disabled during the interview.', { id: 'copy-attempt' });
    };

    // 6. Preemptive Warning (Mouse leaving from the top)
    const handleMouseLeave = (e) => {
        if (e.clientY <= 0) {
            logViolation('tab-switch-attempt', { context: 'mouse-at-tabs' });
            toast('⚠️ Warning: Stay on this page! Tab switching is recorded.', {
                id: 'preemptive-warning',
                icon: '👀',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                },
            });
        }
    };

    // 7. Prevent Tab Close / Refresh
    const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = ''; // Triggers the standard browser confirmation dialog
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, channel]);

  const enterFullScreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
  };

  return { 
    getViolations: () => violationsRef.current,
    enterFullScreen 
  };
}
