import "server-only";
import { FEEDBACK_TYPES, type FeedbackType } from "@/lib/feedback/schema";

const API = "https://api.github.com";

/** True when the server can file feedback as GitHub issues. */
export function isGithubConfigured() {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
}

async function github(path: string, init: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`github ${response.status}`);
  return response.json();
}

/** Adds an issue to the user-owned Project (v2). Needs a token with the `project` scope. */
async function addToProject(issueNodeId: string) {
  const owner = process.env.GITHUB_PROJECT_OWNER;
  const number = Number(process.env.GITHUB_PROJECT_NUMBER);
  if (!owner || !number) return;

  const lookup = await github("/graphql", {
    method: "POST",
    body: JSON.stringify({
      query: `query($owner: String!, $number: Int!) { user(login: $owner) { projectV2(number: $number) { id } } }`,
      variables: { owner, number },
    }),
  });
  const projectId = lookup.data?.user?.projectV2?.id;
  if (!projectId) throw new Error("github project not found");

  const added = await github("/graphql", {
    method: "POST",
    body: JSON.stringify({
      query: `mutation($project: ID!, $content: ID!) { addProjectV2ItemById(input: { projectId: $project, contentId: $content }) { item { id } } }`,
      variables: { project: projectId, content: issueNodeId },
    }),
  });
  if (added.errors) throw new Error("github project add failed");
}

/**
 * Files feedback as an issue and, when configured, adds it to the project board.
 * The issue is the source of truth; a failed project add does not fail the submission.
 */
export async function fileFeedback(type: FeedbackType, message: string) {
  const { label, labels } = FEEDBACK_TYPES[type];
  const title = message.split("\n")[0].replace(/\s+/g, " ").slice(0, 80);

  const issue = await github(`/repos/${process.env.GITHUB_REPO}/issues`, {
    method: "POST",
    body: JSON.stringify({
      title: `[Feedback] ${title}`,
      body: `**Type:** ${label}\n\n${message}\n\n---\n_Submitted through the Yedara feedback widget._`,
      labels: [...labels],
    }),
  });

  try {
    await addToProject(issue.node_id);
  } catch (error) {
    console.error(`[feedback] project add failed: ${error instanceof Error ? error.message : "unknown"}`);
  }
}
