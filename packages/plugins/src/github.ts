import { Octokit } from '@octokit/rest';
import { AuraPlugin } from '@aura/plugins';

export class GitHubPlugin implements AuraPlugin {
  name = 'github';
  private octokit!: Octokit;

  async init() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GitHub token not found in environment variables');
    }
    this.octokit = new Octokit({ auth: token });
  }

  async execute(params: any) {
    const { action, repo, owner } = params;
    switch (action) {
      case 'create-release':
        const release = await this.octokit.repos.createRelease({
          owner,
          repo,
          tag_name: params.tag,
          target_commitish: params.commit,
          name: params.name,
          body: params.body,
          draft: false,
          prerelease: false,
        });
        return release.data;
      default:
        throw new Error(`Unknown GitHub action: ${action}`);
    }
  }
}
