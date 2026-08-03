import { UsersBoard } from "@/components/users/users-board";

export const metadata = {
  title: "Usuários",
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">
          Gerencie os usuários e permissões da empresa ativa
        </p>
      </div>
      <UsersBoard />
    </div>
  );
}
