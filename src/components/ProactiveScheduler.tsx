import React, { useState } from "react";
import { ProactiveTask, TaskPriority, StudyStreak } from "../types";
import { Calendar, CheckCircle2, AlertCircle, Clock, Plus, Flame, Award, Download, Trash2, Check, Sparkles, Loader2, Send, Bot, MessageSquare } from "lucide-react";
import { motion } from "motion/react";

interface ProactiveSchedulerProps {
  tasks: ProactiveTask[];
  streak: StudyStreak;
  onAddTask: (task: Omit<ProactiveTask, "id" | "status" | "reminded">) => void;
  onCompleteTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onLogStudyMinutes: (mins: number) => void;
}

export default function ProactiveScheduler({
  tasks,
  streak,
  onAddTask,
  onCompleteTask,
  onDeleteTask,
  onLogStudyMinutes,
}: ProactiveSchedulerProps) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [category, setCategory] = useState("Exam Prep");
  const [studyHours, setStudyHours] = useState(2);
  const [logMins, setLogMins] = useState(30);

  // AI Planner state
  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [customQuestion, setCustomQuestion] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<Array<{role: "user" | "coach", content: string}>>([]);

  const handleFetchPlannerAdvice = async (e?: React.FormEvent, isCustomChat = false) => {
    if (e) e.preventDefault();
    if (aiLoading) return;
    
    const queryToSend = isCustomChat ? customQuestion.trim() : "";
    if (isCustomChat && !queryToSend) return;

    setAiLoading(true);

    if (isCustomChat) {
      setChatHistory((prev) => [...prev, { role: "user", content: queryToSend }]);
      setCustomQuestion("");
    }

    try {
      const response = await fetch("/api/study/planner-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks,
          streak,
          customQuery: queryToSend || undefined
        }),
      });

      if (!response.ok) throw new Error("Could not reach study planner API.");
      const data = await response.json();

      if (isCustomChat) {
        setChatHistory((prev) => [...prev, { role: "coach", content: data.advice }]);
      } else {
        setAiAdvice(data.advice);
      }
    } catch (err: any) {
      console.error(err);
      if (isCustomChat) {
        setChatHistory((prev) => [...prev, { role: "coach", content: "Apologies, I encountered a connection lapse. Let's try again in a moment!" }]);
      } else {
        setAiAdvice("Failed to retrieve schedule advice. Please verify connection and retry.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Calendar calculations
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && dueDate) {
      onAddTask({
        title: title.trim(),
        description: desc.trim(),
        dueDate,
        dueTime: dueTime || "12:00",
        priority,
        category,
        studyHoursRequired: Number(studyHours),
        progress: 0,
      });
      setTitle("");
      setDesc("");
      setDueDate("");
      setDueTime("");
    }
  };

  // Sync to External Calendar (ICS File Generator)
  const handleExportICS = () => {
    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//LastMinuteSaver//ProactivePlanner//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    tasks.forEach((task) => {
      const dateClean = task.dueDate.replace(/-/g, ""); // e.g. 20260627
      const timeClean = (task.dueTime || "12:00").replace(/:/g, "") + "00"; // e.g. 120000
      const uid = `${task.id}@lastminutesaver.app`;
      
      icsContent.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dateClean}T${timeClean}`,
        `DTSTART:${dateClean}T${timeClean}`,
        `SUMMARY:${task.title} [Priority: ${task.priority}]`,
        `DESCRIPTION:${task.description || "Study deadline managed by Last-Minute Life Saver"}`,
        "STATUS:CONFIRMED",
        "SEQUENCE:0",
        "END:VEVENT"
      );
    });

    icsContent.push("END:VCALENDAR");
    const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "study-schedule-sync.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calendar Day Generation Helper
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDayIndex = getFirstDayOfMonth(currentMonth, currentYear);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayIndex }, (_, i) => i);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return (
      <div className="space-y-3 font-sans text-xs leading-relaxed text-slate-300">
        {lines.map((line, i) => {
          if (line.startsWith("### ")) {
            return (
              <h4 key={i} className="text-xs font-bold text-gold-accent mt-4 border-l-2 border-gold-accent pl-2">
                {line.slice(4)}
              </h4>
            );
          }
          if (line.startsWith("## ")) {
            return (
              <h3 key={i} className="text-sm font-bold text-gold-accent mt-5 border-b border-gold-border pb-1 font-serif italic">
                {line.slice(3)}
              </h3>
            );
          }
          if (line.startsWith("# ")) {
            return (
              <h2 key={i} className="text-base font-serif italic font-bold text-gold-accent mt-6 mb-2">
                {line.slice(2)}
              </h2>
            );
          }
          if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
            const cleaned = line.trim().slice(2);
            return (
              <ul key={i} className="list-disc list-inside pl-4 text-slate-300 space-y-1">
                <li>{parseBoldText(cleaned)}</li>
              </ul>
            );
          }
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
    <div id="proactive-scheduler-layout" className="space-y-6">
      
      {/* Dynamic Streaks & Productivity Score Bento Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Streak Counter Panel */}
        <div className="bg-gradient-to-br from-gold-dim to-gold-accent text-black rounded-2xl p-5 flex items-center justify-between shadow-[0_4px_20px_rgba(212,175,55,0.15)] border border-gold-accent/40">
          <div className="space-y-1">
            <span className="text-[10px] tracking-widest font-bold uppercase text-black/60">
              Active Habit Streak
            </span>
            <h3 className="text-3xl font-serif italic font-black flex items-center gap-1.5 text-black">
              <Flame className="h-7 w-7 text-amber-950 fill-amber-950 animate-pulse" />
              {streak.streak} Day{streak.streak !== 1 ? "s" : ""}
            </h3>
            <p className="text-xs text-black/80 font-medium">
              Keep checking off assignments before due dates!
            </p>
          </div>
          <div className="p-3 bg-black/10 rounded-xl">
            <Flame className="h-8 w-8 text-black" />
          </div>
        </div>

        {/* Total Studying Panel */}
        <div className="bg-gold-panel border border-gold-border rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div className="space-y-1.5 flex-grow">
            <span className="text-[10px] tracking-widest font-bold uppercase text-slate-500">
              Accumulated Study Time
            </span>
            <h3 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Clock className="h-5.5 w-5.5 text-gold-accent" />
              {streak.totalMinutes} Mins
            </h3>
            
            {/* Quick Log Form */}
            <div className="flex gap-1.5 items-center mt-2.5 pt-2 border-t border-gold-border/60">
              <input
                id="study-mins-log"
                type="number"
                min="5"
                max="300"
                value={logMins}
                onChange={(e) => setLogMins(Number(e.target.value))}
                className="w-16 px-2 py-1 text-xs rounded border border-gold-border bg-gold-input text-gold-text focus:outline-none"
              />
              <button
                id="log-study-mins-btn"
                onClick={() => onLogStudyMinutes(logMins)}
                className="px-2.5 py-1 text-[10px] bg-gold-card hover:bg-gold-accent hover:text-black border border-gold-border/80 text-gold-accent rounded font-bold transition duration-200"
              >
                + Log
              </button>
            </div>
          </div>
          <div className="p-3.5 bg-gold-card border border-gold-border rounded-xl text-gold-accent">
            <Award className="h-8 w-8" />
          </div>
        </div>

        {/* Proactive Task Completion Panel */}
        <div className="bg-gold-panel border border-gold-border rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] tracking-widest font-bold uppercase text-slate-500">
              Critical Task Backlog
            </span>
            <h3 className="text-2xl font-bold text-slate-100 font-serif italic">
              {tasks.filter((t) => t.status === "pending" && t.priority === TaskPriority.HIGH).length} High Priority
            </h3>
            <p className="text-xs text-slate-400">
              Total pending studies: {tasks.filter((t) => t.status === "pending").length}
            </p>
          </div>
          <button
            id="ics-calendar-export-btn"
            onClick={handleExportICS}
            className="p-3.5 bg-gold-card border border-gold-border hover:bg-gold-accent hover:text-black rounded-xl text-gold-accent transition duration-200"
            title="Sync to External Calendar (ICS)"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT 5/12: Add study task and list critical timelines */}
        <div className="lg:col-span-5 bg-gold-panel border border-gold-border rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="font-serif italic text-lg text-gold-accent flex items-center gap-2">
            <Plus className="h-5 w-5 text-gold-accent" />
            Schedule New Study/Deadline
          </h3>

          <form onSubmit={handleAddTaskSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                Concept Title / Event Name
              </label>
              <input
                id="task-title-input"
                type="text"
                placeholder="e.g., Vibe2Ship Assignment Prep"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-gold-border bg-gold-input text-gold-text focus:outline-none focus:ring-1.5 focus:ring-gold-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                Context Description
              </label>
              <textarea
                id="task-desc-input"
                rows={2}
                placeholder="Study requirements, materials needed..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-gold-border bg-gold-input text-gold-text focus:outline-none focus:ring-1.5 focus:ring-gold-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Due Date
                </label>
                <input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gold-border bg-gold-input text-gold-text focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Due Time
                </label>
                <input
                  id="task-due-time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gold-border bg-gold-input text-gold-text focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Task Urgency
                </label>
                <select
                  id="task-priority-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gold-border bg-gold-input text-gold-text focus:outline-none"
                >
                  <option value={TaskPriority.HIGH}>🔥 High (ASAP)</option>
                  <option value={TaskPriority.MEDIUM}>⚡ Medium (Soon)</option>
                  <option value={TaskPriority.LOW}>🕒 Low (Later)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Study Hours Req.
                </label>
                <input
                  id="task-hours-input"
                  type="number"
                  min="1"
                  max="100"
                  value={studyHours}
                  onChange={(e) => setStudyHours(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gold-border bg-gold-input text-gold-text focus:outline-none"
                />
              </div>
            </div>

            <button
              id="task-submit-btn"
              type="submit"
              className="w-full text-xs bg-gold-accent hover:bg-gold-hover text-black font-bold py-3 rounded-lg transition-all duration-300 shadow-[0_4px_12px_rgba(212,175,55,0.15)]"
            >
              Add To Active Backlog
            </button>
          </form>
        </div>

        {/* RIGHT 7/12: Beautiful Calendar and Due Tasks Listing */}
        <div className="lg:col-span-7 bg-gold-panel border border-gold-border rounded-2xl p-5 shadow-xl flex flex-col gap-4">
          
          {/* Calendar Controller */}
          <div className="flex items-center justify-between">
            <h3 className="font-serif italic text-lg text-gold-accent flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gold-accent" />
              Proactive Study Planner
            </h3>

            <div className="flex items-center gap-1.5 bg-gold-input border border-gold-border p-1.5 rounded-lg">
              <button
                id="prev-month-btn"
                onClick={handlePrevMonth}
                className="p-1 text-slate-400 hover:text-gold-accent rounded text-xs transition"
              >
                ◀
              </button>
              <span className="text-xs font-bold px-1 text-slate-200 uppercase tracking-wider font-mono">
                {monthNames[currentMonth].toUpperCase().substring(0, 3)} {currentYear}
              </span>
              <button
                id="next-month-btn"
                onClick={handleNextMonth}
                className="p-1 text-slate-400 hover:text-gold-accent rounded text-xs transition"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Monthly grid */}
          <div className="border border-gold-border rounded-xl overflow-hidden bg-gold-input">
            {/* Week Headers */}
            <div className="grid grid-cols-7 bg-gold-card py-2 text-center border-b border-gold-border">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                <span key={day} className="text-[10px] font-bold text-slate-500 tracking-wider">
                  {day}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 text-center">
              {blanksArray.map((b) => (
                <div key={`blank-${b}`} className="aspect-square border-b border-r border-gold-border/40 bg-gold-panel/20"></div>
              ))}
              {daysArray.map((day) => {
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const daysTasks = tasks.filter((t) => t.dueDate === dateStr);
                const hasHigh = daysTasks.some((t) => t.priority === TaskPriority.HIGH);
                const hasMedOrLow = daysTasks.length > 0 && !hasHigh;

                return (
                  <div
                    key={`day-${day}`}
                    className="aspect-square border-b border-r border-gold-border/40 p-1 flex flex-col items-center justify-between relative group hover:bg-gold-card/30 transition duration-200"
                  >
                    <span className="text-[10px] font-bold text-slate-400 self-start p-0.5">
                      {day}
                    </span>
                    
                    {/* Urgency indicators */}
                    <div className="flex gap-0.5 justify-center mb-1">
                      {daysTasks.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.priority === TaskPriority.HIGH
                              ? "bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]"
                              : t.priority === TaskPriority.MEDIUM
                              ? "bg-amber-400"
                              : "bg-blue-400"
                          }`}
                          title={`${t.title} [Due ${t.dueTime}]`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Tasks list matching calendar / priority */}
          <div className="space-y-2.5 flex-grow overflow-y-auto max-h-[180px] pt-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Approaching Due Dates
            </h4>

            {tasks.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center font-serif">No assignments scheduled yet. Try planning your first study objective.</p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  id={`scheduler-task-${task.id}`}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all duration-300 ${
                    task.status === "completed"
                      ? "bg-gold-input/30 border-gold-border/30 opacity-50"
                      : "bg-gold-card border-gold-border"
                  }`}
                >
                  <div className="flex gap-2.5 items-start flex-grow">
                    <div className="mt-0.5">
                      {task.priority === TaskPriority.HIGH ? (
                        <AlertCircle className="h-4 w-4 text-red-400 animate-pulse" />
                      ) : (
                        <Clock className="h-4 w-4 text-gold-accent/70" />
                      )}
                    </div>
                    <div>
                      <h4 className={`text-xs font-semibold ${task.status === "completed" ? "line-through text-slate-500" : "text-slate-200"}`}>
                        {task.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-normal mt-0.5 font-mono">
                        DUE: <span className="font-semibold text-slate-400">{task.dueDate} at {task.dueTime}</span> | HOURS: {task.studyHoursRequired}h
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {task.status !== "completed" && (
                      <button
                        id={`complete-task-${task.id}`}
                        onClick={() => onCompleteTask(task.id)}
                        className="p-1.5 bg-emerald-950/30 hover:bg-emerald-500 border border-emerald-900/30 hover:text-black rounded text-emerald-400 transition"
                        title="Mark complete"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      id={`delete-task-${task.id}`}
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 bg-gold-input hover:bg-red-500 hover:text-white border border-gold-border rounded text-slate-500 transition"
                      title="Delete assignment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Gemini AI Proactive Study Coach & Planner Panel */}
      <div id="ai-study-coach-panel" className="bg-gold-panel border border-gold-border rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gold-border/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gold-accent/10 border border-gold-accent/30 rounded-xl text-gold-accent animate-pulse">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-serif italic text-lg text-gold-accent flex items-center gap-2">
                Gemini AI Proactive Study Coach
                <Sparkles className="h-4 w-4 text-gold-accent" />
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Analyzes your {tasks.length} active assignments and {streak.streak}-day habit streak to construct an hourly optimized timetable.
              </p>
            </div>
          </div>
          
          <button
            id="generate-ai-plan-btn"
            disabled={aiLoading}
            onClick={() => handleFetchPlannerAdvice(undefined, false)}
            className="px-4 py-2.5 bg-gold-accent hover:bg-gold-hover disabled:opacity-50 text-black font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-[0_4px_12px_rgba(212,175,55,0.15)]"
          >
            {aiLoading && !customQuestion ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Coordinating Schedule...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Generate Optimized Study Plan
              </>
            )}
          </button>
        </div>

        {/* Display Primary Study Advice if generated */}
        {aiAdvice && (
          <div id="ai-planner-advice-view" className="p-4.5 bg-gold-input border border-gold-border rounded-xl space-y-3 leading-relaxed">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold-accent font-mono flex items-center gap-1.5 border-b border-gold-border/60 pb-1.5 mb-2.5">
              <Sparkles className="h-3 w-3 text-gold-accent" /> Personal Productivity Route
            </h4>
            {renderMarkdown(aiAdvice)}
          </div>
        )}

        {/* AI Study Coach Continuous Chat Interface */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-slate-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Consult Coach Advisor (Continuous Dialogue)
            </h4>
          </div>

          {/* Coach Chat logs container */}
          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
            {chatHistory.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gold-border/40 rounded-xl bg-gold-input/30">
                <p className="text-xs text-slate-500 italic font-serif">
                  No active advisory questions logged yet. Ask how to tackle hard deadlines or design custom summaries.
                </p>
              </div>
            ) : (
              chatHistory.map((chat, idx) => (
                <div
                  key={idx}
                  className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                      chat.role === "user"
                        ? "bg-gold-accent text-black font-medium rounded-tr-none shadow"
                        : "bg-gold-input text-slate-200 border border-gold-border rounded-tl-none"
                    }`}
                  >
                    {chat.role === "coach" ? (
                      <div className="space-y-1">{renderMarkdown(chat.content)}</div>
                    ) : (
                      chat.content
                    )}
                  </div>
                </div>
              ))
            )}

            {aiLoading && customQuestion === "" && chatHistory.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-gold-input border border-gold-border rounded-xl rounded-tl-none px-4 py-2 flex items-center gap-1.5 text-gold-accent/70">
                  <span className="w-1.5 h-1.5 bg-gold-accent rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-gold-accent rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-gold-accent rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
          </div>

          {/* Chat input controls */}
          <form
            onSubmit={(e) => handleFetchPlannerAdvice(e, true)}
            className="flex gap-2"
          >
            <input
              id="coach-advisor-input"
              type="text"
              placeholder="Ask: 'Which tasks should I target first to preserve my streak?' or seek time advice..."
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              className="flex-grow text-xs px-3.5 py-3 rounded-xl border border-gold-border bg-gold-input text-gold-text focus:outline-none focus:ring-1.5 focus:ring-gold-accent"
            />
            <button
              id="coach-advisor-submit"
              type="submit"
              disabled={aiLoading || !customQuestion.trim()}
              className="p-3 bg-gold-accent hover:bg-gold-hover text-black font-bold rounded-xl transition disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
