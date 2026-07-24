export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "TR Control ERP";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  companies: "/companies",
} as const;

export const COMPANY_ROLES = {
  owner: "owner",
  admin: "admin",
  member: "member",
} as const;

export type CompanyRole =
  (typeof COMPANY_ROLES)[keyof typeof COMPANY_ROLES];

export const COMPANY_PLANS = {
  free: "free",
  starter: "starter",
  business: "business",
  enterprise: "enterprise",
} as const;

export type CompanyPlan =
  (typeof COMPANY_PLANS)[keyof typeof COMPANY_PLANS];
