import type { Modality, SessionStatus, WorkGroup } from "../types/worksync";

export function modalityLabel(modality: Modality): string {
  if (modality === "remote") return "Online";
  if (modality === "in_person") return "Presencial";
  return "Híbrida";
}

export function sessionStatusLabel(status: SessionStatus): string {
  if (status === "confirmed") return "Confirmada";
  if (status === "cancelled") return "Cancelada";
  return "Propuesta";
}

export function groupStatusLabel(status: WorkGroup["status"]): string {
  if (status === "active") return "Activo";
  if (status === "pending") return "Pendiente";
  return "Inactivo";
}
