import React, { useState } from "react";
import { sessionApi } from "../api/sessions.js";
import { SparklesIcon, CopyIcon, CheckIcon, AlertCircleIcon, Loader2Icon } from "lucide-react";

const CodeReview = ({ code }) => {
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("Copy");

  const handleFetchReview = async () => {
    if (!code) {
      setError("Please provide code to review.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await sessionApi.getCodeReview(code);
      const result =
        typeof response === "string"
          ? response
          : response?.review || JSON.stringify(response, null, 2);
      setReview(result);
    } catch (err) {
      console.error("failed to get a review", err);
      setError("Failed to get code review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!review) return;
    try {
      await navigator.clipboard.writeText(review);
      setCopyStatus("Copied");
      setTimeout(() => setCopyStatus("Copy"), 1500);
    } catch (err) {
      console.error("Copy failed", err);
      setCopyStatus("Copy failed");
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 bg-base-100 p-4 rounded-xl border border-base-300 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <SparklesIcon className="size-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-base-content">AI Review</h2>
        </div>
        <button
          type="button"
          onClick={handleFetchReview}
          disabled={loading}
          className={`btn btn-primary btn-sm md:btn-md gap-2 ${loading ? "btn-disabled" : ""}`}
        >
          {loading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SparklesIcon className="size-4" />
          )}
          {loading ? "Analyzing..." : "Get AI Review"}
        </button>
      </div>

      {error && (
        <div className="alert alert-error shadow-sm rounded-xl py-3 px-4">
          <AlertCircleIcon className="size-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative group">
        <div className="bg-base-100 border border-base-300 rounded-xl shadow-inner min-h-[300px] p-6 font-sans leading-relaxed text-base-content whitespace-pre-wrap transition-all duration-300">
          {review ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {review}
            </div>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center text-center opacity-40 select-none">
              <SparklesIcon className="size-16 mb-4" />
              <p className="text-lg font-medium">Your AI code-review will appear here.</p>
              <p className="text-sm">Click "Get AI Review" to analyze your solution.</p>
            </div>
          )}
        </div>

        {review && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-4 right-4 btn btn-ghost btn-sm bg-base-200 hover:bg-base-300 gap-2 border border-base-300"
          >
            {copyStatus === "Copied" ? (
              <CheckIcon className="size-4 text-success" />
            ) : (
              <CopyIcon className="size-4" />
            )}
            {copyStatus}
          </button>
        )}
      </div>

      {review && !loading && (
          <div className="text-center pb-8 border-t border-base-300 pt-4 opacity-50 text-xs">
              AI feedback helps you improve, but always use your judgment.
          </div>
      )}
    </div>
  );
};

export default CodeReview;
