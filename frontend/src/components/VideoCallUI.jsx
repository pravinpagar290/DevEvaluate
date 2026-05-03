import {
  CallControls,
  CallingState,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import {
  BrainCircuitIcon,
  EyeIcon,
  EyeOffIcon,
  HandIcon,
  Loader2Icon,
  MessageSquareIcon,
  SmileIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Channel, Chat, MessageInput, MessageList, Thread, Window } from "stream-chat-react";
import { useAdaptiveAnalytics } from "../hooks/useAdaptiveAnalytics.js";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "stream-chat-react/dist/css/v2/index.css";

// ─── Emotion → emoji mapping ───────────────────────────────────────────────────
const EMOTION_EMOJI = {
  happy: "😊",
  neutral: "😐",
  sad: "😔",
  angry: "😠",
  fearful: "😨",
  disgusted: "😒",
  surprised: "😲",
  uncertain: "🤔",
};

// ─── Hand velocity → label ─────────────────────────────────────────────────────
function getMovementLabel(v) {
  if (v < 1) return { label: "Still", color: "text-base-content/50" };
  if (v < 3) return { label: "Calm", color: "text-success" };
  if (v < 6) return { label: "Moderate", color: "text-warning" };
  return { label: "Fidgety", color: "text-error" };
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * @param {{ chatClient, channel, sessionId: string, isParticipant: boolean }} props
 * sessionId    – MongoDB session _id, needed for batch analytics uploads
 * isParticipant – only analyse the candidate (interviewee), not the interviewer
 */
function VideoCallUI({ chatClient, channel, sessionId, isParticipant }) {
  const navigate = useNavigate();
  const { useCallCallingState, useParticipantCount, useLocalParticipant } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participantCount = useParticipantCount();
  const localParticipant = useLocalParticipant();

  const call = useCall();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [hostMetrics, setHostMetrics] = useState(null); // Used by the host to view candidate's live data

  // ── Hidden video element: mirrors the local webcam stream for AI processing
  // The visible video is handled by SpeakerLayout; this one is invisible to the user.
  const hiddenVideoRef = useRef(null);

  useEffect(() => {
    const video = hiddenVideoRef.current;
    const stream = localParticipant?.videoStream;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.play().catch(() => {}); // Autoplay might be blocked; harmless if so
  }, [localParticipant?.videoStream]);

  // ── AI analytics hook ──────────────────────────────────────────────────────
  // Only run analytics when the user is the interviewee (candidate).
  const { metrics, isReady: analyticsReady } = useAdaptiveAnalytics(
    hiddenVideoRef.current,
    sessionId,
    { enabled: isParticipant, enableHands: true }
  );

  // ── Custom Events: Stream Live Metrics to Host ─────────────────────────────
  
  // 1. Participant (Candidate) sends metrics to the call channel every 1 second
  const lastSendTime = useRef(0);
  useEffect(() => {
    if (!isParticipant || !call || !metrics.emotion) return;
    
    const now = Date.now();
    if (now - lastSendTime.current >= 1000) {
      call.sendCustomEvent({
        type: 'ai_metrics_update',
        payload: metrics,
      }).catch(() => null);
      lastSendTime.current = now;
    }
  }, [metrics, isParticipant, call]);

  // 2. Host (Interviewer) listens for metrics from the participant
  useEffect(() => {
    if (isParticipant || !call) return;
    
    console.log('[Host] 🟢 Listening for live AI metrics from candidate...');

    const unsubscribe = call.on('custom', (event) => {
      const data = event.custom || event;
      if (data.type === 'ai_metrics_update' && data.payload) {
        // console.log('[Host] 📩 Received AI metrics:', data.payload);
        setHostMetrics(data.payload);
      }
    });

    return () => unsubscribe();
  }, [isParticipant, call]);

  // Determine what to display based on role
  const displayMetrics = isParticipant ? null : hostMetrics;

  // ── Render guards ──────────────────────────────────────────────────────────
  if (callingState === CallingState.JOINING) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2Icon className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
          <p className="text-lg">Joining call...</p>
        </div>
      </div>
    );
  }

  const movementInfo = displayMetrics ? getMovementLabel(displayMetrics.handVelocity) : null;

  return (
    <div className="h-full flex gap-3 relative str-video">

      {/* ── Hidden video for AI (Must be in DOM and 'visible' for browser to render frames) ── */}
      <video
        ref={hiddenVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute opacity-0 pointer-events-none"
        style={{ width: "1px", height: "1px" }}
        aria-hidden="true"
      />

      <div className="flex-1 flex flex-col gap-3">

        {/* ── Top bar: participants + analytics toggle + chat toggle ── */}
        <div className="flex items-center justify-between gap-2 bg-base-100 p-3 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" />
            <span className="font-semibold">
              {participantCount} {participantCount === 1 ? "participant" : "participants"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Analytics toggle — ONLY VISIBLE TO THE HOST NOW */}
            {!isParticipant && (
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`btn btn-sm gap-2 ${showAnalytics ? "btn-secondary" : "btn-ghost"}`}
                title={showAnalytics ? "Hide AI metrics" : "Show AI metrics"}
              >
                <BrainCircuitIcon className="size-4" />
                Live Candidate Analysis
              </button>
            )}

            {chatClient && channel && (
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`btn btn-sm gap-2 ${isChatOpen ? "btn-primary" : "btn-ghost"}`}
                title={isChatOpen ? "Hide chat" : "Show chat"}
              >
                <MessageSquareIcon className="size-4" />
                Chat
              </button>
            )}
          </div>
        </div>

        {/* ── Live AI Metrics Panel (HOST ONLY) ── */}
        {!isParticipant && showAnalytics && (
          <div className="bg-base-100 rounded-lg shadow px-4 py-3 border border-base-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider">
                Live AI Analysis
              </span>
              {!displayMetrics && (
                <span className="flex items-center gap-1 text-xs text-warning">
                  <Loader2Icon className="w-3 h-3 animate-spin" />
                  Waiting for candidate...
                </span>
              )}
              {displayMetrics && (
                <span className="text-xs text-success font-medium">● Live</span>
              )}
            </div>

            {displayMetrics && (
              <div className="grid grid-cols-3 gap-3">

                {/* Emotion */}
                <div className="flex flex-col items-center gap-1 bg-base-200 rounded-lg p-2">
                  <SmileIcon className="w-4 h-4 text-base-content/50" />
                  <span className="text-xs text-base-content/50">Emotion</span>
                  <span className="text-lg leading-none">
                    {displayMetrics.emotion ? EMOTION_EMOJI[displayMetrics.emotion] ?? "🤔" : "—"}
                  </span>
                  <span className="text-xs font-medium capitalize">
                    {displayMetrics.emotion ?? "—"}
                  </span>
                  {displayMetrics.emotionConfidence > 0 && (
                    <span className="text-[10px] text-base-content/40">
                      {Math.round(displayMetrics.emotionConfidence * 100)}% conf
                    </span>
                  )}
                </div>

                {/* Eye Contact */}
                <div className="flex flex-col items-center gap-1 bg-base-200 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    {/* Live animated eyeball */}
                    <div className="relative w-8 h-4 bg-white rounded-[100%] border border-gray-400 overflow-hidden shadow-inner">
                      <div 
                        className="absolute w-2.5 h-2.5 bg-black rounded-full transition-all duration-75"
                        style={{
                          left: `${displayMetrics.gazeX * 100}%`,
                          top: `${displayMetrics.gazeY * 100}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-base-content/50 mt-1">Eye Contact</span>
                  <span className={`text-sm font-bold ${displayMetrics.eyeContact ? "text-success" : "text-error"}`}>
                    {displayMetrics.eyeContact ? "Yes" : "No"}
                  </span>
                  {displayMetrics.gazeConfidence > 0 && (
                    <span className="text-[10px] text-base-content/40">
                      X: {Math.round(displayMetrics.gazeX * 100)}% | Y: {Math.round(displayMetrics.gazeY * 100)}%
                    </span>
                  )}
                </div>

                {/* Hand Movement */}
                <div className="flex flex-col items-center gap-1 bg-base-200 rounded-lg p-2">
                  <HandIcon className="w-4 h-4 text-base-content/50" />
                  <span className="text-xs text-base-content/50">Movement</span>
                  <span className={`text-sm font-bold ${movementInfo.color}`}>
                    {movementInfo.label}
                  </span>
                  <span className="text-[10px] text-base-content/40">
                    {displayMetrics.handVelocity}/10
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Video area ── */}
        <div className="flex-1 bg-base-300 rounded-lg overflow-hidden relative">
          <SpeakerLayout />
        </div>

        {/* ── Call controls ── */}
        <div className="bg-base-100 p-3 rounded-lg shadow flex justify-center">
          <CallControls onLeave={() => navigate("/dashboard")} />
        </div>
      </div>

      {/* ── Chat panel ── */}
      {chatClient && channel && (
        <div
          className={`flex flex-col rounded-lg shadow overflow-hidden bg-[#272a30] transition-all duration-300 ease-in-out ${
            isChatOpen ? "w-80 opacity-100" : "w-0 opacity-0"
          }`}
        >
          {isChatOpen && (
            <>
              <div className="bg-[#1c1e22] p-3 border-b border-[#3a3d44] flex items-center justify-between">
                <h3 className="font-semibold text-white">Session Chat</h3>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Close chat"
                >
                  <XIcon className="size-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden stream-chat-dark">
                <Chat client={chatClient} theme="str-chat__theme-dark">
                  <Channel channel={channel}>
                    <Window>
                      <MessageList />
                      <MessageInput />
                    </Window>
                    <Thread />
                  </Channel>
                </Chat>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default VideoCallUI;