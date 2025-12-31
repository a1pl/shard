import { Modal } from "../Modal";
import type { Profile } from "../../types";

interface ProfileJsonModalProps {
  open: boolean;
  profile: Profile | null;
  onClose: () => void;
}

const highlightJson = (value: string) => {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "json-token-number";
      if (match[0] === "\"") {
        cls = match.endsWith(":") ? "json-token-key" : "json-token-string";
      } else if (match === "true" || match === "false") {
        cls = "json-token-boolean";
      } else if (match === "null") {
        cls = "json-token-null";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
};

export function ProfileJsonModal({ open, profile, onClose }: ProfileJsonModalProps) {
  const json = profile ? JSON.stringify(profile, null, 2) : "No profile";
  return (
    <Modal open={open} onClose={onClose} title="Profile JSON" large>
      <pre className="json-viewer">
        <code
          className="json-code"
          dangerouslySetInnerHTML={{ __html: highlightJson(json) }}
        />
      </pre>
    </Modal>
  );
}
