import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  fetchDriveFiles, 
  fetchFileContent, 
  DriveFile 
} from "../utils/googleDrive";
import { FolderItem } from "../types";
import { 
  Cloud, 
  Search, 
  Loader2, 
  LogOut, 
  FileText, 
  Folder, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft, 
  Clock 
} from "lucide-react";

interface GoogleDriveImporterProps {
  folders: FolderItem[];
  onImportDoc: (title: string, content: string, folderId: string | null) => void;
  onClose: () => void;
}

export default function GoogleDriveImporter({ folders, onImportDoc, onClose }: GoogleDriveImporterProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch files when user is authenticated
  useEffect(() => {
    if (user && token) {
      loadFiles();
    }
  }, [user, token]);

  const loadFiles = async (isLoadMore: boolean = false) => {
    setIsLoadingFiles(true);
    setError(null);
    try {
      const response = await fetchDriveFiles(
        searchQuery, 
        isLoadMore ? nextPageToken : undefined
      );
      if (isLoadMore) {
        setFiles(prev => [...prev, ...response.files]);
      } else {
        setFiles(response.files);
      }
      setNextPageToken(response.nextPageToken);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load Google Drive files. Please try again.");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFiles();
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      setError(err?.message || "Google Authentication failed. Please verify popup permissions.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setFiles([]);
      setSelectedFile(null);
      setNeedsAuth(true);
    } catch (err: any) {
      setError(err?.message || "Logout failed.");
    }
  };

  const handleImportFile = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setError(null);
    setImportSuccess(null);

    try {
      const content = await fetchFileContent(selectedFile.id, selectedFile.mimeType);
      
      // Pass imported data to parent handler
      onImportDoc(selectedFile.name, content, targetFolderId);
      
      setImportSuccess(`Successfully imported "${selectedFile.name}" into study materials!`);
      setSelectedFile(null);
      
      // Auto-dismiss success message after 4 seconds
      setTimeout(() => {
        setImportSuccess(null);
      }, 4000);
    } catch (err: any) {
      setError(err?.message || "Could not retrieve the file content.");
    } finally {
      setIsImporting(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/vnd.google-apps.folder") {
      return <Folder className="h-4 w-4 text-amber-500" />;
    }
    if (mimeType === "application/vnd.google-apps.document" || mimeType.startsWith("text/")) {
      return <FileText className="h-4 w-4 text-blue-400" />;
    }
    return <FileText className="h-4 w-4 text-slate-400" />;
  };

  const getReadableType = (mimeType: string) => {
    if (mimeType === "application/vnd.google-apps.document") return "Google Doc";
    if (mimeType === "text/plain") return "Plain Text";
    if (mimeType === "text/markdown") return "Markdown File";
    if (mimeType === "application/pdf") return "PDF File (Conversion Required)";
    return "Other File Type";
  };

  const isSupportedType = (mimeType: string) => {
    return (
      mimeType === "application/vnd.google-apps.document" || 
      mimeType.startsWith("text/") || 
      mimeType === "application/json"
    );
  };

  return (
    <div className="flex flex-col h-full min-h-[480px]">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-gold-border pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-gold-card rounded-lg border border-gold-border text-slate-400 hover:text-slate-200 transition"
            title="Back to Documents"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h3 className="text-md font-serif italic text-gold-accent flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Google Drive Resource Hub
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              IMPORT HANDOUTS, SYLLABI, AND RESEARCH DIRECTLY
            </p>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[11px] font-semibold text-slate-300 truncate max-w-[150px]">
                {user.displayName || user.email}
              </span>
              <span className="text-[9px] font-mono text-emerald-500">
                CONNECTED
              </span>
            </div>
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt="Avatar" 
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full border border-gold-accent/40"
              />
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-red-950/40 hover:text-red-400 text-slate-400 rounded-lg border border-gold-border/60 transition"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main interface body */}
      {needsAuth ? (
        <div className="flex-grow flex flex-col items-center justify-center py-12 text-center px-4">
          <div className="p-4 bg-gold-card border border-gold-border rounded-full text-gold-accent mb-4 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
            <Cloud className="h-8 w-8 animate-pulse" />
          </div>
          <h4 className="text-md font-serif italic text-gold-accent">Connect to Google Drive</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed mb-6">
            Import your classroom notes, syllabus, reference materials, or essays seamlessly to enable study guides, custom flashcards, and concept synthesis.
          </p>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="gsi-material-button hover:shadow-[0_0_12px_rgba(212,175,55,0.15)] transition-all duration-300"
            id="gsi-drive-signin-btn"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">Sign in with Google</span>
            </div>
          </button>
          
          {isLoggingIn && (
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-mono">
              <Loader2 className="h-4 w-4 animate-spin text-gold-accent" />
              AWAITING OAUTH COMPLETION...
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-grow">
          {/* File listing column */}
          <div className="lg:col-span-7 flex flex-col gap-3 min-h-[350px]">
            {/* Search filter form */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search files in Google Drive..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gold-border bg-gold-input text-gold-text focus:outline-none focus:ring-1 focus:ring-gold-accent"
                />
              </div>
              <button
                type="submit"
                className="bg-gold-card hover:bg-gold-card/80 border border-gold-border px-3 py-2 rounded-lg text-xs font-semibold text-gold-accent transition"
              >
                Search
              </button>
            </form>

            {/* Error notifications */}
            {error && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-[11px] text-red-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Notification */}
            {importSuccess && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-xl text-[11px] text-emerald-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}

            {/* Files List container */}
            <div className="border border-gold-border rounded-xl bg-gold-input p-2 flex-grow overflow-y-auto max-h-[300px] min-h-[220px]">
              {isLoadingFiles ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500 font-mono text-[11px]">
                  <Loader2 className="h-6 w-6 animate-spin text-gold-accent" />
                  RETRIEVING STUDY RESOURCES...
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 italic text-xs font-serif">
                  No compatible study files found on Google Drive.
                </div>
              ) : (
                <div className="space-y-1">
                  {files.map((file) => {
                    const supported = isSupportedType(file.mimeType);
                    const isSelected = selectedFile?.id === file.id;

                    return (
                      <button
                        key={file.id}
                        onClick={() => {
                          if (supported) {
                            setSelectedFile(file);
                          } else {
                            setError(`"${file.name}" requires conversion. Currently, plain text, markdown, and Google Docs formats are supported directly.`);
                          }
                        }}
                        className={`w-full flex items-center justify-between text-left p-2.5 rounded-lg text-xs transition ${
                          isSelected 
                            ? "bg-gold-card border border-gold-border text-gold-text shadow-sm" 
                            : !supported 
                              ? "opacity-40 hover:opacity-60 cursor-not-allowed" 
                              : "hover:bg-gold-card/30 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate max-w-[70%]">
                          {getFileIcon(file.mimeType)}
                          <span className="truncate font-medium">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <span>{getReadableType(file.mimeType)}</span>
                          {file.modifiedTime && (
                            <span className="hidden sm:inline">
                              • {new Date(file.modifiedTime).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {nextPageToken && (
                    <button
                      onClick={() => loadFiles(true)}
                      className="w-full text-center py-2 text-[11px] text-gold-accent hover:text-gold-hover font-mono uppercase"
                    >
                      Load More Files
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Side importing/review column */}
          <div className="lg:col-span-5 flex flex-col justify-between border border-gold-border bg-gold-panel p-4 rounded-xl min-h-[300px]">
            {selectedFile ? (
              <div className="flex flex-col gap-4 h-full justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gold-accent uppercase tracking-wider mb-2 border-b border-gold-border pb-1">
                    Selected Resource
                  </h4>
                  <div className="flex items-start gap-2 bg-gold-card/50 p-3 rounded-lg border border-gold-border">
                    <FileText className="h-5 w-5 text-gold-accent mt-0.5 flex-shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-200 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">
                        {getReadableType(selectedFile.mimeType)}
                      </p>
                      {selectedFile.size && (
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                          SIZE: {(parseInt(selectedFile.size) / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                      Target Study Folder
                    </label>
                    <select
                      value={targetFolderId || ""}
                      onChange={(e) => setTargetFolderId(e.target.value || null)}
                      className="w-full text-xs p-2.5 rounded-lg border border-gold-border bg-gold-input text-gold-text focus:outline-none"
                    >
                      <option value="">Root / Uncategorized</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gold-border">
                  <button
                    onClick={handleImportFile}
                    disabled={isImporting}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold bg-gold-accent hover:bg-gold-hover text-black py-2.5 rounded-xl transition duration-300 shadow-[0_4px_12px_rgba(212,175,55,0.15)] disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                        Downloading Asset...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Import to Study Material
                      </>
                    )}
                  </button>
                  <p className="text-[9px] text-slate-500 text-center mt-2 font-mono">
                    AUTOSAVED SECURELY IN ENCRYPTED DATABASE
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                <Cloud className="h-8 w-8 text-gold-accent/40 mb-2 animate-pulse" />
                <h5 className="text-xs font-semibold text-slate-300">No Resource Selected</h5>
                <p className="text-[10px] text-slate-500 max-w-xs mt-1">
                  Click a compatible file on the left (Google Doc, Plain Text, or Markdown) to configure and import.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
