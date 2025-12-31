"use client";

import { useState, useEffect } from "react";
import { RiPlayFill, RiFolderLine, RiSettings4Line, RiSearchLine } from "@remixicon/react";

// Mock profile data for the preview
const mockProfiles = [
  { id: "survival-world", name: "Survival World", version: "1.21.4", loader: "Fabric", mods: 12 },
  { id: "creative-build", name: "Creative Build", version: "1.20.4", loader: "Vanilla", mods: 0 },
  { id: "modded-adventure", name: "Modded Adventure", version: "1.20.1", loader: "Forge", mods: 47 },
];

const mockMods = [
  { name: "Sodium", platform: "modrinth", enabled: true },
  { name: "Lithium", platform: "modrinth", enabled: true },
  { name: "Iris Shaders", platform: "modrinth", enabled: true },
  { name: "Mod Menu", platform: "modrinth", enabled: true },
  { name: "JourneyMap", platform: "curseforge", enabled: false },
];

export function LauncherPreview() {
  const [selectedProfile, setSelectedProfile] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Animate through profiles
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setSelectedProfile((prev) => (prev + 1) % mockProfiles.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isHovered]);

  const profile = mockProfiles[selectedProfile];

  return (
    <div
      className="launcher-preview"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Window chrome */}
      <div className="launcher-titlebar">
        <div className="launcher-traffic-lights">
          <span className="traffic-light red" />
          <span className="traffic-light yellow" />
          <span className="traffic-light green" />
        </div>
        <span className="launcher-title">Shard Launcher</span>
      </div>

      <div className="launcher-body">
        {/* Sidebar */}
        <div className="launcher-sidebar">
          <div className="sidebar-search">
            <RiSearchLine className="search-icon" />
            <span className="search-placeholder">Search...</span>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <RiFolderLine className="section-icon" />
              <span>Profiles</span>
            </div>
            <div className="sidebar-profiles">
              {mockProfiles.map((p, i) => (
                <button
                  key={p.id}
                  className={`sidebar-profile ${i === selectedProfile ? "active" : ""}`}
                  onClick={() => setSelectedProfile(i)}
                >
                  <span className="profile-name">{p.name}</span>
                  {i === selectedProfile && (
                    <svg className="profile-check" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-bottom">
            <button className="sidebar-settings">
              <RiSettings4Line className="settings-icon" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="launcher-main">
          {/* Profile header */}
          <div className="profile-header">
            <div className="profile-info">
              <h2 className="profile-title">{profile.name}</h2>
              <div className="profile-meta">
                <span className="meta-badge version">{profile.version}</span>
                <span className="meta-badge loader">{profile.loader}</span>
                {profile.mods > 0 && (
                  <span className="meta-badge mods">{profile.mods} mods</span>
                )}
              </div>
            </div>
            <button className="play-button">
              <RiPlayFill className="play-icon" />
              <span>Play</span>
            </button>
          </div>

          {/* Content tabs */}
          <div className="content-tabs">
            <button className="tab active">Mods</button>
            <button className="tab">Resource Packs</button>
            <button className="tab">Shaders</button>
          </div>

          {/* Mods list */}
          <div className="mods-list">
            {mockMods.map((mod, i) => (
              <div key={i} className={`mod-item ${!mod.enabled ? "disabled" : ""}`}>
                <div className="mod-icon">
                  {mod.platform === "modrinth" ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="platform-icon modrinth">
                      <path d="M12.252.004a11.78 11.78 0 0 0-8.92 4.186 11.787 11.787 0 0 0-2.35 10.09 11.753 11.753 0 0 0 6.937 8.066 11.79 11.79 0 0 0 10.552-.523 11.769 11.769 0 0 0 5.55-7.336 11.748 11.748 0 0 0-3.018-10.33A11.78 11.78 0 0 0 12.252.004Zm-1.138 4.728c.268-.003.536.015.8.05 1.63.22 3.09 1.015 4.1 2.232a5.56 5.56 0 0 1 1.12 4.67l-1.965-.404a3.5 3.5 0 0 0-.71-2.936 3.51 3.51 0 0 0-2.586-1.408 3.52 3.52 0 0 0-2.75.902L7.856 6.553a5.54 5.54 0 0 1 3.258-1.82Zm4.453 4.102 1.964.404a5.57 5.57 0 0 1-3.353 5.166l-.726-1.857a3.5 3.5 0 0 0 2.115-3.713Zm-7.7 1.548.726 1.857a3.51 3.51 0 0 0-2.114 3.713l-1.964-.404a5.567 5.567 0 0 1 3.352-5.166Zm5.514 2.04.727 1.857a5.567 5.567 0 0 1-5.96 1.496l.727-1.857a3.52 3.52 0 0 0 4.506-1.496Z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="platform-icon curseforge">
                      <path d="M18.326 9.2h-5.652l1.095-4.4H9.326l-1.095 4.4H4.326v2h3.2l-1.095 4.4h-2.105v2h1.4l-.695 2.8h4.343l.695-2.8h3.257l-.695 2.8h4.343l.695-2.8h1.357v-2h-.652l1.095-4.4h1.557v-2zm-6.2 6.4H8.869l1.095-4.4h3.257l-1.095 4.4z"/>
                    </svg>
                  )}
                </div>
                <span className="mod-name">{mod.name}</span>
                <div className={`mod-toggle ${mod.enabled ? "enabled" : ""}`}>
                  <div className="toggle-track">
                    <div className="toggle-thumb" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .launcher-preview {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          border-radius: 12px;
          overflow: hidden;
          background: rgb(18 17 16);
          border: 1px solid rgba(255, 248, 240, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .launcher-titlebar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgb(12 11 10);
          border-bottom: 1px solid rgba(255, 248, 240, 0.06);
        }

        .launcher-traffic-lights {
          display: flex;
          gap: 8px;
        }

        .traffic-light {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .traffic-light.red { background: #ff5f57; }
        .traffic-light.yellow { background: #febc2e; }
        .traffic-light.green { background: #28c840; }

        .launcher-title {
          font-size: 13px;
          color: rgba(245, 240, 235, 0.6);
        }

        .launcher-body {
          display: flex;
          height: 400px;
        }

        .launcher-sidebar {
          width: 200px;
          background: rgb(12 11 10);
          border-right: 1px solid rgba(255, 248, 240, 0.06);
          display: flex;
          flex-direction: column;
          padding: 12px;
        }

        .sidebar-search {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 248, 240, 0.04);
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .search-icon {
          width: 14px;
          height: 14px;
          color: rgba(245, 240, 235, 0.4);
        }

        .search-placeholder {
          font-size: 13px;
          color: rgba(245, 240, 235, 0.3);
        }

        .sidebar-section {
          flex: 1;
        }

        .sidebar-section-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(245, 240, 235, 0.4);
          margin-bottom: 4px;
        }

        .section-icon {
          width: 14px;
          height: 14px;
        }

        .sidebar-profiles {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sidebar-profile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          color: rgba(245, 240, 235, 0.7);
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
        }

        .sidebar-profile:hover {
          background: rgba(255, 248, 240, 0.04);
          color: rgba(245, 240, 235, 0.9);
        }

        .sidebar-profile.active {
          background: rgba(232, 168, 85, 0.1);
          color: #e8a855;
        }

        .profile-check {
          color: #e8a855;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 248, 240, 0.06);
        }

        .sidebar-settings {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          color: rgba(245, 240, 235, 0.5);
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
        }

        .settings-icon {
          width: 16px;
          height: 16px;
        }

        .launcher-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 20px;
          overflow: hidden;
        }

        .profile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .profile-title {
          font-size: 20px;
          font-weight: 600;
          color: rgb(245, 240, 235);
          margin: 0 0 8px 0;
        }

        .profile-meta {
          display: flex;
          gap: 8px;
        }

        .meta-badge {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }

        .meta-badge.version {
          background: rgba(124, 207, 155, 0.1);
          color: #7ccf9b;
        }

        .meta-badge.loader {
          background: rgba(99, 102, 241, 0.1);
          color: #818cf8;
        }

        .meta-badge.mods {
          background: rgba(232, 168, 85, 0.1);
          color: #e8a855;
        }

        .play-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #e8a855;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .play-button:hover {
          background: #f0bc6f;
        }

        .play-icon {
          width: 18px;
          height: 18px;
        }

        .content-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255, 248, 240, 0.06);
          padding-bottom: 12px;
        }

        .tab {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          color: rgba(245, 240, 235, 0.5);
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .tab.active {
          background: rgba(232, 168, 85, 0.1);
          color: #e8a855;
        }

        .mods-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }

        .mod-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: rgba(255, 248, 240, 0.02);
          border-radius: 8px;
          border: 1px solid rgba(255, 248, 240, 0.04);
        }

        .mod-item.disabled {
          opacity: 0.5;
        }

        .mod-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .platform-icon {
          width: 20px;
          height: 20px;
        }

        .platform-icon.modrinth {
          color: #1bd96a;
        }

        .platform-icon.curseforge {
          color: #f16436;
        }

        .mod-name {
          flex: 1;
          font-size: 13px;
          color: rgb(245, 240, 235);
        }

        .mod-toggle {
          width: 36px;
          height: 20px;
        }

        .toggle-track {
          width: 100%;
          height: 100%;
          background: rgba(255, 248, 240, 0.1);
          border-radius: 10px;
          position: relative;
          transition: background 0.15s ease;
        }

        .mod-toggle.enabled .toggle-track {
          background: #e8a855;
        }

        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          transition: transform 0.15s ease;
        }

        .mod-toggle.enabled .toggle-thumb {
          transform: translateX(16px);
        }

        @media (max-width: 640px) {
          .launcher-sidebar {
            display: none;
          }

          .launcher-body {
            height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
