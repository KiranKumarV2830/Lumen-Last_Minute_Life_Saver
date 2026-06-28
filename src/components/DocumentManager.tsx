import React, { useState } from "react";
import { FolderItem, DocumentItem } from "../types";
import { Folder, FileText, Plus, FolderPlus, Tag, Trash2, Search, Edit3, Eye, FileUp, Hash, Cloud, Sparkles, Loader2 } from "lucide-react";
import GoogleDriveImporter from "./GoogleDriveImporter";

interface DocumentManagerProps {
  documents: DocumentItem[];
  folders: FolderItem[];
  selectedDocId: string | null;
  activeFolderId: string | null;
  selectedTag: string | null;
  onSelectDoc: (id: string) => void;
  onSelectFolder: (id: string | null) => void;
  onSelectTag: (tag: string | null) => void;
  onCreateFolder: (name: string) => void;
  onCreateDoc: (title: string, content: string, folderId: string | null) => void;
  onUpdateDoc: (id: string, updates: Partial<DocumentItem>) => void;
  onDeleteDoc: (id: string) => void;
  onStartStudyMode: (mode: "SUMMARY" | "QUIZ" | "CHAT" | "ANALYSIS") => void;
}

export default function DocumentManager({
  documents,
  folders,
  selectedDocId,
  activeFolderId,
  selectedTag,
  onSelectDoc,
  onSelectFolder,
  onSelectTag,
  onCreateFolder,
  onCreateDoc,
  onUpdateDoc,
  onDeleteDoc,
  onStartStudyMode,
}: DocumentManagerProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [showGoogleDrive, setShowGoogleDrive] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  // Filter documents based on active folder, tag, and search query
  const filteredDocs = documents.filter((doc) => {
    const matchesFolder = activeFolderId === null || doc.folderId === activeFolderId;
    const matchesTag = selectedTag === null || doc.tags.includes(selectedTag);
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesTag && matchesSearch;
  });

  // Extract all unique tags
  const allTags = Array.from(new Set(documents.flatMap((doc) => doc.tags)));

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
    }
  };

  const handleCreateDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDocTitle.trim()) {
      onCreateDoc(newDocTitle.trim(), "Enter your study material or copy-paste text notes here...", activeFolderId);
      setNewDocTitle("");
    }
  };

  const startEditing = () => {
    if (selectedDoc) {
      setEditedTitle(selectedDoc.title);
      setEditedContent(selectedDoc.content);
      setIsEditing(true);
    }
  };

  const saveEdits = () => {
    if (selectedDoc) {
      onUpdateDoc(selectedDoc.id, {
        title: editedTitle,
        content: editedContent,
        updatedAt: Date.now(),
      });
      setIsEditing(false);
    }
  };

  const handleRefineWithGemini = async () => {
    if (!editedContent.trim() || isRefining) return;
    setIsRefining(true);
    try {
      const response = await fetch("/api/study/refine-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
      });
      if (!response.ok) throw new Error("Could not refine material.");
      const data = await response.json();
      setEditedContent(data.refined);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to refine notes with Gemini.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDoc && newTagInput.trim()) {
      const normalizedTag = newTagInput.trim().toLowerCase();
      if (!selectedDoc.tags.includes(normalizedTag)) {
        onUpdateDoc(selectedDoc.id, {
          tags: [...selectedDoc.tags, normalizedTag],
        });
      }
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (selectedDoc) {
      onUpdateDoc(selectedDoc.id, {
        tags: selectedDoc.tags.filter((t) => t !== tagToRemove),
      });
    }
  };

  return (
    <div id="document-manager-layout" className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[550px]">
      {/* LEFT: Sidebar Navigator (Folders, Tags, Quick Add) */}
      <div className="md:col-span-4 bg-gold-panel border border-gold-border rounded-2xl p-4 shadow-xl flex flex-col gap-5">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            id="doc-search-input"
            type="text"
            placeholder="Search study assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-lg border border-gold-border bg-gold-input text-gold-text focus:outline-none focus:ring-1.5 focus:ring-gold-accent"
          />
        </div>

        {/* Folders */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Folders
            </span>
          </div>

          <div className="space-y-1">
            <button
              id="folder-all-btn"
              onClick={() => {
                onSelectFolder(null);
                onSelectTag(null);
                setShowGoogleDrive(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                activeFolderId === null && selectedTag === null && !showGoogleDrive
                  ? "bg-gold-card text-gold-accent border border-gold-border/60 shadow-[0_0_8px_rgba(212,175,55,0.05)]"
                  : "text-slate-400 hover:bg-gold-card/40 hover:text-slate-200"
              }`}
            >
              <Folder className="h-4 w-4 flex-shrink-0" />
              <span>All Documents</span>
              <span className="ml-auto text-[10px] bg-gold-input border border-gold-border px-1.5 py-0.5 rounded text-slate-400 font-mono">
                {documents.length}
              </span>
            </button>

            {/* Google Drive Hub Trigger */}
            <button
              id="google-drive-hub-btn"
              onClick={() => {
                setShowGoogleDrive(true);
                onSelectFolder(null);
                onSelectTag(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border ${
                showGoogleDrive
                  ? "bg-gold-card text-gold-accent border-gold-border/60 shadow-[0_0_8px_rgba(212,175,55,0.05)]"
                  : "border-gold-accent/20 bg-gradient-to-r from-gold-accent/10 to-transparent text-gold-accent hover:from-gold-accent/20"
              }`}
            >
              <Cloud className="h-4 w-4 text-gold-accent flex-shrink-0" />
              <span>Google Drive Hub</span>
              <span className="ml-auto text-[9px] bg-gold-accent/20 px-1.5 py-0.5 rounded text-gold-accent font-mono">
                Cloud
              </span>
            </button>

            {folders.map((folder) => {
              const count = documents.filter((d) => d.folderId === folder.id).length;
              return (
                <button
                  key={folder.id}
                  id={`folder-btn-${folder.id}`}
                  onClick={() => {
                    onSelectFolder(folder.id);
                    onSelectTag(null);
                    setShowGoogleDrive(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                    activeFolderId === folder.id && !showGoogleDrive
                      ? "bg-gold-card text-gold-accent border border-gold-border/60 shadow-[0_0_8px_rgba(212,175,55,0.05)]"
                      : "text-slate-400 hover:bg-gold-card/40 hover:text-slate-200"
                  }`}
                >
                  <Folder className="h-4 w-4 text-gold-accent/70 flex-shrink-0" />
                  <span className="truncate">{folder.name}</span>
                  <span className="ml-auto text-[10px] bg-gold-input border border-gold-border px-1.5 py-0.5 rounded text-slate-400 font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Create Folder Form */}
          <form onSubmit={handleCreateFolder} className="flex gap-1.5 mt-2 pt-1">
            <input
              id="new-folder-input"
              type="text"
              placeholder="New folder..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-grow px-2.5 py-1.5 text-xs rounded border border-gold-border bg-gold-input text-gold-text focus:outline-none focus:ring-1 focus:ring-gold-accent"
            />
            <button
              id="create-folder-submit"
              type="submit"
              className="p-1.5 bg-gold-card border border-gold-border hover:bg-gold-accent hover:text-black rounded transition text-gold-accent flex items-center justify-center"
              title="Add Folder"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-gold-border">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
              Custom Tags
            </span>
            <div className="flex flex-wrap gap-1.5 p-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  id={`tag-filter-btn-${tag}`}
                  onClick={() => {
                    onSelectTag(selectedTag === tag ? null : tag);
                    setShowGoogleDrive(false);
                  }}
                  className={`text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all duration-200 ${
                    selectedTag === tag && !showGoogleDrive
                      ? "bg-gold-accent text-black border-gold-accent font-semibold"
                      : "bg-gold-card border-gold-border text-slate-400 hover:text-gold-accent hover:border-gold-accent/40"
                  }`}
                >
                  <Hash className="h-2.5 w-2.5" />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Document List in Folder */}
        <div className="space-y-2 pt-3 border-t border-gold-border flex-grow overflow-y-auto max-h-[220px]">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Documents
            </span>
          </div>

          <div className="space-y-1">
            {filteredDocs.length === 0 ? (
              <p className="text-[11px] text-slate-500 text-center py-4 font-serif italic">
                No documents in this folder.
              </p>
            ) : (
              filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={`group flex items-center justify-between rounded-lg p-2 text-xs transition-all duration-200 ${
                    selectedDocId === doc.id && !showGoogleDrive
                      ? "bg-gold-card border border-gold-border text-gold-text font-medium"
                      : "text-slate-400 hover:bg-gold-card/30 hover:text-slate-200"
                  }`}
                >
                  <button
                    id={`doc-select-btn-${doc.id}`}
                    onClick={() => {
                      onSelectDoc(doc.id);
                      setShowGoogleDrive(false);
                    }}
                    className="flex items-center gap-2 text-left truncate flex-grow mr-2"
                  >
                    <FileText className="h-4 w-4 text-gold-accent/60 flex-shrink-0" />
                    <span className="truncate">{doc.title}</span>
                  </button>
                  {doc.id !== "default-last-minute" && (
                    <button
                      id={`doc-delete-btn-${doc.id}`}
                      onClick={() => onDeleteDoc(doc.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 rounded transition flex-shrink-0"
                      title="Delete document"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Create Document Form */}
          <form onSubmit={handleCreateDoc} className="flex gap-1.5 mt-2 pt-1">
            <input
              id="new-doc-input"
              type="text"
              placeholder="New study file..."
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              className="flex-grow px-2.5 py-1.5 text-xs rounded border border-gold-border bg-gold-input text-gold-text focus:outline-none focus:ring-1 focus:ring-gold-accent"
            />
            <button
              id="create-doc-submit"
              type="submit"
              className="p-1.5 bg-gold-card border border-gold-border hover:bg-gold-accent hover:text-black rounded transition text-gold-accent flex items-center justify-center"
              title="Add document"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT: Selected Document Active Editor & AI Portal */}
      <div className="md:col-span-8 bg-gold-panel border border-gold-border rounded-2xl p-5 shadow-xl flex flex-col gap-5">
        {showGoogleDrive ? (
          <GoogleDriveImporter
            folders={folders}
            onImportDoc={(title, content, folderId) => {
              onCreateDoc(title, content, folderId);
              setShowGoogleDrive(false);
            }}
            onClose={() => setShowGoogleDrive(false)}
          />
        ) : selectedDoc ? (
          <>
            {/* Header / Meta Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gold-border">
              <div>
                {isEditing ? (
                  <input
                    id="edit-doc-title-input"
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-lg font-serif italic text-gold-accent bg-gold-input px-3 py-1 rounded border border-gold-border focus:outline-none focus:ring-1 focus:ring-gold-accent"
                  />
                ) : (
                  <h3 className="text-xl font-serif italic text-gold-accent flex items-center gap-2.5">
                    <FileText className="h-5 w-5 text-gold-accent" />
                    {selectedDoc.title}
                  </h3>
                )}
                <span className="text-[10px] text-slate-500 font-mono mt-1.5 block">
                  LAST UPDATED: {new Date(selectedDoc.updatedAt).toLocaleString().toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      id="ai-refine-doc-btn"
                      disabled={isRefining}
                      onClick={handleRefineWithGemini}
                      className="text-xs bg-gold-card hover:bg-gold-input border border-gold-border text-gold-accent hover:text-gold-accent font-semibold px-3 py-2 rounded-lg transition flex items-center gap-1.5 disabled:opacity-60"
                      title="Polishes spelling, adds headings & bullet points with Gemini"
                    >
                      {isRefining ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-gold-accent" />
                          Refining Draft...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 text-gold-accent" />
                          AI Auto-Refine
                        </>
                      )}
                    </button>
                    <button
                      id="save-doc-edits-btn"
                      onClick={saveEdits}
                      className="text-xs bg-gold-accent hover:bg-gold-hover text-black font-bold px-3 py-2 rounded-lg transition duration-200"
                    >
                      Save Changes
                    </button>
                  </div>
                ) : (
                  selectedDoc.id !== "default-last-minute" && (
                    <button
                      id="start-doc-edit-btn"
                      onClick={startEditing}
                      className="text-xs bg-gold-card hover:bg-gold-card/80 border border-gold-border text-gold-text px-3 py-2 rounded-lg transition flex items-center gap-1.5"
                    >
                      <Edit3 className="h-3 w-3 text-gold-accent" /> Edit Material
                    </button>
                  )
                )}
              </div>
            </div>

            {/* AI Interactive Modes Quick Launches */}
            <div className="bg-gradient-to-r from-gold-card to-gold-input border border-gold-border rounded-xl p-4">
              <h4 className="text-[10px] font-bold text-gold-accent uppercase tracking-widest mb-3 flex items-center gap-1.5">
                ⚡ Proactive AI Study Launchpad
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  id="study-launch-summarize"
                  onClick={() => onStartStudyMode("SUMMARY")}
                  className="bg-gold-panel hover:border-gold-accent hover:text-gold-accent text-xs text-slate-300 py-2.5 px-3 rounded-lg border border-gold-border shadow-sm transition-all duration-300 font-medium flex flex-col items-center gap-1"
                >
                  📝 Summarize
                </button>
                <button
                  id="study-launch-analyze"
                  onClick={() => onStartStudyMode("ANALYSIS")}
                  className="bg-gold-panel hover:border-gold-accent hover:text-gold-accent text-xs text-slate-300 py-2.5 px-3 rounded-lg border border-gold-border shadow-sm transition-all duration-300 font-medium flex flex-col items-center gap-1"
                >
                  💡 Concept Analysis
                </button>
                <button
                  id="study-launch-quiz"
                  onClick={() => onStartStudyMode("QUIZ")}
                  className="bg-gold-panel hover:border-gold-accent hover:text-gold-accent text-xs text-slate-300 py-2.5 px-3 rounded-lg border border-gold-border shadow-sm transition-all duration-300 font-medium flex flex-col items-center gap-1"
                >
                  ❓ Start Quiz
                </button>
                <button
                  id="study-launch-chat"
                  onClick={() => onStartStudyMode("CHAT")}
                  className="bg-gold-panel hover:border-gold-accent hover:text-gold-accent text-xs text-slate-300 py-2.5 px-3 rounded-lg border border-gold-border shadow-sm transition-all duration-300 font-medium flex flex-col items-center gap-1"
                >
                  💬 Chat Guide
                </button>
              </div>
            </div>

            {/* Document Contents */}
            <div className="flex-grow flex flex-col">
              {isEditing ? (
                <textarea
                  id="edit-doc-textarea"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full flex-grow text-xs p-3.5 rounded-lg border border-gold-border bg-gold-input text-gold-text focus:outline-none min-h-[250px] font-sans leading-relaxed"
                />
              ) : (
                <div className="w-full flex-grow text-xs p-4 bg-gold-input border border-gold-border rounded-xl overflow-y-auto max-h-[300px] leading-relaxed text-slate-300 whitespace-pre-wrap font-sans">
                  {selectedDoc.content}
                </div>
              )}
            </div>

            {/* Tags Tray for the Document */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gold-border">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-1">
                  Tags:
                </span>
                {selectedDoc.tags.length === 0 ? (
                  <span className="text-[10px] text-slate-500 italic font-serif">No tags applied yet.</span>
                ) : (
                  selectedDoc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] bg-gold-card border border-gold-border/60 text-slate-300 px-2.5 py-0.5 rounded-md flex items-center gap-1 font-mono uppercase tracking-tighter"
                    >
                      {tag}
                      <button
                        id={`remove-tag-btn-${tag}`}
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-500 hover:text-red-400 font-bold ml-1 text-[8px]"
                        title="Remove tag"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add Tag */}
              <form onSubmit={handleAddTag} className="flex gap-1.5">
                <input
                  id="add-tag-input"
                  type="text"
                  placeholder="New tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className="px-2.5 py-1 text-[10px] rounded border border-gold-border bg-gold-input text-gold-text focus:outline-none focus:ring-1 focus:ring-gold-accent"
                />
                <button
                  id="add-tag-submit"
                  type="submit"
                  className="px-2.5 py-1 bg-gold-accent hover:bg-gold-hover text-black text-[10px] font-bold rounded transition"
                >
                  +
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-gold-card border border-gold-border rounded-full text-gold-accent mb-4 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
              <FileUp className="h-10 w-10 animate-bounce" />
            </div>
            <h3 className="font-serif italic text-lg text-gold-accent">No Document Selected</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
              Choose a folder, click on a study file on the left sidebar, or create a custom file to get started with analysis and summaries.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
