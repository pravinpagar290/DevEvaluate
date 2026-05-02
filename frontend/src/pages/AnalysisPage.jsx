import { useParams, useNavigate } from "react-router";
import { useSessionById } from "../hooks/useSessions";
import Navbar from "../components/NavBar";
import { 
  CheckCircle2, 
  AlertCircle, 
  BarChart3, 
  MessageSquare, 
  Award,
  ArrowLeft,
  Quote,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

const AnalysisPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: sessionData, isLoading } = useSessionById(id);

  if (isLoading) {
    return (
      <div className="h-screen bg-base-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Generating your interview analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  const session = sessionData?.session;
  const analysis = session?.speechAnalysis;

  const getScoreColor = (score) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-error";
  };

  const getScoreBg = (score) => {
    if (score >= 80) return "bg-success/10 border-success/20";
    if (score >= 60) return "bg-warning/10 border-warning/20";
    return "bg-error/10 border-error/20";
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate("/dashboard")}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Interview Analysis</h1>
            <p className="text-base-content/60">
              {session?.problem} • {format(new Date(session?.createdAt), "PPP")}
            </p>
          </div>
        </div>

        {!analysis ? (
          <div className="card bg-base-100 shadow-xl p-12 text-center">
            <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-warning" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Analysis Not Available</h2>
            <p className="text-base-content/60 mb-8">
              We couldn't generate an analysis for this session. This might happen if no speech was detected.
            </p>
            <button 
              onClick={() => navigate("/dashboard")}
              className="btn btn-primary px-8"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score Overview Card */}
            <div className={`card shadow-xl border ${getScoreBg(analysis.score)} md:col-span-1`}>
              <div className="card-body items-center text-center">
                <Award className={`w-12 h-12 mb-2 ${getScoreColor(analysis.score)}`} />
                <h2 className="card-title text-xl opacity-80">Overall Score</h2>
                <div className="relative mt-4">
                  <div className="text-7xl font-black tabular-nums tracking-tighter">
                    {analysis.score}
                  </div>
                  <div className="text-xl font-bold opacity-40 absolute -right-8 bottom-2">/100</div>
                </div>
                <div className="divider opacity-10"></div>
                <p className="text-sm font-medium uppercase tracking-widest opacity-60">Performance</p>
                <div className={`text-lg font-bold ${getScoreColor(analysis.score)}`}>
                  {analysis.score >= 80 ? "EXCELLENT" : analysis.score >= 60 ? "GOOD" : "NEEDS IMPROVEMENT"}
                </div>
              </div>
            </div>

            {/* Overall Feedback Card */}
            <div className="card bg-base-100 shadow-xl md:col-span-2">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <BarChart3 className="w-5 h-5" />
                  <h2 className="card-title text-lg uppercase tracking-tight">Executive Summary</h2>
                </div>
                <p className="text-lg leading-relaxed italic text-base-content/80 relative">
                  <Quote className="w-8 h-8 opacity-5 absolute -left-4 -top-2" />
                  {analysis.overallFeedback}
                </p>
                <div className="mt-6 p-4 bg-base-200 rounded-xl border border-base-300">
                  <h3 className="font-bold flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-secondary" />
                    Sentence Formation
                  </h3>
                  <p className="text-sm text-base-content/70 leading-relaxed">
                    {analysis.basicSentenceFormation}
                  </p>
                </div>
              </div>
            </div>

            {/* Grammatical Errors */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4 text-error">
                  <AlertCircle className="w-5 h-5" />
                  <h2 className="card-title text-lg uppercase tracking-tight">Grammar Checks</h2>
                </div>
                {analysis.grammaticalErrors?.length > 0 ? (
                  <ul className="space-y-3">
                    {analysis.grammaticalErrors.map((error, index) => (
                      <li key={index} className="flex gap-3 text-sm bg-error/5 p-3 rounded-lg border border-error/10">
                        <span className="text-error font-bold mt-0.5">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 text-success bg-success/5 p-4 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">No major grammar errors detected!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filler Words & Transcript Summary */}
            <div className="card bg-base-100 shadow-xl md:col-span-2">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-warning">
                    <MessageSquare className="w-5 h-5" />
                    <h2 className="card-title text-lg uppercase tracking-tight">Filler Words Detected</h2>
                  </div>
                  <span className="badge badge-warning badge-outline font-bold">
                    {analysis.fillerWordsDetected?.length || 0} Found
                  </span>
                </div>
                
                {analysis.fillerWordsDetected?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysis.fillerWordsDetected.map((word, index) => (
                      <div key={index} className="badge badge-ghost p-3 font-mono text-xs uppercase border-base-300">
                        "{word}"
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-base-content/60">No excessive filler words detected.</p>
                )}

                <div className="divider my-4"></div>

                <div className="bg-base-200 rounded-xl p-6">
                  <h3 className="text-sm font-bold opacity-40 uppercase tracking-widest mb-4">Full Transcript</h3>
                  <div className="max-h-60 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-base-300">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-serif opacity-70">
                      {session?.transcript || "No transcript recorded for this session."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 flex justify-center pb-12">
          <button 
            onClick={() => navigate("/dashboard")}
            className="btn btn-outline px-12 rounded-full hover:bg-base-content hover:text-base-100 transition-all duration-300"
          >
            Return to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
};

export default AnalysisPage;
