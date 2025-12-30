import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useAppStore } from "../store";
import type { ProfileFolder } from "../types";

interface SidebarProps {
  onCreateProfile: () => void;
  onCloneProfile: () => void;
  onDiffProfiles: () => void;
  onAddAccount: () => void;
  onDeleteProfile: (id: string) => void;
}

export function Sidebar({
  onCreateProfile,
  onCloneProfile,
  onDiffProfiles,
  onAddAccount,
  onDeleteProfile,
}: SidebarProps) {
  const {
    profiles,
    profile,
    selectedProfileId,
    setSelectedProfileId,
    profileFilter,
    setProfileFilter,
    sidebarView,
    setSidebarView,
    getActiveAccount,
    profileOrg,
    contextMenuTarget,
    setContextMenuTarget,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleFolderCollapsed,
    moveProfileToFolder,
    loadProfileOrganization,
    syncProfileOrganization,
  } = useAppStore();

  const activeAccount = getActiveAccount();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const addMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Load organization on mount and sync when profiles change
  useEffect(() => {
    loadProfileOrganization();
  }, [loadProfileOrganization]);

  useEffect(() => {
    syncProfileOrganization();
  }, [profiles, syncProfileOrganization]);

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuTarget(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [setContextMenuTarget]);

  const filteredProfiles = (() => {
    const query = profileFilter.trim().toLowerCase();
    if (!query) return profiles;
    return profiles.filter((id) => id.toLowerCase().includes(query));
  })();

  const handleContextMenu = (e: React.MouseEvent, type: "profile" | "folder", id: string) => {
    e.preventDefault();
    setContextMenuTarget({ type, id, x: e.clientX, y: e.clientY });
  };

  const handleCreateFolder = () => {
    createFolder("New Folder");
    setShowAddMenu(false);
  };

  const handleStartRename = (folder: ProfileFolder) => {
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
    setContextMenuTarget(null);
  };

  const handleFinishRename = () => {
    if (editingFolderId && editingName.trim()) {
      renameFolder(editingFolderId, editingName.trim());
    }
    setEditingFolderId(null);
    setEditingName("");
  };

  const renderProfile = (id: string, indent = false) => {
    const isSelected = selectedProfileId === id;
    const matchesFilter = filteredProfiles.includes(id);
    if (!matchesFilter && profileFilter) return null;

    return (
      <button
        key={id}
        className={clsx("tree-item", isSelected && "active", indent && "tree-item-indent")}
        onClick={() => {
          setSelectedProfileId(id);
          setSidebarView("profiles");
        }}
        onContextMenu={(e) => handleContextMenu(e, "profile", id)}
        data-tauri-drag-region="false"
      >
        <span className="tree-item-label">{id}</span>
        {isSelected && <span className="indicator" />}
      </button>
    );
  };

  const renderFolder = (folder: ProfileFolder) => {
    const matchingProfiles = folder.profiles.filter((id) => filteredProfiles.includes(id));
    const hasMatches = matchingProfiles.length > 0 || !profileFilter;
    if (!hasMatches && profileFilter) return null;

    const isEditing = editingFolderId === folder.id;

    return (
      <div key={folder.id} className="tree-folder">
        <button
          className="tree-folder-header"
          onClick={() => toggleFolderCollapsed(folder.id)}
          onContextMenu={(e) => handleContextMenu(e, "folder", folder.id)}
          data-tauri-drag-region="false"
        >
          <span className={clsx("tree-chevron", !folder.collapsed && "expanded")}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </span>
          {isEditing ? (
            <input
              className="tree-folder-input"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFinishRename();
                if (e.key === "Escape") {
                  setEditingFolderId(null);
                  setEditingName("");
                }
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span className="tree-folder-name">{folder.name}</span>
          )}
          <span className="tree-folder-count">{folder.profiles.length}</span>
        </button>
        {!folder.collapsed && (
          <div className="tree-folder-contents">
            {folder.profiles.map((id) => renderProfile(id, true))}
            {folder.profiles.length === 0 && (
              <div className="tree-empty">Drop profiles here</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="sidebar">
      {/* Header with add button */}
      <div className="sidebar-section">
        <div className="sidebar-header">
          <span>Profiles</span>
          <div className="sidebar-add-wrapper" ref={addMenuRef}>
            <button
              className="sidebar-add-btn"
              onClick={() => setShowAddMenu(!showAddMenu)}
              data-tauri-drag-region="false"
              title="Add profile or folder"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            {showAddMenu && (
              <div className="sidebar-add-menu">
                <button onClick={() => { onCreateProfile(); setShowAddMenu(false); }}>
                  New Profile
                </button>
                <button onClick={handleCreateFolder}>
                  New Folder
                </button>
                <div className="menu-divider" />
                <button onClick={() => { onCloneProfile(); setShowAddMenu(false); }} disabled={!profile}>
                  Clone Profile
                </button>
                <button onClick={() => { onDiffProfiles(); setShowAddMenu(false); }}>
                  Compare Profiles
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search - only show if more than 5 profiles */}
      {profiles.length > 5 && (
        <div className="sidebar-search">
          <input
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
            placeholder="Search…"
            data-tauri-drag-region="false"
          />
        </div>
      )}

      {/* Profile tree */}
      <div className="profile-tree">
        {/* Folders */}
        {profileOrg.folders.map(renderFolder)}

        {/* Ungrouped profiles */}
        {profileOrg.ungrouped.map((id) => renderProfile(id))}

        {/* Empty state */}
        {profiles.length === 0 && (
          <div className="tree-empty-state">
            <p>No profiles yet</p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onCreateProfile}
              data-tauri-drag-region="false"
            >
              Create profile
            </button>
          </div>
        )}
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section">
        <button
          className={clsx("sidebar-item", sidebarView === "store" && "active")}
          onClick={() => setSidebarView("store")}
          data-tauri-drag-region="false"
        >
          Content Store
        </button>
        <button
          className={clsx("sidebar-item", sidebarView === "logs" && "active")}
          onClick={() => setSidebarView("logs")}
          data-tauri-drag-region="false"
        >
          Logs
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-header" style={{ padding: "0 0 8px" }}>Account</div>
        {activeAccount ? (
          <div className="account-badge">
            <div className="account-badge-avatar">{activeAccount.username.charAt(0).toUpperCase()}</div>
            <div className="account-badge-info">
              <div className="account-badge-name">{activeAccount.username}</div>
              <div className="account-badge-uuid">{activeAccount.uuid.slice(0, 8)}…</div>
            </div>
          </div>
        ) : (
          <button className="btn btn-secondary btn-sm w-full" onClick={onAddAccount} data-tauri-drag-region="false">
            Add account
          </button>
        )}
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            className={clsx("sidebar-item", sidebarView === "accounts" && "active")}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => setSidebarView("accounts")}
            data-tauri-drag-region="false"
          >
            Accounts
          </button>
          <button
            className={clsx("sidebar-item", sidebarView === "settings" && "active")}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => setSidebarView("settings")}
            data-tauri-drag-region="false"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Context menu */}
      {contextMenuTarget && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{ left: contextMenuTarget.x, top: contextMenuTarget.y }}
        >
          {contextMenuTarget.type === "profile" && (
            <>
              <button
                onClick={() => {
                  setSelectedProfileId(contextMenuTarget.id);
                  setSidebarView("profiles");
                  setContextMenuTarget(null);
                }}
              >
                Open
              </button>
              <button
                onClick={() => {
                  onCloneProfile();
                  setContextMenuTarget(null);
                }}
              >
                Clone
              </button>
              <div className="menu-divider" />
              {profileOrg.folders.length > 0 && (
                <>
                  <div className="menu-label">Move to folder</div>
                  {profileOrg.folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        moveProfileToFolder(contextMenuTarget.id, f.id);
                        setContextMenuTarget(null);
                      }}
                    >
                      {f.name}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      moveProfileToFolder(contextMenuTarget.id, null);
                      setContextMenuTarget(null);
                    }}
                  >
                    (No folder)
                  </button>
                  <div className="menu-divider" />
                </>
              )}
              <button
                className="menu-danger"
                onClick={() => {
                  onDeleteProfile(contextMenuTarget.id);
                  setContextMenuTarget(null);
                }}
              >
                Delete
              </button>
            </>
          )}
          {contextMenuTarget.type === "folder" && (
            <>
              <button
                onClick={() => {
                  const folder = profileOrg.folders.find((f) => f.id === contextMenuTarget.id);
                  if (folder) handleStartRename(folder);
                }}
              >
                Rename
              </button>
              <button
                className="menu-danger"
                onClick={() => {
                  deleteFolder(contextMenuTarget.id);
                  setContextMenuTarget(null);
                }}
              >
                Delete Folder
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
