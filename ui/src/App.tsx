import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import clsx from "clsx";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";

type ContentRef = {
  name: string;
  hash: string;
  version?: string | null;
  source?: string | null;
  file_name?: string | null;
};

type Loader = {
  type: string;
  version: string;
};

type Runtime = {
  java?: string | null;
  memory?: string | null;
  args: string[];
};

type Profile = {
  id: string;
  mcVersion: string;
  loader?: Loader | null;
  mods: ContentRef[];
  resourcepacks: ContentRef[];
  shaderpacks: ContentRef[];
  runtime: Runtime;
};

type Account = {
  uuid: string;
  username: string;
  xuid?: string | null;
};

type Accounts = {
  active?: string | null;
  accounts: Account[];
};

type Config = {
  msa_client_id?: string | null;
  msa_client_secret?: string | null;
};

type DeviceCode = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  message: string;
  expires_in: number;
  interval: number;
};

type LaunchPlan = {
  instance_dir: string;
  java_exec: string;
  jvm_args: string[];
  classpath: string;
  main_class: string;
  game_args: string[];
};

type DiffResult = {
  only_a: string[];
  only_b: string[];
  both: string[];
};

type LaunchEvent = {
  stage: string;
  message?: string | null;
};

type ManifestVersion = {
  id: string;
  type: string;
  releaseTime?: string;
};

type ContentTab = "mods" | "resourcepacks" | "shaderpacks";

type ModalType =
  | "create"
  | "clone"
  | "diff"
  | "json"
  | "add-content"
  | "prepare"
  | "device-code";

type DrawerType = "accounts" | "settings" | null;

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
};

const tabLabel: Record<ContentTab, string> = {
  mods: "Mods",
  resourcepacks: "Resourcepacks",
  shaderpacks: "Shaderpacks"
};

