import React, { useState, useEffect, useRef } from "react";
import { DocumentItem, QuizQuestion, StudyMode, QuestionType } from "../types";
import { HelpCircle, MessageSquare, BookOpen, Sparkles, Send, BrainCircuit, RotateCcw, Check, X, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface InteractiveStudyProps {
  documentItem: DocumentItem;
  mode: StudyMode;
  onSetMode: (mode: StudyMode) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function InteractiveStudy({
  documentItem,
  mode,
  onSetMode,
}: InteractiveStudyProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Summarize & Analysis State
  const [summaryText, setSummaryText] = useState<string>("");
  const [analysisText, setAnalysisText] = useState<string>("");

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [id: string]: string }>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize/Reset State on document swap or mode swap
  useEffect(() => {
    setError(null);
    if (mode === StudyMode.SUMMARY && !summaryText) {
      handleFetchSummary();
    } else if (mode === StudyMode.ANALYSIS && !analysisText) {
      handleFetchAnalysis();
    } else if (mode === StudyMode.QUIZ && quizQuestions.length === 0) {
      handleFetchQuiz();
    } else if (mode === StudyMode.CHAT && chatMessages.length === 0) {
      setChatMessages([
        {
          role: "assistant",
          content: `Hi there! I am your interactive AI Study Guide for "${documentItem.title}". Ask me any conceptual question, query a definition, or request examples!`,
        },
      ]);
    }
  }, [mode, documentItem.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Backend Calls
  const handleFetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/study/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: documentItem.title, content: documentItem.content }),
      });
      if (!res.ok) throw new Error("Could not retrieve AI summary.");
      const data = await res.json();
      setSummaryText(data.summary);
    } catch (err: any) {
      setError(err.message || "Failed to load summary.");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/study/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: documentItem.title, content: documentItem.content }),
      });
      if (!res.ok) throw new Error("Could not retrieve AI analysis.");
      const data = await res.json();
      setAnalysisText(data.analysis);
    } catch (err: any) {
      setError(err.message || "Failed to load analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchQuiz = async () => {
    setLoading(true);
    setError(null);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizScore(null);
    setShowExplanation(false);
    try {
      const res = await fetch("/api/study/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: documentItem.title, content: documentItem.content, questionCount: 5 }),
      });
      if (!res.ok) throw new Error("Could not compile interactive quiz.");
      const data = await res.json();
      setQuizQuestions(data.quiz);
    } catch (err: any) {
      setError(err.message || "Failed to load quiz.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    
    const updatedMessages = [...chatMessages, { role: "user" as const, content: userMsg }];
    setChatMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/study/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: documentItem.title,
          content: documentItem.content,
          messages: updatedMessages,
        }),
      });
      if (!res.ok) throw new Error("Study chatbot failed to respond.");
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I experienced a connection issue while analyzing the database. Let's try again!" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Quiz Scoring
  const handleSelectQuizAnswer = (answer: string) => {
    const q = quizQuestions[currentQuestionIndex];
    setSelectedAnswers((prev) => ({ ...prev, [q.id]: answer }));
    setShowExplanation(true);
  };

  const handleNextQuizQuestion = () => {
    setShowExplanation(false);
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Calculate Score
      let scoreCount = 0;
      quizQuestions.forEach((q) => {
        const userAns = selectedAnswers[q.id]?.trim().toLowerCase();
        const correctAns = q.correctAnswer.trim().toLowerCase();
        if (q.type === QuestionType.MULTIPLE_CHOICE) {
          if (userAns === correctAns) scoreCount++;
        } else {
          // Soft-matching for short answer
          if (correctAns && userAns && (userAns.includes(correctAns) || correctAns.includes(userAns))) {
            scoreCount++;
          }
        }
      });
      setQuizScore(scoreCount);
    }
  };

  // Simple clean markdown-to-HTML parser function to render beautiful rich summaries offline & online
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return (
      <div className="space-y-3 font-sans text-xs sm:text-sm leading-relaxed text-slate-300">
        {lines.map((line, i) => {
          // Headers
          if (line.startsWith("### ")) {
            return (
              <h4 key={i} className="text-sm font-bold text-gold-accent mt-4 border-l-2 border-gold-accent pl-2">
                {line.slice(4)}
              </h4>
            );
          }
          if (line.startsWith("## ")) {
            return (
              <h3 key={i} className="text-base font-bold text-gold-accent mt-5 border-b border-gold-border pb-1 font-serif italic">
                {line.slice(3)}
              </h3>
            );
          }
          if (line.startsWith("# ")) {
            return (
              <h2 key={i} className="text-lg font-serif italic font-bold text-gold-accent mt-6 mb-2">
                {line.slice(2)}
              </h2>
            );
          }
          // Bullet list items
          if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
            // Check for bold text in list items
            const cleaned = line.trim().slice(2);
            return (
              <ul key={i} className="list-disc list-inside pl-4 text-slate-300 space-y-1">
                <li>{parseBoldText(cleaned)}</li>
              </ul>
            );
          }
          // Bold parsed blocks
          return <p key={i} className="min-h-[1rem]">{parseBoldText(line)}</p>;
        })}
      </div>
    );
  };

  const parseBoldText = (text: string) => {
    const parts = text.split("**");
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <strong key={index} className="font-semibold text-gold-accent">
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  return (
    <div id="interactive-study-hub" className="space-y-4">
      {/* Mode Select Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gold-panel border border-gold-border p-3.5 rounded-2xl">
        <div className="flex items-center gap-2 px-1">
          <BrainCircuit className="h-5 w-5 text-gold-accent" />
          <span className="font-bold text-sm text-slate-300">
            Concept: <span className="text-gold-accent font-serif italic text-base font-semibold">{documentItem.title}</span>
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            id="study-tab-summary"
            onClick={() => onSetMode(StudyMode.SUMMARY)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
              mode === StudyMode.SUMMARY
                ? "bg-gold-accent text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                : "bg-gold-card hover:bg-gold-input border border-gold-border text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" /> Summary
          </button>
          <button
            id="study-tab-analysis"
            onClick={() => onSetMode(StudyMode.ANALYSIS)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
              mode === StudyMode.ANALYSIS
                ? "bg-gold-accent text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                : "bg-gold-card hover:bg-gold-input border border-gold-border text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Analysis
          </button>
          <button
            id="study-tab-quiz"
            onClick={() => onSetMode(StudyMode.QUIZ)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
              mode === StudyMode.QUIZ
                ? "bg-gold-accent text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                : "bg-gold-card hover:bg-gold-input border border-gold-border text-slate-400 hover:text-slate-200"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" /> Quiz
          </button>
          <button
            id="study-tab-chat"
            onClick={() => onSetMode(StudyMode.CHAT)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
              mode === StudyMode.CHAT
                ? "bg-gold-accent text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                : "bg-gold-card hover:bg-gold-input border border-gold-border text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" /> Study Chat
          </button>
        </div>
      </div>

      {/* Main Study Screen Box */}
      <div className="bg-gold-panel border border-gold-border rounded-2xl p-5 shadow-xl min-h-[400px] flex flex-col">
        {loading && !summaryText && !analysisText && quizQuestions.length === 0 && chatMessages.length <= 1 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-gold-accent border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="text-xs text-slate-400 font-mono tracking-wider">
              CONSULTING GEMINI INTEL FOR CUSTOM STUDY PLANS...
            </span>
          </div>
        ) : error ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
            <X className="h-8 w-8 text-red-500 mb-3" />
            <h4 className="font-serif italic text-lg text-gold-accent">Study Engine Offline</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1.5 mb-4 leading-normal">
              {error} If you are running offline, you can still read notes directly on the document screen.
            </p>
            <button
              id="retry-study-action"
              onClick={() => {
                if (mode === StudyMode.SUMMARY) handleFetchSummary();
                else if (mode === StudyMode.ANALYSIS) handleFetchAnalysis();
                else if (mode === StudyMode.QUIZ) handleFetchQuiz();
              }}
              className="px-4 py-2 text-xs bg-gold-accent hover:bg-gold-hover text-black font-bold rounded-lg transition"
            >
              Retry AI Generation
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* 1. Summarization Sheet */}
            {mode === StudyMode.SUMMARY && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center border-b border-gold-border pb-2.5">
                  <h3 className="font-serif italic text-base text-gold-accent flex items-center gap-1.5">
                    📝 Core Summary Guide
                  </h3>
                  <button
                    id="regenerate-summary-btn"
                    onClick={handleFetchSummary}
                    className="text-[10px] bg-gold-card border border-gold-border text-gold-accent px-2.5 py-1 rounded hover:bg-gold-accent hover:text-black transition"
                  >
                    Regenerate
                  </button>
                </div>
                <div id="summary-markdown-content" className="prose dark:prose-invert max-w-none text-slate-300">
                  {summaryText ? renderMarkdown(summaryText) : (
                    <p className="text-xs text-slate-500 italic">No summary text loaded.</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* 2. Concept Analysis Sheet */}
            {mode === StudyMode.ANALYSIS && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center border-b border-gold-border pb-2.5">
                  <h3 className="font-serif italic text-base text-gold-accent flex items-center gap-1.5">
                    💡 AI Deep Concept Breakdown
                  </h3>
                  <button
                    id="regenerate-analysis-btn"
                    onClick={handleFetchAnalysis}
                    className="text-[10px] bg-gold-card border border-gold-border text-gold-accent px-2.5 py-1 rounded hover:bg-gold-accent hover:text-black transition"
                  >
                    Regenerate
                  </button>
                </div>
                <div id="analysis-markdown-content" className="prose dark:prose-invert max-w-none text-slate-300">
                  {analysisText ? renderMarkdown(analysisText) : (
                    <p className="text-xs text-slate-500 italic">No analysis text loaded.</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* 3. Interactive Quiz */}
            {mode === StudyMode.QUIZ && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-grow flex flex-col gap-4"
              >
                {quizScore !== null ? (
                  /* Quiz Score Completed Card */
                  <div id="quiz-completed-panel" className="flex-grow flex flex-col items-center justify-center py-10 text-center space-y-4">
                    <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-full text-emerald-400">
                      <ShieldCheck className="h-12 w-12" />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif italic text-gold-accent">Quiz Completed!</h3>
                      <p className="text-xs text-slate-400 mt-1.5">Excellent study effort. Let's review your concepts score.</p>
                    </div>

                    <div className="bg-gold-input border border-gold-border rounded-2xl px-10 py-6">
                      <span className="text-4xl font-extrabold text-gold-accent font-mono">
                        {quizScore} <span className="text-slate-500 font-normal">/</span> {quizQuestions.length}
                      </span>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1.5 font-mono">
                        SUCCESS RATIO: {Math.round((quizScore / quizQuestions.length) * 100)}%
                      </p>
                    </div>

                    <button
                      id="quiz-restart-btn"
                      onClick={handleFetchQuiz}
                      className="px-4 py-2.5 bg-gold-accent hover:bg-gold-hover text-black font-bold rounded-lg text-xs transition shadow-sm flex items-center gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Retake Another Quiz
                    </button>
                  </div>
                ) : quizQuestions.length > 0 ? (
                  /* Live Quiz Question Frame */
                  <div className="flex-grow flex flex-col gap-4">
                    {/* Header progress info */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                      <span>Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
                      <span>Concept Progress</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-gold-input border border-gold-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold-dim to-gold-accent transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                      ></div>
                    </div>

                    {/* Question Statement */}
                    <div className="p-4 bg-gold-input border border-gold-border/80 rounded-xl mt-2">
                      <h4 className="text-[10px] font-bold text-gold-accent uppercase tracking-widest mb-1.5 font-mono">
                        {quizQuestions[currentQuestionIndex].type === QuestionType.MULTIPLE_CHOICE ? "Multiple Choice Spec" : "Short Answer Concept"}
                      </h4>
                      <p className="text-sm font-semibold text-slate-200">
                        {quizQuestions[currentQuestionIndex].question}
                      </p>
                    </div>

                    {/* Question Answers Panel */}
                    <div className="space-y-2 flex-grow">
                      {quizQuestions[currentQuestionIndex].type === QuestionType.MULTIPLE_CHOICE ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {quizQuestions[currentQuestionIndex].options.map((opt, i) => {
                            const isSelected = selectedAnswers[quizQuestions[currentQuestionIndex].id] === opt;
                            const isCorrect = opt === quizQuestions[currentQuestionIndex].correctAnswer;
                            let btnStyle = "border-gold-border bg-gold-input text-slate-300 hover:bg-gold-card/60";
                            
                            if (isSelected) {
                              btnStyle = showExplanation
                                ? isCorrect
                                  ? "bg-emerald-950/20 border-emerald-500 text-emerald-400 font-semibold"
                                  : "bg-red-950/20 border-red-500 text-red-400 font-semibold"
                                : "bg-gold-accent border-gold-accent text-black font-bold shadow";
                            } else if (showExplanation && isCorrect) {
                              btnStyle = "bg-emerald-950/20 border-emerald-500 text-emerald-400 font-semibold";
                            }

                            return (
                              <button
                                key={i}
                                id={`quiz-option-btn-${i}`}
                                disabled={showExplanation}
                                onClick={() => handleSelectQuizAnswer(opt)}
                                className={`text-left p-3.5 text-xs font-medium border rounded-xl transition-all duration-200 ${btnStyle} flex justify-between items-center`}
                              >
                                <span>{opt}</span>
                                {showExplanation && isCorrect && <Check className="h-4 w-4 text-emerald-500" />}
                                {showExplanation && isSelected && !isCorrect && <X className="h-4 w-4 text-red-500" />}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        /* Short Answer Entry */
                        <div className="space-y-3">
                          <input
                            id="quiz-short-answer-input"
                            type="text"
                            placeholder="Type your brief concept answer here..."
                            disabled={showExplanation}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSelectQuizAnswer(e.currentTarget.value);
                              }
                            }}
                            className="w-full text-xs p-3.5 rounded-lg border border-gold-border bg-gold-input text-gold-text focus:outline-none focus:ring-1.5 focus:ring-gold-accent"
                          />
                          {!showExplanation && (
                            <button
                              id="quiz-short-answer-submit"
                              onClick={(e) => {
                                const el = document.getElementById("quiz-short-answer-input") as HTMLInputElement;
                                if (el) handleSelectQuizAnswer(el.value);
                              }}
                              className="text-xs bg-gold-accent hover:bg-gold-hover text-black font-bold py-2 px-4 rounded transition"
                            >
                              Submit Concept Answer
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Explanatory notes display */}
                    {showExplanation && (
                      <div className="p-4 bg-gold-input border border-gold-border rounded-xl space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gold-accent font-mono block">
                          Core Explanation Note
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {quizQuestions[currentQuestionIndex].explanation}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                          Expected Answer: <span className="text-emerald-400 font-bold">{quizQuestions[currentQuestionIndex].correctAnswer}</span>
                        </p>
                      </div>
                    )}

                    {/* Bottom Navigator */}
                    {showExplanation && (
                      <button
                        id="quiz-next-btn"
                        onClick={handleNextQuizQuestion}
                        className="w-full py-3 bg-gold-accent hover:bg-gold-hover text-black font-bold text-xs rounded-lg transition mt-auto shadow-md"
                      >
                        {currentQuestionIndex < quizQuestions.length - 1 ? "Next Concept Question →" : "Finish Quiz & See Score"}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic font-serif">No quiz compiled yet.</p>
                )}
              </motion.div>
            )}

            {/* 4. Interactive Study Chat Companion */}
            {mode === StudyMode.CHAT && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-grow flex flex-col min-h-[380px]"
              >
                {/* Messages Panel */}
                <div className="flex-grow overflow-y-auto space-y-3 p-1 max-h-[320px] mb-3">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                          msg.role === "user"
                            ? "bg-gold-accent text-black font-medium rounded-tr-none shadow"
                            : "bg-gold-input text-slate-200 border border-gold-border rounded-tl-none whitespace-pre-wrap"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-gold-input border border-gold-border rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-1.5 text-gold-accent/70">
                        <span className="w-1.5 h-1.5 bg-gold-accent rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-gold-accent rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-gold-accent rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Controls */}
                <form onSubmit={handleSendChatMessage} className="flex gap-2 mt-auto">
                  <input
                    id="study-chat-input"
                    type="text"
                    placeholder={`Ask a question about "${documentItem.title}"...`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-grow text-xs px-3.5 py-2.5 rounded-lg border border-gold-border bg-gold-input text-gold-text focus:outline-none focus:ring-1.5 focus:ring-gold-accent"
                  />
                  <button
                    id="study-chat-submit"
                    type="submit"
                    className="p-2.5 bg-gold-accent hover:bg-gold-hover text-black font-bold rounded-lg transition"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
