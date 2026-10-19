import { notFound } from 'next/navigation';
import { DataSource } from '../../../../lib/dataSource.js';
import Editor from '../../../Editor';
import TemplatePicker from './TemplatePicker';

export default async function WorkspacePostEditorPage({ params }) {
  const { workspaceId, postId } = await params;

  let workspace;
  let themeBundle;
  let pageData = null;

  try {
    workspace = await DataSource.getWorkspace(workspaceId);
    themeBundle = await DataSource.getThemeBundle(workspaceId);
  } catch (err) {
    console.error(`Failed to load workspace or theme for "${workspaceId}":`, err);
    notFound();
  }

  try {
    pageData = await DataSource.getPageContent(workspaceId, postId);
  } catch (err) {
    // Page does not exist yet (e.g. newly created in WordPress)
    pageData = null;
  }

  // Load Header and Footer configurations for workspace preview
  let header = null;
  let footer = null;

  try {
    header = await DataSource.getHeader(workspaceId);
  } catch (err) {
    console.error(`Failed to load header for "${workspaceId}":`, err);
  }

  try {
    footer = await DataSource.getFooter(workspaceId);
  } catch (err) {
    console.error(`Failed to load footer for "${workspaceId}":`, err);
  }

  // If page content has not been created yet, show the template picker
  if (!pageData) {
    return (
      <TemplatePicker
        workspace={workspace}
        themeBundle={themeBundle}
        postId={postId}
      />
    );
  }

  return (
    <Editor
      mode="workspace"
      workspace={workspace}
      pageData={pageData}
      initialTheme={themeBundle.theme}
      initialThemeCss={themeBundle.styleCss}
      initialCustomCss={themeBundle.customCss || ''}
      initialComponents={themeBundle.components}
      initialVariants={themeBundle.pageTemplates}
      initialHeader={header}
      initialFooter={footer}
    />
  );
}
