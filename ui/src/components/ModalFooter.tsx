interface ModalFooterProps {
  onCancel: () => void;
  onSubmit: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  tone?: "default" | "danger";
}

export function ModalFooter({
  onCancel,
  onSubmit,
  cancelLabel = "Cancel",
  submitLabel = "Submit",
  tone = "default",
}: ModalFooterProps) {
  return (
    <div className="modal-footer">
      <button className="btn-secondary" onClick={onCancel}>
        {cancelLabel}
      </button>
      <button
        className={tone === "danger" ? "btn-danger" : "btn-primary"}
        onClick={onSubmit}
      >
        {submitLabel}
      </button>
    </div>
  );
}
