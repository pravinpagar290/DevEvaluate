import { useUser } from "@clerk/clerk-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useEndSession, useJoinSession, useSessionById } from "../hooks/useSessions.js";
import { PROBLEMS } from "../data/problems";
import Navbar from "../components/NavBar.jsx"
import { executeCode } from "../lib/piston";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { getDifficultyBadgeClass } from "../lib/utils";
import { Loader2Icon, LogOutIcon, PhoneOffIcon } from "lucide-react";
import CodeEditorPanel from "../components/CodeEditorPanel";
import OutputPanel from "../components/OutputPanel";

import useStreamClient from "../hooks/useStreamClient";
import { StreamCall, StreamVideo } from "@stream-io/video-react-sdk";
import VideoCallUI from "../components/VideoCallUI";
import { startSpeechRecognition, stopSpeechRecognition } from "../../../services/frontend-ai/speech-recognition.service.js";

function SessionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useUser();
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const { data: sessionData, isLoading: loadingSession, refetch } = useSessionById(id);

  const joinSessionMutation = useJoinSession();
  const endSessionMutation = useEndSession();

  const session = sessionData?.session;
  const isHost = session?.host?.clerkId === user?.id;
  const isParticipant = session?.participant?.clerkId === user?.id;

  const { call, channel, chatClient, isInitializingCall, streamClient } = useStreamClient(
    session,
    loadingSession,
    isHost,
    isParticipant
  );

  // find the problem data based on session problem title
  const problemData = session?.problem
    ? Object.values(PROBLEMS).find((p) => p.title === session.problem)
    : null;

  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState(problemData?.starterCode?.[selectedLanguage] || "");

  // --- REAL-TIME SYNC LOGIC ---
  const isRemoteChange = useRef(false);
  const fullTranscriptRef = useRef(""); // Accumulates the candidate's speech

  // 1. Listen for remote updates
  useEffect(() => {
    if (!channel || !user) return;

    const handleEvent = (event) => {
      // Don't process our own events
      if (event.user.id === user.id) return;

      if (event.type === "code-update") {
        isRemoteChange.current = true;
        setCode(event.data.code);
      } else if (event.type === "language-update") {
        setSelectedLanguage(event.data.language);
      } else if (event.type === "code-execution-start") {
        setIsRunning(true);
        setOutput(null);
      } else if (event.type === "code-execution-result") {
        setOutput(event.data.result);
        setIsRunning(false);
      } else if (event.type === "speech-transcript") {
        const remoteRole = event.data.role;
        const remoteText = event.data.text;
        
        // Add the remote user's speech to the full transcript for context
        const speakerName = remoteRole === 'interviewer' ? 'Interviewer' : 'Candidate';
        fullTranscriptRef.current += `\n${speakerName}: ${remoteText}`;

        const isInterviewer = remoteRole === 'interviewer';
        const speakerLabel = isInterviewer ? '👨‍💼 REMOTE INTERVIEWER' : '🧑‍💻 REMOTE INTERVIEWEE';
        const finalColor = isInterviewer ? 'color: #FF9800; font-weight: bold;' : 'color: #4CAF50; font-weight: bold;';
        console.log(`%c[${speakerLabel} - FINAL]: %c${remoteText}`, finalColor, 'color: inherit;');
      }
    };

    channel.on("code-update", handleEvent);
    channel.on("language-update", handleEvent);
    channel.on("code-execution-start", handleEvent);
    channel.on("code-execution-result", handleEvent);
    channel.on("speech-transcript", handleEvent);

    return () => {
      channel.off("code-update", handleEvent);
      channel.off("language-update", handleEvent);
      channel.off("code-execution-start", handleEvent);
      channel.off("code-execution-result", handleEvent);
      channel.off("speech-transcript", handleEvent);
    };
  }, [channel, user]);

  // 2. Broadcast local code changes (Debounced 500ms)
  useEffect(() => {
    if (!channel || !code) return;

    // If this change came from a remote user, don't send it back
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      channel.sendEvent({
        type: "code-update",
        data: { code },
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [code, channel]);

  // auto-join session if user is not already a participant and not the host
  useEffect(() => {
    if (!session || !user || loadingSession) return;
    if (isHost || isParticipant) return;

    joinSessionMutation.mutate(id, { onSuccess: refetch });

    // remove the joinSessionMutation, refetch from dependencies to avoid infinite loop
  }, [session, user, loadingSession, isHost, isParticipant, id]);

  // --- AUDIO TRANSCRIPTION LOGIC ---
  useEffect(() => {
    if (!session || loadingSession) return;
    
    // Only start if we are part of the session
    if (isHost || isParticipant) {
      const role = isHost ? 'interviewer' : 'interviewee';
      startSpeechRecognition(role, (text, isFinal, resolvedRole) => {
        
        // Accumulate local transcript for post-interview analysis
        if (isFinal) {
          const speakerName = resolvedRole === 'interviewer' ? 'Interviewer' : 'Candidate';
          fullTranscriptRef.current += `\n${speakerName}: ${text}`;
        }

        // Broadcast final transcript to the remote user via the channel
        if (channel && isFinal) {
          channel.sendEvent({
            type: "speech-transcript",
            data: { text, role: resolvedRole }
          });
        }
      });
    }

    return () => {
      stopSpeechRecognition();
    };
  }, [session, loadingSession, isHost, isParticipant, channel]);

  // redirect the "participant" when session ends
  useEffect(() => {
    if (!session || loadingSession) return;

    if (session.status === "completed") navigate("/dashboard");
  }, [session, loadingSession, navigate]);

  // update code when problem loads or changes
  useEffect(() => {
    if (problemData?.starterCode?.[selectedLanguage]) {
      setCode(problemData.starterCode[selectedLanguage]);
    }
  }, [problemData, selectedLanguage]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    // use problem-specific starter code
    const starterCode = problemData?.starterCode?.[newLang] || "";
    setCode(starterCode);
    setOutput(null);

    // Sync language change immediately
    if (channel) {
      channel.sendEvent({
        type: "language-update",
        data: { language: newLang },
      });
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput(null);

    // 1. Notify other user that we are running code
    if (channel) {
      channel.sendEvent({ type: "code-execution-start" });
    }

    const result = await executeCode(selectedLanguage, code);
    setOutput(result);
    setIsRunning(false);

    // 2. Broadcast result to other user
    if (channel) {
      channel.sendEvent({
        type: "code-execution-result",
        data: { result },
      });
    }
  };

  const handleEndSession = () => {
    if (confirm("Are you sure you want to end this session? All participants will be notified.")) {
      const transcript = fullTranscriptRef.current.trim();
      // Log the full transcript that we will send to the backend for AI Analysis
      console.log("📝 Session Ended. Full Conversational Transcript for AI Analysis:");
      console.log(transcript || "(No speech detected)");
      
      // this will navigate the HOST to dashboard
      endSessionMutation.mutate({ id, transcript }, { 
        onSuccess: () => navigate(`/session/${id}/analysis`) 
      });
    }
  };

  return (
    <div className="h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="flex-1">
        <PanelGroup direction="horizontal">
          {/* LEFT PANEL - CODE EDITOR & PROBLEM DETAILS */}
          <Panel defaultSize={50} minSize={30}>
            <PanelGroup direction="vertical">
              {/* PROBLEM DSC PANEL */}
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full overflow-y-auto bg-base-200">
                  {/* HEADER SECTION */}
                  <div className="p-6 bg-base-100 border-b border-base-300">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h1 className="text-3xl font-bold text-base-content">
                          {session?.problem || "Loading..."}
                        </h1>
                        {problemData?.category && (
                          <p className="text-base-content/60 mt-1">{problemData.category}</p>
                        )}
                        <p className="text-base-content/60 mt-2">
                          Host: {session?.host?.name || "Loading..."} •{" "}
                          {session?.participant ? 2 : 1}/2 participants
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`badge badge-lg ${getDifficultyBadgeClass(
                            session?.difficulty
                          )}`}
                        >
                          {session?.difficulty.slice(0, 1).toUpperCase() +
                            session?.difficulty.slice(1) || "Easy"}
                        </span>
                        {isHost && session?.status === "active" && (
                          <button
                            onClick={handleEndSession}
                            disabled={endSessionMutation.isPending}
                            className="btn btn-error btn-sm gap-2"
                          >
                            {endSessionMutation.isPending ? (
                              <Loader2Icon className="w-4 h-4 animate-spin" />
                            ) : (
                              <LogOutIcon className="w-4 h-4" />
                            )}
                            End Session
                          </button>
                        )}
                        {session?.status === "completed" && (
                          <span className="badge badge-ghost badge-lg">Completed</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* problem desc */}
                    {problemData?.description && (
                      <div className="bg-base-100 rounded-xl shadow-sm p-5 border border-base-300">
                        <h2 className="text-xl font-bold mb-4 text-base-content">Description</h2>
                        <div className="space-y-3 text-base leading-relaxed">
                          <p className="text-base-content/90">{problemData.description.text}</p>
                          {problemData.description.notes?.map((note, idx) => (
                            <p key={idx} className="text-base-content/90">
                              {note}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* examples section */}
                    {problemData?.examples && problemData.examples.length > 0 && (
                      <div className="bg-base-100 rounded-xl shadow-sm p-5 border border-base-300">
                        <h2 className="text-xl font-bold mb-4 text-base-content">Examples</h2>

                        <div className="space-y-4">
                          {problemData.examples.map((example, idx) => (
                            <div key={idx}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="badge badge-sm">{idx + 1}</span>
                                <p className="font-semibold text-base-content">Example {idx + 1}</p>
                              </div>
                              <div className="bg-base-200 rounded-lg p-4 font-mono text-sm space-y-1.5">
                                <div className="flex gap-2">
                                  <span className="text-primary font-bold min-w-[70px]">
                                    Input:
                                  </span>
                                  <span>{example.input}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-secondary font-bold min-w-[70px]">
                                    Output:
                                  </span>
                                  <span>{example.output}</span>
                                </div>
                                {example.explanation && (
                                  <div className="pt-2 border-t border-base-300 mt-2">
                                    <span className="text-base-content/60 font-sans text-xs">
                                      <span className="font-semibold">Explanation:</span>{" "}
                                      {example.explanation}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Constraints */}
                    {problemData?.constraints && problemData.constraints.length > 0 && (
                      <div className="bg-base-100 rounded-xl shadow-sm p-5 border border-base-300">
                        <h2 className="text-xl font-bold mb-4 text-base-content">Constraints</h2>
                        <ul className="space-y-2 text-base-content/90">
                          {problemData.constraints.map((constraint, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-primary">•</span>
                              <code className="text-sm">{constraint}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>

              <PanelResizeHandle className="h-2 bg-base-300 hover:bg-primary transition-colors cursor-row-resize" />

              <Panel defaultSize={50} minSize={20}>
                <PanelGroup direction="vertical">
                  <Panel defaultSize={70} minSize={30}>
                    <CodeEditorPanel
                      selectedLanguage={selectedLanguage}
                      code={code}
                      isRunning={isRunning}
                      onLanguageChange={handleLanguageChange}
                      onCodeChange={(value) => setCode(value)}
                      onRunCode={handleRunCode}
                    />
                  </Panel>

                  <PanelResizeHandle className="h-2 bg-base-300 hover:bg-primary transition-colors cursor-row-resize" />

                  <Panel defaultSize={30} minSize={15}>
                    <OutputPanel output={output} />
                  </Panel>
                </PanelGroup>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-2 bg-base-300 hover:bg-primary transition-colors cursor-col-resize" />

          {/* RIGHT PANEL - VIDEO CALLS & CHAT */}
          <Panel defaultSize={50} minSize={30}>
            <div className="h-full bg-base-200 p-4 overflow-auto">
              {isInitializingCall ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2Icon className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                    <p className="text-lg">Connecting to video call...</p>
                  </div>
                </div>
              ) : !streamClient || !call ? (
                <div className="h-full flex items-center justify-center">
                  <div className="card bg-base-100 shadow-xl max-w-md">
                    <div className="card-body items-center text-center">
                      <div className="w-24 h-24 bg-error/10 rounded-full flex items-center justify-center mb-4">
                        <PhoneOffIcon className="w-12 h-12 text-error" />
                      </div>
                      <h2 className="card-title text-2xl">Connection Failed</h2>
                      <p className="text-base-content/70">Unable to connect to the video call</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  <StreamVideo client={streamClient}>
                    <StreamCall call={call}>
                      <VideoCallUI chatClient={chatClient} channel={channel} />
                    </StreamCall>
                  </StreamVideo>
                </div>
              )}
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

export default SessionPage;