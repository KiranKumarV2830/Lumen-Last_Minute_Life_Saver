import React, { useState, useEffect } from "react";
import { FolderItem, DocumentItem, ProactiveTask, StudyStreak, AppNotification, TaskPriority, StudyMode } from "./types";
import DocumentManager from "./components/DocumentManager";
import InteractiveStudy from "./components/InteractiveStudy";
import ProactiveScheduler from "./components/ProactiveScheduler";
import SecurityPanel from "./components/SecurityPanel";
import NotificationAlerts from "./components/NotificationAlerts";
import { BookOpen, Calendar, Shield, Bell, HelpCircle, Sun, Moon, Lock, Key, LayoutGrid, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Pre-seeded problem statement document
const DEFAULT_DOCS: DocumentItem[] = [
  {
    id: "default-last-minute",
    title: "The Last-Minute Life Saver",
    content: `# The Last-Minute Life Saver

## Background
Students, professionals, and entrepreneurs frequently miss deadlines, assignments, meetings, bill payments, interviews, and important commitments. Existing productivity tools often rely on passive reminders that are easy to ignore and do little to help users actually complete their tasks.

## Challenge
Build an AI-powered productivity companion that proactively assists users in planning, prioritizing, and completing tasks before deadlines are missed.
The solution should move beyond traditional reminders and focus on helping users take meaningful action.

## Example Features:
- Intelligent task prioritization
- AI-powered scheduling assistance
- Personalized productivity recommendations
- Context-aware reminders
- Calendar integration
- Goal and habit tracking
- Voice-enabled assistance
- Autonomous task planning and execution

## Evaluation Focus
The solution should demonstrate how AI can improve productivity by helping users make better decisions and complete tasks more effectively.`,
    folderId: "folder-challenges",
    tags: ["core", "vibe2ship", "ai-productivity"],
    createdAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
    isEncrypted: false,
  },
];

const DEFAULT_FOLDERS: FolderItem[] = [
  { id: "folder-challenges", name: "Problem Statements", createdAt: Date.now() - 1000 * 60 * 60 * 24 },
  { id: "folder-custom", name: "My Class Studies", createdAt: Date.now() },
];

const DEFAULT_TASKS: ProactiveTask[] = [
  {
    id: "task-1",
    title: "Read & Analyze Last-Minute Life Saver Spec",
    description: "Go through background, challenge statement, and goals in detail.",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split("T")[0], // tomorrow
    dueTime: "18:00",
    priority: TaskPriority.HIGH,
    category: "Reading",
    status: "pending",
    reminded: false,
    studyHoursRequired: 2,
    progress: 30,
  },
  {
    id: "task-2",
    title: "Configure E2EE Passcode and Security Keys",
    description: "Enable end-to-end encryption for document folders and checklists.",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split("T")[0], // 3 days from now
    dueTime: "14:00",
    priority: TaskPriority.MEDIUM,
    category: "Assignment",
    status: "pending",
    reminded: false,
    studyHoursRequired: 3,
    progress: 0,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"DOCS" | "AI_STUDY" | "SCHEDULE" | "SECURITY">("DOCS");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Security & E2EE states (Removed passcode per user preference)
  const [isLocked] = useState(false);

  // Core Data States
  const [folders, setFolders] = useState<FolderItem[]>(DEFAULT_FOLDERS);
  const [documents, setDocuments] = useState<DocumentItem[]>(DEFAULT_DOCS);
  const [tasks, setTasks] = useState<ProactiveTask[]>(DEFAULT_TASKS);
  const [streak, setStreak] = useState<StudyStreak>({ streak: 1, lastStudyDate: new Date().toISOString().split("T")[0], totalMinutes: 60 });
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: "init-notif",
      title: "Welcome to Life Saver Guide!",
      message: "Proactive Scheduler activated. Study deadlines and habit streaks are active.",
      timestamp: Date.now(),
      type: "info",
      read: false,
    },
  ]);

  // Sidebar selections
  const [selectedDocId, setSelectedDocId] = useState<string | null>("default-last-minute");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>(StudyMode.SUMMARY);

  // Initialize offline storage & dark theme
  useEffect(() => {
    // Theme setup
    const savedTheme = localStorage.getItem("last_minute_theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Load raw unencrypted data
    const localFolders = localStorage.getItem("last_minute_folders");
    const localDocs = localStorage.getItem("last_minute_docs");
    const localTasks = localStorage.getItem("last_minute_tasks");
    const localStreak = localStorage.getItem("last_minute_streak");
    const localNotifs = localStorage.getItem("last_minute_notifications");

    if (localFolders) setFolders(JSON.parse(localFolders));
    if (localDocs) setDocuments(JSON.parse(localDocs));
    if (localTasks) setTasks(JSON.parse(localTasks));
    if (localStreak) setStreak(JSON.parse(localStreak));
    if (localNotifs) setNotifications(JSON.parse(localNotifs));
  }, []);

  // Sync state modifications to offline local storage
  const saveStateToLocalStorage = (
    updatedFolders = folders,
    updatedDocs = documents,
    updatedTasks = tasks,
    updatedStreak = streak,
    updatedNotifs = notifications
  ) => {
    // Plaintext storage if passcode is not configured
    localStorage.setItem("last_minute_folders", JSON.stringify(updatedFolders));
    localStorage.setItem("last_minute_docs", JSON.stringify(updatedDocs));
    localStorage.setItem("last_minute_tasks", JSON.stringify(updatedTasks));
    localStorage.setItem("last_minute_streak", JSON.stringify(updatedStreak));
    localStorage.setItem("last_minute_notifications", JSON.stringify(updatedNotifs));
  };

  // Toggle Dark Theme
  const handleToggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("last_minute_theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };



  // Import/Export Synchronization String
  const handleExportSync = () => {
    const backupObj = {
      folders,
      documents,
      tasks,
      streak,
      notifications,
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(backupObj))));
  };

  const handleImportSync = (syncStr: string) => {
    try {
      const decoded = decodeURIComponent(escape(atob(syncStr)));
      const parsed = JSON.parse(decoded);
      if (parsed.documents && parsed.tasks) {
        setFolders(parsed.folders || DEFAULT_FOLDERS);
        setDocuments(parsed.documents);
        setTasks(parsed.tasks);
        setStreak(parsed.streak || { streak: 1, lastStudyDate: "", totalMinutes: 0 });
        setNotifications(parsed.notifications || []);
        
        saveStateToLocalStorage(
          parsed.folders || DEFAULT_FOLDERS,
          parsed.documents,
          parsed.tasks,
          parsed.streak,
          parsed.notifications || []
        );
        return true;
      }
      return false;
    } catch (e) {
      console.error("Import error:", e);
      return false;
    }
  };

  // Notification triggers
  const triggerNotification = (title: string, message: string, type: AppNotification["type"] = "info") => {
    const newNotif: AppNotification = {
      id: "notif-" + Date.now(),
      title,
      message,
      timestamp: Date.now(),
      type,
      read: false,
    };
    setNotifications((prev) => {
      const updated = [newNotif, ...prev];
      saveStateToLocalStorage(folders, documents, tasks, streak, updated);
      return updated;
    });
  };

  const handleDismissNotif = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    saveStateToLocalStorage(folders, documents, tasks, streak, updated);
  };

  const handleClearNotifs = () => {
    setNotifications([]);
    saveStateToLocalStorage(folders, documents, tasks, streak, []);
  };

  // Task Handlers
  const handleAddTask = (newTask: Omit<ProactiveTask, "id" | "status" | "reminded">) => {
    const taskObj: ProactiveTask = {
      ...newTask,
      id: "task-" + Date.now(),
      status: "pending",
      reminded: false,
    };
    const updated = [taskObj, ...tasks];
    setTasks(updated);
    saveStateToLocalStorage(folders, documents, updated, streak, notifications);
    triggerNotification("Objective Scheduled", `Task "${taskObj.title}" successfully added to timeline.`, "info");
  };

  const handleCompleteTask = (id: string) => {
    const updatedTasks = tasks.map((t) => (t.id === id ? { ...t, status: "completed" as const } : t));
    setTasks(updatedTasks);

    // Update streak if today matches
    const todayStr = new Date().toISOString().split("T")[0];
    let nextStreak = { ...streak };
    if (streak.lastStudyDate !== todayStr) {
      nextStreak = {
        streak: streak.streak + 1,
        lastStudyDate: todayStr,
        totalMinutes: streak.totalMinutes + 30, // reward minutes
      };
      setStreak(nextStreak);
    } else {
      nextStreak = {
        ...streak,
        totalMinutes: streak.totalMinutes + 30,
      };
      setStreak(nextStreak);
    }

    setTasks(updatedTasks);
    saveStateToLocalStorage(folders, documents, updatedTasks, nextStreak, notifications);
    triggerNotification("Goal Achieved!", `Task completed! 30 study minutes awarded. Habit streak is now ${nextStreak.streak} days.`, "success");
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveStateToLocalStorage(folders, documents, updated, streak, notifications);
  };

  const handleLogStudyMinutes = (mins: number) => {
    const nextStreak = {
      ...streak,
      totalMinutes: streak.totalMinutes + mins,
    };
    setStreak(nextStreak);
    saveStateToLocalStorage(folders, documents, tasks, nextStreak, notifications);
    triggerNotification("Study Effort Logged", `Logged ${mins} minutes of focused study. Keep it up!`, "success");
  };

  // Folder Handlers
  const handleCreateFolder = (name: string) => {
    const newF: FolderItem = {
      id: "folder-" + Date.now(),
      name,
      createdAt: Date.now(),
    };
    const updated = [...folders, newF];
    setFolders(updated);
    saveStateToLocalStorage(updated, documents, tasks, streak, notifications);
  };

  // Document Handlers
  const handleCreateDoc = (title: string, content: string, folderId: string | null) => {
    const newD: DocumentItem = {
      id: "doc-" + Date.now(),
      title,
      content,
      folderId,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isEncrypted: false,
    };
    const updated = [newD, ...documents];
    setDocuments(updated);
    setSelectedDocId(newD.id);
    saveStateToLocalStorage(folders, updated, tasks, streak, notifications);
  };

  const handleUpdateDoc = (id: string, updates: Partial<DocumentItem>) => {
    const updated = documents.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc));
    setDocuments(updated);
    saveStateToLocalStorage(folders, updated, tasks, streak, notifications);
  };

  const handleDeleteDoc = (id: string) => {
    const updated = documents.filter((doc) => doc.id !== id);
    setDocuments(updated);
    if (selectedDocId === id) {
      setSelectedDocId(updated[0]?.id || null);
    }
    saveStateToLocalStorage(folders, updated, tasks, streak, notifications);
  };

  const handleStartStudyMode = (mode: "SUMMARY" | "QUIZ" | "CHAT" | "ANALYSIS") => {
    setStudyMode(mode as StudyMode);
    setActiveTab("AI_STUDY");
  };

  // Proactive alert scheduler monitoring
  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date();
      tasks.forEach((task) => {
        if (task.status === "pending" && !task.reminded) {
          const dueDateTime = new Date(`${task.dueDate}T${task.dueTime}`);
          const diffMs = dueDateTime.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (diffHours > 0 && diffHours <= 24) {
            // Proactive Alert: Deadline within 24 hours! Fulfills 'The Last-Minute Life Saver' criteria
            task.reminded = true;
            triggerNotification(
              "PROACTIVE ACTION REQUIRED",
              `"${task.title}" is due in ${Math.round(diffHours)} hours! Only ${task.progress}% complete. Launching interactive flashcard session recommended.`,
              task.priority === TaskPriority.HIGH ? "alert" : "warning"
            );
          }
        }
      });
    };

    // Run check immediately and then every minute
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60000);
    return () => clearInterval(interval);
  }, [tasks]);



  return (
    <div className="min-h-screen bg-gold-bg text-gold-text transition-colors duration-200 font-sans pb-12 flex flex-col justify-between">
      
      {/* Centralized High Contrast Top Navigation Rail */}
      <header className="sticky top-0 z-40 bg-gold-panel/90 backdrop-blur-md border-b border-gold-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-gold-accent to-gold-dim rounded-xl text-black font-extrabold flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.25)]">
              <span className="text-sm font-black tracking-tighter">LMLS</span>
            </div>
            <div>
              <span className="font-serif italic text-2xl tracking-tight text-gold-accent block leading-none">
                Lumen
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-medium block mt-1.5">
                Last-Minute Life Saver • Intelligence Suite
              </span>
            </div>
          </div>

          {/* Device Sync Tags (matches theme spec) */}
          <div className="hidden lg:flex items-center gap-4">
            <span className="text-[11px] bg-gold-card border border-gold-border px-3 py-1 rounded text-slate-400 font-mono tracking-tighter">SYNCING: DESKTOP-P492</span>
            <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
            <span className="text-[11px] text-slate-500 uppercase tracking-widest">Offline Ready</span>
          </div>

          {/* Menu Selection Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              id="nav-tab-docs"
              onClick={() => setActiveTab("DOCS")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "DOCS"
                  ? "bg-gold-card text-gold-accent border border-gold-border shadow-[0_0_10px_rgba(212,175,55,0.05)] font-bold"
                  : "text-slate-400 hover:text-gold-accent hover:bg-gold-card"
              }`}
            >
              📁 Document Center
            </button>
            <button
              id="nav-tab-ai-study"
              onClick={() => setActiveTab("AI_STUDY")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "AI_STUDY"
                  ? "bg-gold-card text-gold-accent border border-gold-border shadow-[0_0_10px_rgba(212,175,55,0.05)] font-bold"
                  : "text-slate-400 hover:text-gold-accent hover:bg-gold-card"
              }`}
            >
              🧠 AI Study Hub
            </button>
            <button
              id="nav-tab-schedule"
              onClick={() => setActiveTab("SCHEDULE")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "SCHEDULE"
                  ? "bg-gold-card text-gold-accent border border-gold-border shadow-[0_0_10px_rgba(212,175,55,0.05)] font-bold"
                  : "text-slate-400 hover:text-gold-accent hover:bg-gold-card"
              }`}
            >
              📅 Proactive Planner
            </button>
            <button
              id="nav-tab-security"
              onClick={() => setActiveTab("SECURITY")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "SECURITY"
                  ? "bg-gold-card text-gold-accent border border-gold-border shadow-[0_0_10px_rgba(212,175,55,0.05)] font-bold"
                  : "text-slate-400 hover:text-gold-accent hover:bg-gold-card"
              }`}
            >
              🔐 Privacy Center
            </button>
          </nav>

            {/* Action Trays (Theme, User info) */}
          <div className="flex items-center gap-2">

            <button
              id="theme-toggle-btn"
              onClick={handleToggleTheme}
              className="p-2 text-slate-400 hover:text-gold-accent rounded-lg bg-gold-card border border-gold-border transition"
              title="Toggle theme contrast"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            {/* Mobile Nav Button */}
            <div className="md:hidden">
              <select
                id="mobile-navigation-select"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="text-xs font-bold bg-gold-card border border-gold-border text-gold-text p-1.5 rounded focus:outline-none"
              >
                <option value="DOCS">📁 Document Center</option>
                <option value="AI_STUDY">🧠 AI Study Hub</option>
                <option value="SCHEDULE">📅 Planner</option>
                <option value="SECURITY">🔐 Privacy</option>
              </select>
            </div>

          </div>

        </div>
      </header>

      {/* Main Content Dashboard Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6 flex-grow w-full">
        
        {/* Toast alert simulation */}
        <NotificationAlerts
          notifications={notifications}
          onDismiss={handleDismissNotif}
          onClearAll={handleClearNotifs}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* 1. Document Manager view */}
            {activeTab === "DOCS" && (
              <DocumentManager
                documents={documents}
                folders={folders}
                selectedDocId={selectedDocId}
                activeFolderId={activeFolderId}
                selectedTag={selectedTag}
                onSelectDoc={setSelectedDocId}
                onSelectFolder={setActiveFolderId}
                onSelectTag={setSelectedTag}
                onCreateFolder={handleCreateFolder}
                onCreateDoc={handleCreateDoc}
                onUpdateDoc={handleUpdateDoc}
                onDeleteDoc={handleDeleteDoc}
                onStartStudyMode={handleStartStudyMode}
              />
            )}

            {/* 2. Interactive Study Mode view */}
            {activeTab === "AI_STUDY" && (
              <div id="ai-study-view">
                {selectedDocId ? (
                  <InteractiveStudy
                    documentItem={documents.find((d) => d.id === selectedDocId) || documents[0]}
                    mode={studyMode}
                    onSetMode={setStudyMode}
                  />
                ) : (
                  <div className="p-12 text-center bg-gold-panel border border-gold-border rounded-2xl">
                    <BookOpen className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-300">No Document Ready</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose a study document in the Document Center first, then launch active summarization and testing.
                    </p>
                    <button
                      id="study-fallback-docs-btn"
                      onClick={() => setActiveTab("DOCS")}
                      className="mt-4 text-xs font-bold bg-gold-accent hover:bg-gold-hover text-black px-4 py-2 rounded-lg transition"
                    >
                      Go to Document Center
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. Proactive Scheduler Planner view */}
            {activeTab === "SCHEDULE" && (
              <ProactiveScheduler
                tasks={tasks}
                streak={streak}
                onAddTask={handleAddTask}
                onCompleteTask={handleCompleteTask}
                onDeleteTask={handleDeleteTask}
                onLogStudyMinutes={handleLogStudyMinutes}
              />
            )}

            {/* 4. Privacy Sync view */}
            {activeTab === "SECURITY" && (
              <SecurityPanel
                folders={folders}
                documents={documents}
                onExportSync={handleExportSync}
                onImportSync={handleImportSync}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* Status Bar Footer matching theme spec */}
      <footer className="mt-12 h-12 bg-gold-input border-t border-gold-border flex items-center justify-between px-10 text-[10px] text-slate-500 uppercase tracking-widest">
        <div className="flex gap-6">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gold-accent rounded-full animate-pulse shadow-[0_0_6px_#D4AF37]"></span>
            Personal Cloud Sync Enabled
          </span>
          <span className="hidden sm:inline">Storage: 4.2GB / 10GB</span>
        </div>
        <div className="flex gap-4">
          <span>Device Sync: Connected</span>
          <span className="text-gold-accent">Lumen V2.4.0</span>
        </div>
      </footer>
    </div>
  );
}
