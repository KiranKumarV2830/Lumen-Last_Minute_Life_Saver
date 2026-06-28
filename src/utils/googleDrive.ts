import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google OAuth provider with Google Drive scopes
export const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/drive.readonly");
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/drive");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup and retrieve OAuth token
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get Google OAuth access token.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Google login failed:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Return cached token
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Sign out and clear session cache
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Find or create folder in Google Drive
export const findOrCreateFolder = async (folderName: string, parentId?: string): Promise<string> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("User not authenticated or access token missing.");
  }

  const cleanName = folderName.replace(/'/g, "\\'");
  const parentQuery = parentId ? `'${parentId}' in parents` : "'root' in parents";
  const q = `name = '${cleanName}' and mimeType = 'application/vnd.google-apps.folder' and ${parentQuery} and trashed = false`;

  const searchUrl = new URL("https://www.googleapis.com/drive/v3/files");
  searchUrl.searchParams.append("q", q);
  searchUrl.searchParams.append("fields", "files(id)");

  const searchResponse = await fetch(searchUrl.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!searchResponse.ok) {
    const err = await searchResponse.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to search folder "${folderName}"`);
  }

  const searchData = await searchResponse.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Folder doesn't exist, create it
  const createResponse = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : ["root"],
    }),
  });

  if (!createResponse.ok) {
    const err = await createResponse.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to create folder "${folderName}"`);
  }

  const createData = await createResponse.json();
  return createData.id;
};

// Upload or update text file content in Google Drive
export const uploadOrUpdateFile = async (
  fileName: string,
  content: string,
  parentId?: string
): Promise<{ id: string; action: "created" | "updated" }> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("User not authenticated or access token missing.");
  }

  const cleanName = fileName.replace(/'/g, "\\'");
  const parentQuery = parentId ? `'${parentId}' in parents` : "'root' in parents";
  const q = `name = '${cleanName}' and mimeType != 'application/vnd.google-apps.folder' and ${parentQuery} and trashed = false`;

  const searchUrl = new URL("https://www.googleapis.com/drive/v3/files");
  searchUrl.searchParams.append("q", q);
  searchUrl.searchParams.append("fields", "files(id)");

  const searchResponse = await fetch(searchUrl.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!searchResponse.ok) {
    const err = await searchResponse.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to search file "${fileName}"`);
  }

  const searchData = await searchResponse.json();
  const fileId = searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;

  const boundary = "314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  if (fileId) {
    // Update existing file
    const metadata = {
      name: fileName,
      mimeType: "text/plain"
    };

    const body = delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
      content +
      closeDelim;

    const updateResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: body
    });

    if (!updateResponse.ok) {
      const err = await updateResponse.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to update file "${fileName}"`);
    }

    const updateData = await updateResponse.json();
    return { id: updateData.id, action: "updated" };
  } else {
    // Create new file
    const metadata = {
      name: fileName,
      mimeType: "text/plain",
      parents: parentId ? [parentId] : ["root"]
    };

    const body = delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
      content +
      closeDelim;

    const createResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: body
    });

    if (!createResponse.ok) {
      const err = await createResponse.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to create file "${fileName}"`);
    }

    const createData = await createResponse.json();
    return { id: createData.id, action: "created" };
  }
};

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
}

// Fetch list of files from Google Drive
export const fetchDriveFiles = async (
  searchQuery: string = "",
  pageToken?: string
): Promise<{ files: DriveFile[]; nextPageToken?: string }> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("User not authenticated or access token missing.");
  }

  // Construct query to list folders and files (excluding trashing)
  let q = "trashed = false";
  if (searchQuery.trim()) {
    q += ` and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
  }
  
  // Only query files that are folders or likely document/text formats for study imports
  // Allow searching everything but showing nice icons
  const fields = "nextPageToken, files(id, name, mimeType, modifiedTime, size)";
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.append("q", q);
  url.searchParams.append("fields", fields);
  url.searchParams.append("pageSize", "20");
  if (pageToken) {
    url.searchParams.append("pageToken", pageToken);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Failed to fetch files from Google Drive.");
  }

  return response.json();
};

// Fetch actual file content from Google Drive
export const fetchFileContent = async (fileId: string, mimeType: string): Promise<string> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("User not authenticated or access token missing.");
  }

  let url = "";
  let isExport = false;

  // Google Docs are virtual files and must be exported to a physical format
  if (mimeType === "application/vnd.google-apps.document") {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    isExport = true;
  } else {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (isExport) {
      throw new Error("Failed to export Google Document. Please check permissions.");
    } else {
      throw new Error("Failed to download file content. Note: Binary files (PDFs, Images, etc.) cannot be imported directly. Please convert them to a text file or Google Doc.");
    }
  }

  return response.text();
};