function App() {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [profileFilter, setProfileFilter] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Accounts | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [activeTab, setActiveTab] = useState<ContentTab>("mods");
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [toast, setToast] = useState<{ title: string; detail?: string } | null>(null);
  const [launchStatus, setLaunchStatus] = useState<LaunchEvent | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const [createForm, setCreateForm] = useState({
    id: "",
    mcVersion: "",
    loaderType: "",
    loaderVersion: "",
    java: "",
    memory: "",
    args: ""
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [mcVersions, setMcVersions] = useState<ManifestVersion[]>([]);
  const [mcVersionLoading, setMcVersionLoading] = useState(false);
  const [mcVersionError, setMcVersionError] = useState<string | null>(null);
  const [loaderVersions, setLoaderVersions] = useState<string[]>([]);
  const [loaderLoading, setLoaderLoading] = useState(false);
  const [loaderError, setLoaderError] = useState<string | null>(null);

  const [cloneForm, setCloneForm] = useState({
    src: "",
    dst: ""
  });
  const [cloneErrors, setCloneErrors] = useState<Record<string, string>>({});

  const [diffForm, setDiffForm] = useState({
    a: "",
    b: ""
  });
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [diffErrors, setDiffErrors] = useState<Record<string, string>>({});

  const [contentForm, setContentForm] = useState({
    input: "",
    url: "",
    name: "",
    version: ""
  });
  const [contentKind, setContentKind] = useState<ContentTab>("mods");
  const [contentErrors, setContentErrors] = useState<Record<string, string>>({});

  const [deviceCode, setDeviceCode] = useState<DeviceCode | null>(null);
  const [devicePending, setDevicePending] = useState(false);

  const [plan, setPlan] = useState<LaunchPlan | null>(null);

  const filteredProfiles = useMemo(() => {
    const query = profileFilter.trim().toLowerCase();
    if (!query) {
      return profiles;
    }
    return profiles.filter((id) => id.toLowerCase().includes(query));
  }, [profiles, profileFilter]);

  const visibleVersions = useMemo(() => {
    return mcVersions.filter((entry) => showSnapshots || entry.type === "release");
  }, [mcVersions, showSnapshots]);

  const latestRelease = useMemo(() => {
    return mcVersions.find((entry) => entry.type === "release")?.id;
  }, [mcVersions]);

  const activeAccount = useMemo(() => {
    if (!accounts) return null;
    const id = selectedAccountId ?? accounts.active ?? null;
    return accounts.accounts.find((account) => account.uuid === id) ?? null;
  }, [accounts, selectedAccountId]);

  const contentItems = useMemo(() => {
    if (!profile) return [] as ContentRef[];
    if (activeTab === "mods") return profile.mods;
    if (activeTab === "resourcepacks") return profile.resourcepacks;
    return profile.shaderpacks;
  }, [profile, activeTab]);

  const inputClass = (error?: string) => clsx("input", error && "input-error");

  useEffect(() => {
    void loadInitial();
  }, []);

  useEffect(() => {
    if (!selectedProfileId) {
      setProfile(null);
      return;
    }
    void loadProfile(selectedProfileId);
  }, [selectedProfileId]);

  useEffect(() => {
    const unlisten = listen<LaunchEvent>("launch-status", (event) => {
      setLaunchStatus(event.payload);
      if (event.payload.stage === "error") {
        notify("Launch failed", event.payload.message ?? "Unknown error");
      }
      if (event.payload.stage === "done") {
        setTimeout(() => setLaunchStatus(null), 2500);
      }
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        openCreateModal();
        return;
      }
      if (event.key === "Escape") {
        if (confirmState) {
          setConfirmState(null);
          return;
        }
        if (activeModal) {
          setActiveModal(null);
          return;
        }
        if (activeDrawer) {
          setActiveDrawer(null);
          return;
        }
      }
      if (event.key === "Enter") {
        if (confirmState) {
          event.preventDefault();
          void confirmState.onConfirm();
          return;
        }
        if (activeModal === "create") {
          event.preventDefault();
          void handleCreateProfile();
        } else if (activeModal === "clone") {
          event.preventDefault();
          void handleCloneProfile();
        } else if (activeModal === "diff") {
          event.preventDefault();
          void handleDiffProfiles();
        } else if (activeModal === "add-content") {
          event.preventDefault();
          void handleAddContent();
        } else if (activeModal === "device-code" && deviceCode && !devicePending) {
          event.preventDefault();
          void handleFinishDeviceCode();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeModal, activeDrawer, confirmState, deviceCode, devicePending]);

  const loadInitial = async () => {
    await Promise.all([loadProfiles(), loadAccounts(), loadConfig()]);
  };

  const fetchMinecraftVersions = async () => {
    setMcVersionLoading(true);
    setMcVersionError(null);
    try {
      const resp = await fetch("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json");
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const list = (data.versions ?? []).map((entry: any) => ({
        id: String(entry.id),
        type: String(entry.type),
        releaseTime: entry.releaseTime
      })) as ManifestVersion[];
      setMcVersions(list);
      if (!createForm.mcVersion && data.latest?.release) {
        setCreateForm((prev) => ({ ...prev, mcVersion: data.latest.release }));
      }
    } catch (err) {
      setMcVersionError("Failed to load versions.");
      console.error(err);
    } finally {
      setMcVersionLoading(false);
    }
  };

  const fetchLoaderVersions = async () => {
    setLoaderLoading(true);
    setLoaderError(null);
    try {
      const resp = await fetch("https://meta.fabricmc.net/v2/versions/loader");
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const versions = (data ?? [])
        .map((entry: any) => entry?.loader?.version)
        .filter((value: string | undefined) => !!value) as string[];
      setLoaderVersions(Array.from(new Set(versions)));
    } catch (err) {
      setLoaderError("Failed to load loader versions.");
      console.error(err);
    } finally {
      setLoaderLoading(false);
    }
  };

  const ensureVersionData = () => {
    if (mcVersions.length === 0 && !mcVersionLoading) {
      void fetchMinecraftVersions();
    }
    if (createForm.loaderType === "fabric" && loaderVersions.length === 0 && !loaderLoading) {
      void fetchLoaderVersions();
    }
  };

  const refreshVersionData = async () => {
    await fetchMinecraftVersions();
    if (createForm.loaderType === "fabric") {
      await fetchLoaderVersions();
    }
  };

  const loadProfiles = async () => {
    try {
      const list = await invoke<string[]>("list_profiles_cmd");
      setProfiles(list);
      if (!selectedProfileId && list.length > 0) {
        setSelectedProfileId(list[0]);
      }
    } catch (err) {
      notify("Failed to load profiles", String(err));
    }
  };

  const loadProfile = async (id: string) => {
    try {
      const data = await invoke<Profile>("load_profile_cmd", { id });
      setProfile(data);
    } catch (err) {
      notify("Failed to load profile", String(err));
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await invoke<Accounts>("list_accounts_cmd");
      setAccounts(data);
      if (!selectedAccountId) {
        setSelectedAccountId(data.active ?? data.accounts[0]?.uuid ?? null);
      }
    } catch (err) {
      notify("Failed to load accounts", String(err));
    }
  };

  const loadConfig = async () => {
    try {
      const data = await invoke<Config>("get_config_cmd");
      setConfig(data);
    } catch (err) {
      notify("Failed to load config", String(err));
    }
  };

  const notify = (title: string, detail?: string) => {
    setToast({ title, detail });
    setTimeout(() => setToast(null), 3800);
  };

  const openConfirm = (state: ConfirmState) => {
    setConfirmState(state);
  };

  const runAction = async (action: () => Promise<void>) => {
    setIsWorking(true);
    try {
      await action();
    } catch (err) {
      notify("Action failed", String(err));
    } finally {
      setIsWorking(false);
    }
  };

  const openCreateModal = () => {
    setCreateForm({
      id: "",
      mcVersion: "",
      loaderType: "",
      loaderVersion: "",
      java: "",
      memory: "",
      args: ""
    });
    setCreateErrors({});
    setActiveModal("create");
    ensureVersionData();
  };

  const openCloneModal = () => {
    setCloneForm({ src: selectedProfileId ?? "", dst: "" });
    setCloneErrors({});
    setActiveModal("clone");
  };

  const openDiffModal = () => {
    setDiffForm({ a: selectedProfileId ?? "", b: "" });
    setDiffResult(null);
    setDiffErrors({});
    setActiveModal("diff");
  };

  const openAddContentModal = (kind: ContentTab) => {
    setContentForm({ input: "", url: "", name: "", version: "" });
    setContentKind(kind);
    setContentErrors({});
    setActiveModal("add-content");
  };

  const openDeviceCodeModal = () => {
    setDeviceCode(null);
    setDevicePending(false);
    setActiveModal("device-code");
  };

  useEffect(() => {
    if (activeModal === "create") {
      ensureVersionData();
    }
  }, [activeModal]);

  useEffect(() => {
    if (activeModal === "create" && createForm.loaderType === "fabric") {
      if (loaderVersions.length === 0 && !loaderLoading) {
        void fetchLoaderVersions();
      }
    }
  }, [activeModal, createForm.loaderType, loaderVersions.length, loaderLoading]);

  const handleCreateProfile = async () => {
    const errors: Record<string, string> = {};
    if (!createForm.id.trim()) {
      errors.id = "Profile id is required.";
    }
    if (!createForm.mcVersion.trim()) {
      errors.mcVersion = "Minecraft version is required.";
    }
    if (createForm.loaderType && !createForm.loaderVersion.trim()) {
      errors.loaderVersion = "Loader version is required.";
    }
    if (!createForm.loaderType && createForm.loaderVersion.trim()) {
      errors.loaderType = "Select a loader type.";
    }
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    await runAction(async () => {
      const payload = {
        id: createForm.id.trim(),
        mc_version: createForm.mcVersion.trim(),
        loader_type: createForm.loaderType.trim() || null,
        loader_version: createForm.loaderVersion.trim() || null,
        java: createForm.java.trim() || null,
        memory: createForm.memory.trim() || null,
        args: createForm.args.trim() || null
      };
      await invoke<Profile>("create_profile_cmd", { input: payload });
      await loadProfiles();
      setSelectedProfileId(payload.id);
      setActiveModal(null);
    });
  };

  const handleCloneProfile = async () => {
    const errors: Record<string, string> = {};
    if (!cloneForm.src.trim()) {
      errors.src = "Source profile is required.";
    }
    if (!cloneForm.dst.trim()) {
      errors.dst = "Destination id is required.";
    }
    if (cloneForm.src.trim() && cloneForm.dst.trim() && cloneForm.src.trim() === cloneForm.dst.trim()) {
      errors.dst = "Destination must be different.";
    }
    setCloneErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    await runAction(async () => {
      await invoke("clone_profile_cmd", { src: cloneForm.src, dst: cloneForm.dst });
      await loadProfiles();
      setSelectedProfileId(cloneForm.dst);
      setActiveModal(null);
    });
  };

  const handleDiffProfiles = async () => {
    const errors: Record<string, string> = {};
    if (!diffForm.a.trim()) {
      errors.a = "Pick a profile.";
    }
    if (!diffForm.b.trim()) {
      errors.b = "Pick a profile.";
    }
    if (diffForm.a && diffForm.b && diffForm.a === diffForm.b) {
      errors.b = "Pick a different profile.";
    }
    setDiffErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    await runAction(async () => {
      const result = await invoke<DiffResult>("diff_profiles_cmd", {
        a: diffForm.a,
        b: diffForm.b
      });
      setDiffResult(result);
    });
  };

  const handleAddContent = async () => {
    if (!selectedProfileId) return;
    const inputValue = contentForm.input || contentForm.url;
    const errors: Record<string, string> = {};
    if (!inputValue) {
      errors.input = "Pick a file or paste a URL.";
    }
    setContentErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    await runAction(async () => {
      const payload = {
        profile_id: selectedProfileId,
        input: inputValue,
        name: contentForm.name.trim() || null,
        version: contentForm.version.trim() || null
      };
      if (contentKind === "mods") {
        await invoke("add_mod_cmd", payload);
      } else if (contentKind === "resourcepacks") {
        await invoke("add_resourcepack_cmd", payload);
      } else {
        await invoke("add_shaderpack_cmd", payload);
      }
      await loadProfile(selectedProfileId);
      setActiveModal(null);
    });
  };

  const handleRemoveContent = async (item: ContentRef) => {
    if (!selectedProfileId) return;
    openConfirm({
      title: `Remove ${item.name}?`,
      message: "This will remove it from the profile but keep the stored file.",
      confirmLabel: "Remove",
      tone: "danger",
      onConfirm: async () => {
        setConfirmState(null);
        await runAction(async () => {
          const payload = { profile_id: selectedProfileId, target: item.hash };
          if (activeTab === "mods") {
            await invoke("remove_mod_cmd", payload);
          } else if (activeTab === "resourcepacks") {
            await invoke("remove_resourcepack_cmd", payload);
          } else {
            await invoke("remove_shaderpack_cmd", payload);
          }
          await loadProfile(selectedProfileId);
        });
      }
    });
  };

  const handleLaunch = async () => {
    if (!selectedProfileId) return;
    if (!activeAccount) {
      notify("No account", "Add an account first.");
      return;
    }
    await runAction(async () => {
      await invoke("launch_profile_cmd", {
        profile_id: selectedProfileId,
        account_id: activeAccount.uuid
      });
      setLaunchStatus({ stage: "queued" });
    });
  };

  const handlePrepare = async () => {
    if (!selectedProfileId) return;
    if (!activeAccount) {
      notify("No account", "Add an account first.");
      return;
    }
    await runAction(async () => {
      const planData = await invoke<LaunchPlan>("prepare_profile_cmd", {
        profile_id: selectedProfileId,
        account_id: activeAccount.uuid
      });
      setPlan(planData);
      setActiveModal("prepare");
    });
  };

  const handleOpenInstance = async () => {
    if (!selectedProfileId) return;
    await runAction(async () => {
      const path = await invoke<string>("instance_path_cmd", {
        profile_id: selectedProfileId
      });
      await openPath(path);
    });
  };

  const handleCopyCommand = async () => {
    if (!selectedProfileId) return;
    const command = `shard launch ${selectedProfileId}`;
    await navigator.clipboard.writeText(command);
    notify("Copied", command);
  };

  const handleFilePick = async () => {
    const selected = await dialogOpen({
      multiple: false,
      directory: false
    });
    if (typeof selected === "string") {
      setContentForm((prev) => ({ ...prev, input: selected }));
    }
  };

  const handleRequestDeviceCode = async () => {
    await runAction(async () => {
      const data = await invoke<DeviceCode>("request_device_code_cmd", {
        client_id: config?.msa_client_id ?? null,
        client_secret: config?.msa_client_secret ?? null
      });
      setDeviceCode(data);
    });
  };

  const handleFinishDeviceCode = async () => {
    if (!deviceCode) return;
    setDevicePending(true);
    try {
      await invoke("finish_device_code_flow_cmd", {
        client_id: config?.msa_client_id ?? null,
        client_secret: config?.msa_client_secret ?? null,
        device: deviceCode
      });
      await loadAccounts();
      setActiveModal(null);
    } catch (err) {
      notify("Account sign-in failed", String(err));
    } finally {
      setDevicePending(false);
    }
  };

  const handleSaveConfig = async () => {
    await runAction(async () => {
      const updated = await invoke<Config>("save_config_cmd", {
        client_id: config?.msa_client_id ?? null,
        client_secret: config?.msa_client_secret ?? null
      });
      setConfig(updated);
      notify("Settings saved");
    });
  };

  const formatSource = (source?: string | null) => {
    if (!source) return null;
    try {
      const url = new URL(source);
      return url.host.replace(/^www\./, "");
    } catch {
      return source;
    }
  };

  return (
    <div className="min-h-screen px-5 pb-5 pt-10">
      <div
        data-tauri-drag-region
        className="fixed top-0 left-0 right-0 h-7 z-50 bg-black/25 backdrop-blur"
      />
      <div className="glass rounded-[32px] p-5 shadow-glow fade-in min-h-[calc(100vh-52px)] flex flex-col">
        <header
          data-tauri-drag-region
          className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl nebula flex items-center justify-center text-lg font-semibold text-white/90 shadow-soft">
              S
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-haze font-mono">
                Shard Launcher
              </p>
              <h1 className="text-xl font-semibold tracking-tight">Minimal worlds, instant start.</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-tauri-drag-region="false"
              className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-mist hover:bg-white/10"
              onClick={() => setActiveDrawer("accounts")}
            >
              Accounts
            </button>
            <button
              data-tauri-drag-region="false"
              className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-mist hover:bg-white/10"
              onClick={() => setActiveDrawer("settings")}
            >
              Settings
            </button>
          </div>
        </header>

        <div className="grid grid-cols-[260px_1fr] gap-6 pt-6 flex-1 min-h-0">
          <aside className="panel rounded-2xl p-4 flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-haze font-mono">Profiles</span>
              <button
                data-tauri-drag-region="false"
                className="text-xs text-accent hover:text-white"
                onClick={openCreateModal}
              >
                + New
              </button>
            </div>
            <input
              value={profileFilter}
              onChange={(event) => setProfileFilter(event.target.value)}
              placeholder="Search profiles"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-accent/50"
              data-tauri-drag-region="false"
            />
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {filteredProfiles.length === 0 ? (
                <div className="text-sm text-haze/70">No profiles yet.</div>
              ) : (
                filteredProfiles.map((id) => (
                  <button
                    key={id}
                    onClick={() => setSelectedProfileId(id)}
                    className={clsx(
                      "w-full text-left rounded-xl px-3 py-2 border transition",
                      selectedProfileId === id
                        ? "bg-white/10 border-white/20"
                        : "border-transparent hover:border-white/10 hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-mist">{id}</span>
                      <span className="h-2 w-2 rounded-full bg-accent/60" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <main className="flex flex-col gap-4 flex-1 min-h-0">
            {!profile ? (
              <section className="panel rounded-2xl p-8 text-center">
                <h2 className="text-lg font-semibold">No profile selected</h2>
                <p className="text-sm text-haze mt-2">
                  Create your first profile to start launching.
                </p>
                <button
                  className="mt-5 px-4 py-2 rounded-full bg-accent text-ink text-sm font-medium"
                  onClick={openCreateModal}
                >
                  Create profile
                </button>
              </section>
            ) : (
              <>
                <section className="panel rounded-2xl p-6 flex flex-col min-h-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-haze font-mono">Active profile</p>
                      <h2 className="text-2xl font-semibold mt-1">{profile.id}</h2>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Chip label={`MC ${profile.mcVersion}`} />
                        {profile.loader ? (
                          <Chip label={`${profile.loader.type}@${profile.loader.version}`} />
                        ) : (
                          <Chip label="vanilla" />
                        )}
                        {profile.runtime.memory ? (
                          <Chip label={`RAM ${profile.runtime.memory}`} />
                        ) : null}
                        {profile.runtime.java ? (
                          <Chip label="Custom Java" />
                        ) : null}
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <Stat label="Mods" value={profile.mods.length} />
                        <Stat label="Resourcepacks" value={profile.resourcepacks.length} />
                        <Stat label="Shaderpacks" value={profile.shaderpacks.length} />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center gap-2">
                        <select
                          data-tauri-drag-region="false"
                          className="rounded-full bg-white/5 border border-white/10 px-3 py-2 text-xs text-mist outline-none"
                          value={activeAccount?.uuid ?? ""}
                          onChange={(event) => setSelectedAccountId(event.target.value)}
                        >
                          {accounts?.accounts.length ? (
                            accounts.accounts.map((account) => (
                              <option key={account.uuid} value={account.uuid}>
                                {account.username}
                              </option>
                            ))
                          ) : (
                            <option value="">No accounts</option>
                          )}
                        </select>
                        <button
                          data-tauri-drag-region="false"
                          className="px-4 py-2 rounded-full bg-accent text-ink text-sm font-medium disabled:opacity-50"
                          onClick={handleLaunch}
                          disabled={!activeAccount || isWorking}
                        >
                          Launch
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          data-tauri-drag-region="false"
                          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-mist"
                          onClick={handlePrepare}
                        >
                          Prepare
                        </button>
                        <button
                          data-tauri-drag-region="false"
                          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-mist"
                          onClick={openCloneModal}
                        >
                          Clone
                        </button>
                        <button
                          data-tauri-drag-region="false"
                          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-mist"
                          onClick={openDiffModal}
                        >
                          Diff
                        </button>
                        <button
                          data-tauri-drag-region="false"
                          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-mist"
                          onClick={() => setActiveModal("json")}
                        >
                          JSON
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-haze">
                    <button
                      data-tauri-drag-region="false"
                      className="px-3 py-1 rounded-full border border-white/10 hover:border-white/20"
                      onClick={handleOpenInstance}
                    >
                      Open instance folder
                    </button>
                    <button
                      data-tauri-drag-region="false"
                      className="px-3 py-1 rounded-full border border-white/10 hover:border-white/20"
                      onClick={handleCopyCommand}
                    >
                      Copy CLI command
                    </button>
                  </div>
                  {launchStatus ? (
                    <div className="mt-4 text-xs text-haze font-mono uppercase tracking-widest">
                      {launchStatus.stage}
                      {launchStatus.message ? ` · ${launchStatus.message}` : ""}
                    </div>
                  ) : null}
                </section>

                <section className="panel rounded-2xl p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {(Object.keys(tabLabel) as ContentTab[]).map((tab) => (
                        <button
                          key={tab}
                          className={clsx(
                            "px-3 py-1.5 rounded-full text-xs",
                            activeTab === tab
                              ? "bg-white/10 text-mist border border-white/20"
                              : "text-haze border border-transparent hover:border-white/10"
                          )}
                          onClick={() => setActiveTab(tab)}
                        >
                          {tabLabel[tab]}
                        </button>
                      ))}
                    </div>
                    <button
                      className="px-3 py-1.5 rounded-full bg-accent text-ink text-xs font-medium"
                      onClick={() => openAddContentModal(activeTab)}
                    >
                      Add {tabLabel[activeTab]}
                    </button>
                  </div>
                  <div className="mt-4 space-y-2 flex-1 overflow-auto pr-1">
                    {contentItems.length === 0 ? (
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-haze flex items-center justify-between">
                        <span>No {tabLabel[activeTab].toLowerCase()} yet.</span>
                        <button
                          className="btn-secondary text-xs"
                          onClick={() => openAddContentModal(activeTab)}
                        >
                          Add {tabLabel[activeTab]}
                        </button>
                      </div>
                    ) : (
                      contentItems.map((item) => (
                        <div
                          key={item.hash}
                          className="flex items-start justify-between gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-3"
                        >
                          <div>
                            <div className="text-sm text-mist font-medium">{item.name}</div>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-haze">
                              {item.version ? <MetaChip label={`v${item.version}`} /> : null}
                              {item.source ? <MetaChip label={formatSource(item.source) ?? item.source} /> : null}
                              {item.file_name ? <MetaChip label={item.file_name} /> : null}
                            </div>
                            <div className="mt-1 text-[11px] text-haze font-mono">
                              {item.hash.slice(0, 14)}…
                            </div>
                          </div>
                          <button
                            className="text-xs text-haze hover:text-white"
                            onClick={() => handleRemoveContent(item)}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>

      {activeDrawer && (
        <Drawer onClose={() => setActiveDrawer(null)} title={activeDrawer === "accounts" ? "Accounts" : "Settings"}>
          {activeDrawer === "accounts" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-haze font-mono">Connected</span>
                <button
                  className="text-xs text-accent"
                  onClick={openDeviceCodeModal}
                >
                  + Add account
                </button>
              </div>
              {accounts?.accounts.length ? (
                accounts.accounts.map((account) => (
                  <div
                    key={account.uuid}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium text-mist">{account.username}</div>
                      <div className="text-[11px] text-haze font-mono">{account.uuid.slice(0, 12)}...</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className={clsx(
                          "text-xs px-2 py-1 rounded-full",
                          accounts.active === account.uuid
                            ? "bg-accent text-ink"
                            : "bg-white/5 text-mist"
                        )}
                        onClick={async () => {
                          await runAction(async () => {
                            await invoke("set_active_account_cmd", { id: account.uuid });
                            await loadAccounts();
                            setSelectedAccountId(account.uuid);
                          });
                        }}
                      >
                        {accounts.active === account.uuid ? "Active" : "Use"}
                      </button>
                      <button
                        className="text-xs text-haze"
                        onClick={() => {
                          openConfirm({
                            title: `Remove ${account.username}?`,
                            message: "This account will be disconnected from Shard.",
                            confirmLabel: "Remove",
                            tone: "danger",
                            onConfirm: async () => {
                              setConfirmState(null);
                              await runAction(async () => {
                                await invoke("remove_account_cmd", { id: account.uuid });
                                await loadAccounts();
                              });
                            }
                          });
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-haze/70">No accounts connected.</div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-haze font-mono">Microsoft client id</label>
                <input
                  value={config?.msa_client_id ?? ""}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...(prev ?? {}),
                      msa_client_id: event.target.value
                    }))
                  }
                  className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-accent/50"
                  placeholder="Paste your client id"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-haze font-mono">Microsoft client secret</label>
                <input
                  value={config?.msa_client_secret ?? ""}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...(prev ?? {}),
                      msa_client_secret: event.target.value
                    }))
                  }
                  className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-accent/50"
                  placeholder="Optional"
                />
              </div>
              <button
                className="w-full rounded-full bg-accent text-ink py-2 text-sm font-medium"
                onClick={handleSaveConfig}
              >
                Save settings
              </button>
            </div>
          )}
        </Drawer>
      )}

      <Modal open={activeModal === "create"} onClose={() => setActiveModal(null)} title="Create profile">
        <div className="space-y-4">
          <Field label="Profile id" error={createErrors.id}>
            <input
              value={createForm.id}
              onChange={(event) => setCreateForm({ ...createForm, id: event.target.value })}
              className={inputClass(createErrors.id)}
              placeholder="my-profile"
            />
          </Field>
          <Field label="Minecraft version" error={createErrors.mcVersion}>
            <div className="flex items-center gap-2">
              <select
                value={createForm.mcVersion}
                onChange={(event) => setCreateForm({ ...createForm, mcVersion: event.target.value })}
                className={inputClass(createErrors.mcVersion)}
              >
                <option value="">
                  {mcVersionLoading ? "Loading versions…" : "Select version"}
                </option>
                {visibleVersions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.id} {entry.type === "snapshot" ? "(snapshot)" : ""}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary whitespace-nowrap"
                onClick={refreshVersionData}
                disabled={mcVersionLoading}
              >
                {mcVersionLoading ? "Loading" : "Refresh"}
              </button>
            </div>
            {mcVersionError ? <div className="mt-1 text-[11px] text-rose-300">{mcVersionError}</div> : null}
            <div className="mt-2 flex items-center justify-between text-[11px] text-haze">
              <button
                className="text-haze hover:text-white"
                onClick={() => setShowSnapshots((value) => !value)}
              >
                {showSnapshots ? "Hide snapshots" : "Show snapshots"}
              </button>
              {latestRelease ? (
                <button
                  className="text-haze hover:text-white"
                  onClick={() => setCreateForm((prev) => ({ ...prev, mcVersion: latestRelease }))}
                >
                  Use latest release
                </button>
              ) : null}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loader type" error={createErrors.loaderType}>
              <select
                value={createForm.loaderType || "none"}
                onChange={(event) => {
                  const value = event.target.value;
                  setCreateForm((prev) => ({
                    ...prev,
                    loaderType: value === "none" ? "" : value,
                    loaderVersion: value === "none" ? "" : prev.loaderVersion
                  }));
                }}
                className={inputClass(createErrors.loaderType)}
              >
                <option value="none">None</option>
                <option value="fabric">Fabric</option>
              </select>
            </Field>
            {createForm.loaderType ? (
              <Field label="Loader version" error={createErrors.loaderVersion}>
                <select
                  value={createForm.loaderVersion}
                  onChange={(event) => setCreateForm({ ...createForm, loaderVersion: event.target.value })}
                  className={inputClass(createErrors.loaderVersion)}
                >
                  <option value="">
                    {loaderLoading ? "Loading…" : "Select loader version"}
                  </option>
                  {loaderVersions.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </select>
                {loaderError ? <div className="mt-1 text-[11px] text-rose-300">{loaderError}</div> : null}
              </Field>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-haze flex items-center">
                No loader selected
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Java path">
              <input
                value={createForm.java}
                onChange={(event) => setCreateForm({ ...createForm, java: event.target.value })}
                className={inputClass()}
                placeholder="/path/to/java"
              />
            </Field>
            <Field label="Memory">
              <input
                value={createForm.memory}
                onChange={(event) => setCreateForm({ ...createForm, memory: event.target.value })}
                className={inputClass()}
                placeholder="4G"
              />
            </Field>
          </div>
          <Field label="Extra JVM args">
            <input
              value={createForm.args}
              onChange={(event) => setCreateForm({ ...createForm, args: event.target.value })}
              className={inputClass()}
              placeholder="-Dfile.encoding=UTF-8"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleCreateProfile}>
              Create
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={activeModal === "clone"} onClose={() => setActiveModal(null)} title="Clone profile">
        <div className="space-y-4">
          <Field label="Source" error={cloneErrors.src}>
            <input
              value={cloneForm.src}
              onChange={(event) => setCloneForm({ ...cloneForm, src: event.target.value })}
              className={inputClass(cloneErrors.src)}
            />
          </Field>
          <Field label="Destination id" error={cloneErrors.dst}>
            <input
              value={cloneForm.dst}
              onChange={(event) => setCloneForm({ ...cloneForm, dst: event.target.value })}
              className={inputClass(cloneErrors.dst)}
              placeholder="new-profile"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleCloneProfile}>
              Clone
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={activeModal === "diff"} onClose={() => setActiveModal(null)} title="Diff profiles">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Profile A" error={diffErrors.a}>
              <select
                value={diffForm.a}
                onChange={(event) => setDiffForm({ ...diffForm, a: event.target.value })}
                className={inputClass(diffErrors.a)}
              >
                <option value="">Select</option>
                {profiles.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Profile B" error={diffErrors.b}>
              <select
                value={diffForm.b}
                onChange={(event) => setDiffForm({ ...diffForm, b: event.target.value })}
                className={inputClass(diffErrors.b)}
              >
                <option value="">Select</option>
                {profiles.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button className="btn-primary w-full" onClick={handleDiffProfiles}>
            Compare
          </button>
          {diffResult && (
            <div className="grid grid-cols-3 gap-3 text-sm text-haze">
              <div>
                <div className="text-xs uppercase font-mono text-haze">Only in A</div>
                <ul className="mt-2 space-y-1">
                  {diffResult.only_a.length === 0 ? <li>—</li> : diffResult.only_a.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div>
                <div className="text-xs uppercase font-mono text-haze">Only in B</div>
                <ul className="mt-2 space-y-1">
                  {diffResult.only_b.length === 0 ? <li>—</li> : diffResult.only_b.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div>
                <div className="text-xs uppercase font-mono text-haze">Both</div>
                <ul className="mt-2 space-y-1">
                  {diffResult.both.length === 0 ? <li>—</li> : diffResult.both.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={activeModal === "json"} onClose={() => setActiveModal(null)} title="Profile JSON">
        <pre className="text-xs bg-black/40 border border-white/10 rounded-xl p-4 max-h-[400px] overflow-auto font-mono">
          {profile ? JSON.stringify(profile, null, 2) : "No profile"}
        </pre>
      </Modal>

      <Modal
        open={activeModal === "add-content"}
        onClose={() => setActiveModal(null)}
        title={`Add ${tabLabel[contentKind]}`}
      >
        <div className="space-y-4">
          <button className="btn-secondary w-full" onClick={handleFilePick}>
            Choose file
          </button>
          {contentForm.input ? (
            <div className="text-xs text-haze font-mono break-all">{contentForm.input}</div>
          ) : null}
          <Field label="Or paste a URL" error={contentErrors.input}>
            <input
              value={contentForm.url}
              onChange={(event) => setContentForm({ ...contentForm, url: event.target.value })}
              className={inputClass(contentErrors.input)}
              placeholder="https://example.com/mod.jar"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name (optional)">
              <input
                value={contentForm.name}
                onChange={(event) => setContentForm({ ...contentForm, name: event.target.value })}
                className={inputClass()}
              />
            </Field>
            <Field label="Version (optional)">
              <input
                value={contentForm.version}
                onChange={(event) => setContentForm({ ...contentForm, version: event.target.value })}
                className={inputClass()}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleAddContent}>
              Add
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={activeModal === "prepare"} onClose={() => setActiveModal(null)} title="Launch plan">
        {plan ? (
          <div className="space-y-3 text-xs text-haze font-mono">
            <div>instance: {plan.instance_dir}</div>
            <div>java: {plan.java_exec}</div>
            <div>main class: {plan.main_class}</div>
            <div>classpath: {plan.classpath}</div>
            <div>jvm args: {plan.jvm_args.join(" ")}</div>
            <div>game args: {plan.game_args.join(" ")}</div>
          </div>
        ) : (
          <div className="text-sm text-haze">No plan.</div>
        )}
      </Modal>

      <Modal
        open={activeModal === "device-code"}
        onClose={() => setActiveModal(null)}
        title="Connect account"
      >
        <div className="space-y-4">
          {!deviceCode ? (
            <>
              <p className="text-sm text-haze">
                Request a device code to sign in with your Microsoft account.
              </p>
              <button className="btn-primary w-full" onClick={handleRequestDeviceCode}>
                Request device code
              </button>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-black/40 border border-white/10 p-4">
                <div className="text-xs uppercase font-mono text-haze">Code</div>
                <div className="text-2xl font-semibold tracking-widest mt-2">{deviceCode.user_code}</div>
                <div className="text-xs text-haze mt-2">{deviceCode.verification_uri}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary flex-1"
                  onClick={() => openUrl(deviceCode.verification_uri)}
                >
                  Open browser
                </button>
                <button
                  className="btn-secondary flex-1"
                  onClick={() => navigator.clipboard.writeText(deviceCode.user_code)}
                >
                  Copy code
                </button>
              </div>
              <button
                className="btn-primary w-full"
                onClick={handleFinishDeviceCode}
                disabled={devicePending}
              >
                {devicePending ? "Waiting…" : "I have signed in"}
              </button>
            </>
          )}
        </div>
      </Modal>

      {confirmState && (
        <ConfirmModal
          state={confirmState}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-black/70 border border-white/10 px-4 py-3 shadow-soft">
          <div className="text-sm font-semibold text-mist">{toast.title}</div>
          {toast.detail ? (
            <div className="text-xs text-haze mt-1 max-w-[260px]">{toast.detail}</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-haze">
      {label}
    </span>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-[200px] items-center truncate rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-haze">
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left">
      <div className="text-lg font-semibold text-mist leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-haze font-mono mt-1">{label}</div>
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div
        className="glass w-full max-w-2xl rounded-2xl p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-haze" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function Drawer({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div className="panel w-[360px] h-full p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-haze" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({
  state,
  onCancel
}: {
  state: ConfirmState;
  onCancel: () => void;
}) {
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onCancel}>
      <div
        className="glass w-full max-w-md rounded-2xl p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">{state.title}</h3>
        <p className="mt-2 text-sm text-haze">{state.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={clsx(
              "btn-primary",
              state.tone === "danger" && "bg-rose-500 text-white hover:brightness-110"
            )}
            onClick={state.onConfirm}
          >
            {state.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs uppercase tracking-widest text-haze font-mono">
      {label}
      <div className="mt-2">{children}</div>
      {error ? <div className="mt-1 text-[11px] text-rose-300 normal-case">{error}</div> : null}
    </label>
  );
}

export default App;
