import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

class GitOps {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  // 克隆仓库
  async cloneRepo(remoteUrl: string): Promise<string> {
    const { stdout, stderr } = await execPromise(`git clone ${remoteUrl} ${this.repoPath}`);
    if (stderr) {
      throw new Error(stderr);
    }
    return stdout;
  }

  // 拉取最新代码
  async pullChanges(): Promise<string> {
    const { stdout, stderr } = await execPromise('git pull', { cwd: this.repoPath });
    if (stderr) {
      throw new Error(stderr);
    }
    return stdout;
  }

  // 提交代码（需先 add 文件）
  async commitChanges(message: string): Promise<string> {
    await execPromise('git add .', { cwd: this.repoPath });
    const { stdout, stderr } = await execPromise(`git commit -m "${message}"`, { cwd: this.repoPath });
    if (stderr) {
      throw new Error(stderr);
    }
    return stdout;
  }

  // 推送代码到远程仓库
  async pushChanges(): Promise<string> {
    const { stdout, stderr } = await execPromise('git push', { cwd: this.repoPath });
    if (stderr) {
      throw new Error(stderr);
    }
    return stdout;
  }
}

export default GitOps;