import React, { useState, useEffect } from "react";
import { Shield, Lock, Unlock, Key, RefreshCw, Copy, Check, Upload, AlertCircle, Cloud, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { initAuth, googleSignIn, logout, findOrCreateFolder, uploadOrUpdateFile } from "../utils/googleDrive";
import { User } from "firebase/auth";
import { FolderItem, DocumentItem } from "../types";

interface SecurityPanelProps {
  onExportSync: () => string;
  onImportSync: (syncStr: string) => boolean;
  folders: FolderItem[];
  documents: DocumentItem[];
}

export default function SecurityPanel({
  onExportSync,
  onImportSync,
  folders,
  documents,
}: SecurityPanelProps) {
  const [importStr, setImportStr] = useState("");
  const [copied, setCopied] = useState(false);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Google Drive state
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [isDriveConnecting, setIsDriveConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);

  // Initialize Drive Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setDriveUser(currentUser);
        setDriveToken(accessToken);
      },
      () => {
        setDriveUser(null);
        setDriveToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleConnectDrive = async () => {
    setIsDriveConnecting(true);
    setSyncSuccess(null);
    setSyncLogs([]);
    setErrorMsg("");
    try {
      const result = await googleSignIn();
      if (result) {
        setDriveUser(result.user);
        setDriveToken(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Google Drive connection failed. Please allow popups.");
    } finally {
      setIsDriveConnecting(false);
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      await logout();
      setDriveUser(null);
      setDriveToken(null);
      setSyncLogs([]);
      setSyncSuccess(null);
    } catch (err: any) {
      setErrorMsg(err?.message || "Disconnection failed.");
    }
  };

  const handleSyncToDrive = async () => {
    if (!driveUser || isSyncing) return;
    setIsSyncing(true);
    setSyncSuccess(null);
    setSyncLogs(["Initializing Google Drive backup sync..."]);

    try {
      // 1. Find or create root folder "Last Minute Studies"
      setSyncLogs(prev => [...prev, "Checking 'Last Minute Studies' root folder on Google Drive..."]);
      const rootFolderId = await findOrCreateFolder("Last Minute Studies");
      setSyncLogs(prev => [...prev, `Root folder active (ID: ${rootFolderId.substring(0, 8)}...)`]);

      // 2. Map of localFolderId -> Google Drive Folder ID
      const folderMap: { [localId: string]: string } = {};

      // Sync folder structures
      setSyncLogs(prev => [...prev, `Preparing to sync ${folders.length} folder categories...`]);
      for (const folder of folders) {
        setSyncLogs(prev => [...prev, `Verifying folder: "${folder.name}"...`]);
        const gdFolderId = await findOrCreateFolder(folder.name, rootFolderId);
        folderMap[folder.id] = gdFolderId;
        setSyncLogs(prev => [...prev, `✓ Folder "${folder.name}" synced.`]);
      }

      // 3. Sync documents
      setSyncLogs(prev => [...prev, `Preparing to sync ${documents.length} educational documents...`]);
      let successCount = 0;
      for (const doc of documents) {
        setSyncLogs(prev => [...prev, `Syncing document: "${doc.title}"...`]);
        const parentId = doc.folderId ? folderMap[doc.folderId] : rootFolderId;
        
        // Build file content with metadata and tags for nice reading/portability
        const fileContent = `Title: ${doc.title}\nTags: ${doc.tags.join(", ") || "None"}\nCreated: ${new Date(doc.createdAt).toLocaleString()}\nUpdated: ${new Date(doc.updatedAt).toLocaleString()}\n\n---\n\n${doc.content}`;
        const fileName = `${doc.title}.txt`;

        const result = await uploadOrUpdateFile(fileName, fileContent, parentId);
        setSyncLogs(prev => [...prev, `✓ Document "${doc.title}" ${result.action} successfully.`]);
        successCount++;
      }

      setSyncLogs(prev => [...prev, `🎉 Synchronization fully complete! Synced ${successCount} documents.`]);
      setSyncSuccess(true);
    } catch (err: any) {
      console.error(err);
      setSyncLogs(prev => [...prev, `❌ Error during sync: ${err?.message || "Operation failed"}`]);
      setSyncSuccess(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopy = () => {
    const syncData = onExportSync();
    navigator.clipboard.writeText(syncData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setImportSuccess(null);
    setErrorMsg("");
    if (!importStr.trim()) {
      setErrorMsg("Please paste a valid sync code.");
      return;
    }
    const success = onImportSync(importStr);
    setImportSuccess(success);
    if (success) {
      setImportStr("");
    } else {
      setErrorMsg("Failed to parse or restore sync code.");
    }
  };

  return (
    <div id="security-panel" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gold-panel border border-gold-border rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 shadow-xl">
        <div className="p-3.5 bg-gold-card border border-gold-border/60 rounded-xl text-gold-accent self-start shadow-[0_0_15px_rgba(212,175,55,0.1)]">
          <Shield className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-serif italic text-gold-accent flex items-center gap-2">
            Backup, Synchronization & Cloud Portability Center
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Manage your study assets with complete sovereignty. Export local checkpoints to synchronize across multiple devices, or configure a direct sync to your personal Google Drive account.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cross-Platform Device Sync Center */}
        <div className="bg-gold-panel border border-gold-border rounded-2xl p-5 shadow-xl space-y-4">
          <div className="pb-3 border-b border-gold-border">
            <h3 className="font-serif italic text-base text-gold-accent flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-gold-accent" />
              Cross-Platform Device Sync
            </h3>
          </div>

          <div className="space-y-4">
            {/* Export */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Export Sync Backup
                </h4>
                <p className="text-[9px] text-slate-500 font-mono">
                  DESKTOP-P492 • SYNCED
                </p>
              </div>
              <p className="text-[11px] text-slate-400 mb-2.5 leading-relaxed font-serif italic">
                Generate a secure export backup payload. Copy this and paste it on your secondary device to restore your exact files and dashboard status.
              </p>
              <button
                id="generate-sync-code-btn"
                onClick={handleCopy}
                className="w-full text-xs bg-gold-input hover:bg-gold-card border border-gold-border rounded-lg py-2.5 px-3 text-slate-300 flex items-center justify-center gap-2 transition"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" /> Copied Sync Code!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-gold-accent" /> Generate & Copy Secure Sync Code
                  </>
                )}
              </button>
            </div>

            {/* Import */}
            <form onSubmit={handleImport} className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                  Import Sync Data
                </h4>
                <textarea
                  id="import-sync-textarea"
                  rows={2}
                  value={importStr}
                  onChange={(e) => setImportStr(e.target.value)}
                  placeholder="Paste your exported secure sync code here..."
                  className="w-full text-xs p-3 rounded-lg border border-gold-border bg-gold-input text-gold-text focus:outline-none focus:ring-1.5 focus:ring-gold-accent font-mono leading-relaxed"
                />
              </div>

              {importSuccess === true && (
                <div className="p-2.5 bg-emerald-950/20 text-emerald-400 text-xs rounded-lg border border-emerald-900/30 flex items-center gap-2">
                  <Check className="h-4 w-4 flex-shrink-0" />
                  <span>Sync Successful! All documents, schedules, and configurations loaded.</span>
                </div>
              )}

              {importSuccess === false && (
                <div className="p-2.5 bg-red-950/20 text-red-400 text-xs rounded-lg border border-red-900/30 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMsg || "Invalid sync payload format or password mismatch."}</span>
                </div>
              )}

              <button
                id="import-sync-btn"
                type="submit"
                className="w-full text-xs bg-gold-accent hover:bg-gold-hover text-black font-bold py-2.5 rounded-lg transition shadow"
              >
                <Upload className="h-3 w-3 inline mr-1 text-black" /> Import Sync Data
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Google Drive Personal Cloud Sync */}
      <div id="gdrive-sync-section" className="bg-gold-panel border border-gold-border rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-gold-border">
          <h3 className="font-serif italic text-base text-gold-accent flex items-center gap-2">
            <Cloud className="h-5 w-5 text-gold-accent" />
            Google Drive Personal Cloud Sync
          </h3>
          <span
            className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
              driveUser
                ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/40"
                : "bg-slate-950/20 text-slate-400 border border-slate-900/40"
            }`}
          >
            {driveUser ? "Connected" : "Disconnected"}
          </span>
        </div>

        {!driveUser ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-serif italic">
              Authenticate via secure Google OAuth to sync your folders, notes, and summaries directly to your personal Google Drive account. This establishes a "Last Minute Studies" directory containing your exact category structure and documents for off-grid access.
            </p>
            <button
              id="connect-gdrive-btn"
              onClick={handleConnectDrive}
              disabled={isDriveConnecting}
              className="text-xs bg-gold-accent hover:bg-gold-hover text-black font-bold py-2.5 px-6 rounded-lg transition shadow flex items-center gap-2 disabled:opacity-50"
            >
              {isDriveConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  Connecting to Drive...
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4 text-black" />
                  Connect Google Drive
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gold-card p-4 rounded-xl border border-gold-border">
              <div className="flex items-center gap-3">
                {driveUser.photoURL ? (
                  <img
                    src={driveUser.photoURL}
                    alt="Google avatar"
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full border border-gold-accent"
                  />
                ) : (
                  <div className="p-2 bg-gold-dark text-gold-accent rounded-full border border-gold-border">
                    <Cloud className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{driveUser.displayName || "Google Drive Account"}</h4>
                  <p className="text-[10px] text-slate-400 font-mono uppercase">{driveUser.email}</p>
                </div>
              </div>
              <button
                id="disconnect-gdrive-btn"
                onClick={handleDisconnectDrive}
                className="text-[10px] font-bold border border-red-900/40 hover:bg-red-950/20 text-red-400 py-1.5 px-3 rounded-lg transition"
              >
                Disconnect Account
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <p className="text-xs text-slate-400 leading-relaxed font-serif italic">
                  Pressing sync will replicate your local folder structure under your Google Drive's "Last Minute Studies" directory, and upload all plain text copies of your materials. Existing files with matching names will be automatically updated with latest local edits.
                </p>
                <button
                  id="sync-gdrive-now-btn"
                  onClick={handleSyncToDrive}
                  disabled={isSyncing}
                  className="w-full text-xs bg-gold-accent hover:bg-gold-hover text-black font-bold py-2.5 rounded-lg transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                      Synchronizing Assets...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 text-black" />
                      Sync Documents with Drive
                    </>
                  )}
                </button>
              </div>

              {/* Sync Live Log Console */}
              <div className="border border-gold-border rounded-xl bg-gold-input p-3 flex flex-col h-[150px]">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Sync Console Logs</span>
                  {isSyncing && <span className="text-emerald-500 animate-pulse font-mono lowercase">syncing...</span>}
                </h4>
                <div className="flex-grow overflow-y-auto font-mono text-[9px] text-slate-400 space-y-1 pr-1">
                  {syncLogs.length === 0 ? (
                    <p className="text-slate-600 italic">No sync logs available. Click Sync to begin.</p>
                  ) : (
                    syncLogs.map((log, index) => (
                      <p key={index} className={log.startsWith("✓") ? "text-emerald-400" : log.startsWith("❌") ? "text-red-400" : "text-slate-400"}>
                        {log}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
