import { useState } from "react";
import { BookOpen, BriefcaseBusiness, Calculator, Plus, Users } from "lucide-react";
import { useAppData } from "../services/AppDataContext";
import type { GroupType } from "../types/worksync";

const groupIcons: Record<GroupType, typeof Calculator> = {
  study: Calculator,
  project: BookOpen,
  work: BriefcaseBusiness,
  personal: Users,
  sports: Users,
};

export function GroupsPage() {
  const { data, createGroup } = useAppData();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<GroupType>("study");
  const [memberIds, setMemberIds] = useState<string[]>([]);

  if (!data) return <div className="rounded-xl bg-white p-8 shadow-soft">Cargando grupos...</div>;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    await createGroup({ name, description: description || "Nuevo grupo de coordinacion WorkSync.", type, memberIds });
    setName("");
    setDescription("");
    setType("study");
    setMemberIds([]);
  };

  const toggleMember = (userId: string) => {
    setMemberIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
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

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.groups.map((group) => {
          const Icon = groupIcons[group.type];
          const members = data.users.filter((user) => group.memberIds.includes(user.id));
          return (
            <article key={group.id} className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
              <div className="mb-4 flex items-start justify-between">
                <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary-fixed text-primary">
                  <Icon size={28} />
                </div>
                <span className="rounded-full bg-status-free/20 px-3 py-1 font-mono text-xs text-tertiary">{group.status}</span>
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
            </article>
          );
        })}
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
        <div className="mt-5">
          <p className="mb-3 font-mono text-xs uppercase text-text-secondary">Integrantes</p>
          <div className="flex flex-wrap gap-3">
            {data.users
              .filter((user) => user.id !== data.currentUserId)
              .map((user) => (
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
        </div>
      </form>
    </div>
  );
}
