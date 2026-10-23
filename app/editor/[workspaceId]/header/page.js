import { notFound } from 'next/navigation';
import { DataSource } from '@/lib/dataSource.js';
import HeaderEditor from './HeaderEditor';

export default async function HeaderEditorPage({ params }) {
  const { workspaceId } = await params;
  let workspace;
  let pages = [];
  let header = null;

  try {
    workspace = await DataSource.getWorkspace(workspaceId);
  } catch (err) {
    console.error(`Workspace not found "${workspaceId}":`, err.message);
    notFound();
  }

  try {
    pages = await DataSource.getPageList(workspaceId);
  } catch (err) {
    console.warn(`Could not load pages for workspace "${workspaceId}":`, err.message);
    pages = [];
  }

  try {
    header = await DataSource.getHeader(workspaceId);
  } catch (err) {
    console.warn(`Could not load header for workspace "${workspaceId}":`, err.message);
  }

  return (
    <HeaderEditor
      workspace={workspace}
      initialPages={pages || []}
      initialHeader={header}
    />
  );
}
