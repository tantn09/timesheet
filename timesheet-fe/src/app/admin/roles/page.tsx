import AdminShell from '../AdminShell';
import RolesAdmin from './RolesAdmin';
export default function RolesPage() { return <AdminShell requiredPermission="roles:manage"><RolesAdmin /></AdminShell>; }
