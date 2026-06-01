import { useState } from "react";
import { BookOpen, BriefcaseBusiness, Calculator, Clock, Mail, Pencil, Plus, Search, Users, X } from "lucide-react";
import { useAppData } from "../services/AppDataContext";
import { GroupEditor } from "../components/GroupEditor";
import { groupStatusLabel } from "../domain/labels";
import { filterGroups } from "../domain/search";
import { days } from "../types/worksync";
import type { GroupType, GroupWindow, WorkGroup } from "../types/worksync";

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const groupIcons: Record<GroupType, typeof Calculator> = {
  study: Calculator,
  project: BookOpen,
  work: BriefcaseBusiness,
  personal: Users,
  sports: Users,
};

// Compact, human-readable summary of a group's valid window for the card.
const windowSummary = (window: GroupWindow): string => {
  const dayLabel =
    window.days.length === 0 || window.days.length === days.length
      ? "Todos los dias"
      : days.filter((day) => window.days.includes(day.key)).map((day) => day.short).join(", ");
  return `${dayLabel} · ${window.from}-${window.to}`;
};

export function GroupsPage() {
  const { data, createGroup, updateGroup, deleteGroup } = useAppData();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<GroupType>("study");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [search, setSearch] = useState("");
  const [editingGroup, setEditingGroup] = useState<WorkGroup | null>(null);

  if (!data) return <div className="rounded-xl bg-white p-8 shadow-soft">Cargando grupos...</div>;

  const filteredGroups = filterGroups(data.groups, search);
  const otherUsers = data.users.filter((user) => user.id !== data.currentUserId);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    await createGroup({ name, description: description || "Nuevo grupo de coordinacion WorkSync.", type, memberIds, invitedEmails });
    setName("");
    setDescription("");
    setType("study");
    setMemberIds([]);
    setInvitedEmails([]);
    setEmailInput("");
  };

  const toggleMember = (userId: string) => {
    setMemberIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!isEmail(email) || invitedEmails.includes(email)) return;
    setInvitedEmails((current) => [...current, email]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    setInvitedEmails((current) => current.filter((entry) => entry !== email));
  };

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-bold">Mis grupos</h1>
          <p className="mt-2 text-text-secondary">Gestiona tus equipos y coordina horarios de manera eficiente en WorkSync.</p>
        </div>
        <a href="#nuevo-grupo" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-bold text-white">
          <Plus size={18} />
          Crear grupo
        </a>
      </section>

      <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar grupos..." className="w-full px-10 py-2 border rounded-lg pl-10 border-border-subtle bg-surface-container-low outline-none focus:ring-2 focus:ring-primary" />
          </div>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full rounded-xl border border-border-subtle bg-white p-8 text-center text-text-secondary shadow-soft">No se encontraron grupos.</div>
        ) : (
          filteredGroups.map((group) => {
            const Icon = groupIcons[group.type];
            const members = data.users.filter((user) => group.memberIds.includes(user.id));
            return (
              <article key={group.id} className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                <div className="mb-4 flex items-start justify-between">
                  <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary-fixed text-primary">
                    <Icon size={28} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-status-free/20 px-3 py-1 font-mono text-xs text-tertiary">{groupStatusLabel(group.status)}</span>
                    {group.ownerId === data.currentUserId && (
                      <button type="button" onClick={() => setEditingGroup(group)} aria-label="Editar grupo" className="rounded-lg p-2 text-text-secondary transition hover:bg-surface-container hover:text-primary">
                        <Pencil size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <h2 className="text-2xl font-bold">{group.name}</h2>
                <p className="mt-2 min-h-12 text-text-secondary">{group.description}</p>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex -space-x-3">
                    {members.slice(0, 4).map((member) => (
                      <img key={member.id} src={member.avatarUrl} alt={member.name} className="h-9 w-9 rounded-full border-2 border-white bg-primary-fixed" />
                    ))}
                  </div>
                  <span className="font-mono text-xs text-text-secondary">{group.memberIds.length} integrantes</span>
                </div>
                {group.window && (
                  <div className="mt-3 flex items-center gap-1.5 border-t border-border-subtle pt-3 font-mono text-[11px] text-text-secondary">
                    <Clock size={12} className="shrink-0 text-primary" />
                    <span className="truncate">{windowSummary(group.window)}</span>
                  </div>
                )}
                {(group.invitedEmails?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1 border-t border-border-subtle pt-3">
                    {group.invitedEmails?.map((email) => (
                      <span key={email} className="rounded-full bg-secondary-container/25 px-2 py-0.5 font-mono text-[10px] text-primary">{email} · pendiente</span>
                    ))}
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>

      <form id="nuevo-grupo" onSubmit={submit} className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-bold">Crear nuevo grupo</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_180px_auto]">
          <input className="rounded-lg border border-border-subtle bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary" placeholder="Nombre del grupo" value={name} onChange={(event) => setName(event.target.value)} />
          <input className="rounded-lg border border-border-subtle bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary" placeholder="Descripcion" value={description} onChange={(event) => setDescription(event.target.value)} />
          <select className="rounded-lg border border-border-subtle bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary" value={type} onChange={(event) => setType(event.target.value as GroupType)}>
            <option value="study">Estudio</option>
            <option value="project">Proyecto</option>
            <option value="work">Trabajo</option>
            <option value="personal">Personal</option>
          </select>
          <button className="rounded-lg bg-primary px-5 py-3 font-bold text-white">Guardar</button>
        </div>
        <div className="mt-6">
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
          <p className="mt-2 text-xs text-text-secondary">Se unen al grupo cuando inician sesion en WorkSync con ese correo.</p>
        </div>

        <div className="mt-6">
          <p className="mb-3 font-mono text-xs uppercase text-text-secondary">Usuarios existentes</p>
          {otherUsers.length === 0 ? (
            <p className="text-sm text-text-secondary">Aun no hay otros usuarios registrados. Invitalos por correo arriba.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {otherUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleMember(user.id)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                    memberIds.includes(user.id)
                      ? "border-primary bg-primary-fixed text-primary"
                      : "border-border-subtle bg-surface-container-low text-on-surface-variant"
                  }`}
                >
                  <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
                  {user.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>

      {editingGroup && (
        <GroupEditor
          group={editingGroup}
          users={data.users}
          onSave={updateGroup}
          onDelete={deleteGroup}
          onClose={() => setEditingGroup(null)}
        />
      )}
    </div>
  );
}
