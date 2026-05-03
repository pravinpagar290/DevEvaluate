import {
  CallControls,
  CallingState,
  SpeakerLayout,
  useCallStateHooks,
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

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);

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
    { enabled: isParticipant }
  );

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

  const movementInfo = getMovementLabel(metrics.handVelocity);

  return (
    <div className="h-full flex gap-3 relative str-video">

      {/* ── Hidden video for AI ── */}
      <video
        ref={hiddenVideoRef}
        autoPlay
        playsInline
        muted
        style={{ display: "none" }}
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
            {/* Analytics toggle — only visible to the participant */}
            {isParticipant && (
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`btn btn-sm gap-2 ${showAnalytics ? "btn-secondary" : "btn-ghost"}`}
                title={showAnalytics ? "Hide AI metrics" : "Show AI metrics"}
              >
                <BrainCircuitIcon className="size-4" />
                AI Metrics
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

        {/* ── Live AI Metrics Panel ── */}
        {isParticipant && showAnalytics && (
          <div className="bg-base-100 rounded-lg shadow px-4 py-3 border border-base-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider">
                Live AI Analysis
              </span>
              {!analyticsReady && (
                <span className="flex items-center gap-1 text-xs text-warning">
                  <Loader2Icon className="w-3 h-3 animate-spin" />
                  Loading models…
                </span>
              )}
              {analyticsReady && (
                <span className="text-xs text-success font-medium">● Live</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">

              {/* Emotion */}
              <div className="flex flex-col items-center gap-1 bg-base-200 rounded-lg p-2">
                <SmileIcon className="w-4 h-4 text-base-content/50" />
                <span className="text-xs text-base-content/50">Emotion</span>
                <span className="text-lg leading-none">
                  {metrics.emotion ? EMOTION_EMOJI[metrics.emotion] ?? "🤔" : "—"}
                </span>
                <span className="text-xs font-medium capitalize">
                  {metrics.emotion ?? "—"}
                </span>
                {metrics.emotionConfidence > 0 && (
                  <span className="text-[10px] text-base-content/40">
                    {Math.round(metrics.emotionConfidence * 100)}% conf
                  </span>
                )}
              </div>

              {/* Eye Contact */}
              <div className="flex flex-col items-center gap-1 bg-base-200 rounded-lg p-2">
                {metrics.eyeContact
                  ? <EyeIcon className="w-4 h-4 text-success" />
                  : <EyeOffIcon className="w-4 h-4 text-error" />
                }
                <span className="text-xs text-base-content/50">Eye Contact</span>
                <span className={`text-sm font-bold ${metrics.eyeContact ? "text-success" : "text-error"}`}>
                  {metrics.eyeContact ? "Yes" : "No"}
                </span>
                {metrics.gazeConfidence > 0 && (
                  <span className="text-[10px] text-base-content/40">
                    {Math.round(metrics.gazeConfidence * 100)}% conf
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
                  {metrics.handVelocity}/10
                </span>
              </div>

            </div>
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