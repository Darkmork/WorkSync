import { useState } from "react";
import { Mail, Plus, Trash2, X } from "lucide-react";
import type { UserProfile, WorkGroup } from "../types/worksync";

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

interface GroupEditorProps {
  group: WorkGroup;
  users: UserProfile[];
  onSave: (group: WorkGroup) => Promise<void>;
  onDelete: (groupId: string) => Promise<void>;
  onClose: () => void;
}

export function GroupEditor({ group, users, onSave, onDelete, onClose }: GroupEditorProps) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [memberIds, setMemberIds] = useState<string[]>(group.memberIds);
  const [invitedEmails, setInvitedEmails] = useState<string[]>(group.invitedEmails ?? []);
  const [emailInput, setEmailInput] = useState("");
  const [busy, setBusy] = useState(false);

  const memberUsers = memberIds.map((id) => users.find((user) => user.id === id) ?? { id, name: id, email: "", context: "", avatarUrl: undefined } as UserProfile);
  const candidates = users.filter((user) => !memberIds.includes(user.id));

  const removeMember = (id: string) => {
    if (id === group.ownerId) return;
    setMemberIds((current) => current.filter((entry) => entry !== id));
  };
  const addMember = (id: string) => setMemberIds((current) => (current.includes(id) ? current : [...current, id]));
  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!isEmail(email) || invitedEmails.includes(email) || memberUsers.some((user) => user.email.toLowerCase() === email)) return;
    setInvitedEmails((current) => [...current, email]);
    setEmailInput("");
  };
  const removeEmail = (email: string) => setInvitedEmails((current) => current.filter((entry) => entry !== email));

  const save = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onSave({ ...group, name: name.trim(), description, memberIds, invitedEmails });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (busy || !window.confirm(`Eliminar el grupo "${group.name}"? Esta accion no se puede deshacer.`)) return;
    setBusy(true);
    try {
      await onDelete(group.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-6 shadow-lift" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Editar grupo</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-text-secondary hover:text-on-surface">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <input className="w-full rounded-lg border border-border-subtle bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary" placeholder="Nombre del grupo" value={name} onChange={(event) => setName(event.target.value)} />
          <input className="w-full rounded-lg border border-border-subtle bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary" placeholder="Descripcion" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>

        <div className="mt-6">
          <p className="mb-3 font-mono text-xs uppercase text-text-secondary">Integrantes</p>
          <div className="space-y-2">
            {memberUsers.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-lg border border-border-subtle px-3 py-2">
                <img src={member.avatarUrl} alt="" className="h-8 w-8 rounded-full bg-primary-fixed" />
                <span className="min-w-0 flex-1 truncate text-sm">{member.name}</span>
                {member.id === group.ownerId ? (
                  <span className="font-mono text-[10px] uppercase text-text-secondary">dueno</span>
                ) : (
                  <button type="button" onClick={() => removeMember(member.id)} aria-label={`Quitar ${member.name}`} className="text-text-secondary hover:text-error-red">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {candidates.length > 0 && (
          <div className="mt-5">
            <p className="mb-3 font-mono text-xs uppercase text-text-secondary">Agregar usuarios</p>
            <div className="flex flex-wrap gap-2">
              {candidates.map((user) => (
                <button key={user.id} type="button" onClick={() => addMember(user.id)} className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-container-low px-3 py-1.5 text-sm text-on-surface-variant transition hover:border-primary">
                  <Plus size={14} />
                  {user.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <p className="mb-3 font-mono text-xs uppercase text-text-secondary">Invitar por correo</p>
          <div className="flex gap-2">
            <input
              type="email"
              className="flex-1 rounded-lg border border-border-subtle bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
              placeholder="persona@correo.com"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addEmail();
                }
              }}
            />
            <button type="button" onClick={addEmail} disabled={!isEmail(emailInput)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-bold text-white disabled:opacity-50">
              <Mail size={16} />
              Invitar
            </button>
          </div>
          {invitedEmails.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {invitedEmails.map((email) => (
                <span key={email} className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1.5 text-sm text-primary">
                  {email}
                  <button type="button" onClick={() => removeEmail(email)} aria-label={`Quitar ${email}`}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-7 flex items-center justify-between gap-3">
          <button type="button" onClick={del} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-error-red/40 px-4 py-2 text-sm font-bold text-error-red disabled:opacity-50">
            <Trash2 size={16} />
            Eliminar grupo
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border-subtle px-5 py-2 font-bold text-on-surface-variant">Cancelar</button>
            <button type="button" onClick={save} disabled={busy || !name.trim()} className="rounded-lg bg-primary px-5 py-2 font-bold text-white disabled:opacity-50">
              {busy ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
