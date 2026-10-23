import { notFound } from 'next/navigation';
import { DataSource } from '@/lib/dataSource.js';
import FooterEditor from './FooterEditor';

export default async function FooterEditorPage({ params }) {
  const { workspaceId } = await params;
  let workspace;
  let pages = [];
  let footer = null;

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
    footer = await DataSource.getFooter(workspaceId);
  } catch (err) {
    console.warn(`Could not load footer for workspace "${workspaceId}":`, err.message);
  }

  return (
    <FooterEditor
      workspace={workspace}
      initialPages={pages || []}
      initialFooter={footer}
    />
  );
}
