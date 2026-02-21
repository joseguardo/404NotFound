import { Department, Person } from "@/components/nexus/types";

const API_BASE = "http://localhost:8000/api";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Company {
  id: number;
  company_name: string;
  created_at?: string;
}

export interface APIPerson {
  id: number;
  name: string;
  surname: string;
  department: string;
  role: string;
  tasks: string[];
  is_head: boolean;
  company_name: string;
}

export interface APIDepartment {
  name: string;
  head: string;
  color_idx: number;
  people: APIPerson[];
}

export interface StructureResponse {
  company: Company;
  departments: APIDepartment[];
}

// ─── Transform Helpers ──────────────────────────────────────────────────────

function splitName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) {
    return { name: parts[0], surname: "" };
  }
  return {
    name: parts[0],
    surname: parts.slice(1).join(" "),
  };
}

function joinName(name: string, surname: string): string {
  return surname ? `${name} ${surname}` : name;
}

/**
 * Transform frontend departments to API format
 */
export function transformToAPI(departments: Department[]): APIDepartment[] {
  return departments.map((dept, idx) => ({
    name: dept.name,
    head: dept.head,
    color_idx: idx % 8,
    people: dept.people.map((person) => {
      const { name, surname } = splitName(person.name);
      return {
        id: 0, // Will be assigned by DB
        name,
        surname,
        department: dept.name,
        role: person.role,
        tasks: person.tasks,
        is_head: person.isHead,
        company_name: "",
      };
    }),
  }));
}

/**
 * Transform API response to frontend format
 */
export function transformFromAPI(data: StructureResponse): Department[] {
  return data.departments.map((dept, idx) => ({
    id: `dept-${idx}-${Date.now()}`,
    name: dept.name,
    head: dept.head || "Head",
    colorIdx: dept.color_idx ?? idx % 8,
    people: dept.people.map((person) => ({
      id: `person-${person.id}`,
      name: joinName(person.name, person.surname),
      role: person.role,
      tasks: person.tasks,
      isHead: person.is_head,
    })),
  }));
}

// ─── API Client ─────────────────────────────────────────────────────────────

export const api = {
  // ─── Companies ────────────────────────────────────────────────────────────

  async getCompanies(): Promise<Company[]> {
    const res = await fetch(`${API_BASE}/companies`);
    if (!res.ok) throw new Error("Failed to fetch companies");
    return res.json();
  },

  async createCompany(companyName: string): Promise<Company> {
    const res = await fetch(`${API_BASE}/companies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: companyName }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Failed to create company");
    }
    return res.json();
  },

  async getCompany(companyId: number): Promise<Company> {
    const res = await fetch(`${API_BASE}/companies/${companyId}`);
    if (!res.ok) throw new Error("Company not found");
    return res.json();
  },

  async deleteCompany(companyId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/companies/${companyId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete company");
  },

  // ─── Structure ────────────────────────────────────────────────────────────

  async saveStructure(companyId: number, departments: Department[]): Promise<void> {
    const apiDepartments = departments.map((dept) => ({
      name: dept.name,
      head: dept.head,
      people: dept.people.map((person) => {
        const { name, surname } = splitName(person.name);
        return {
          name,
          surname,
          department: dept.name,
          role: person.role,
          tasks: person.tasks,
          is_head: person.isHead,
        };
      }),
    }));

    const res = await fetch(`${API_BASE}/companies/${companyId}/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departments: apiDepartments }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Failed to save structure");
    }
  },

  async loadStructure(companyId: number): Promise<Department[]> {
    const res = await fetch(`${API_BASE}/companies/${companyId}/structure`);
    if (!res.ok) throw new Error("Failed to load structure");

    const data: StructureResponse = await res.json();
    return transformFromAPI(data);
  },

  // ─── People ───────────────────────────────────────────────────────────────

  async addPerson(
    companyId: number,
    person: { name: string; surname?: string; department: string; role: string; tasks?: string[]; is_head?: boolean }
  ): Promise<APIPerson> {
    const res = await fetch(`${API_BASE}/companies/${companyId}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    if (!res.ok) throw new Error("Failed to add person");
    return res.json();
  },

  async updatePerson(
    personId: number,
    updates: Partial<{ name: string; surname: string; department: string; role: string; tasks: string[]; is_head: boolean }>
  ): Promise<APIPerson> {
    const res = await fetch(`${API_BASE}/people/${personId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update person");
    return res.json();
  },

  async deletePerson(personId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/people/${personId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete person");
  },

  // ─── Transcripts ─────────────────────────────────────────────────────────

  async uploadTranscripts(companyId: number, files: File[]): Promise<void> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const res = await fetch(`${API_BASE}/companies/${companyId}/transcripts`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to upload transcripts");
    }
  },

  // ─── Health ───────────────────────────────────────────────────────────────

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
