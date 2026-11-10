import AdminShell from '../AdminShell';
import ProjectsAdmin from './ProjectsAdmin';
export default function ProjectsPage() { return <AdminShell requiredPermission="projects:manage"><ProjectsAdmin /></AdminShell>; }
