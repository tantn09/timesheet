import AdminShell from '../AdminShell';
import UsersAdmin from './UsersAdmin';
export default function UsersPage() { return <AdminShell requiredPermission="users:manage"><UsersAdmin /></AdminShell>; }
