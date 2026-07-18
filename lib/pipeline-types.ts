import type { Application, Company, Role } from "@/types/database";

export type RoleWithCompany = Role & { companies: Company | null };

export type ApplicationWithRole = Application & { roles: RoleWithCompany | null };
