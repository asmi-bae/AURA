import 'reflect-metadata';
import { initializeDataSource, AppDataSource } from '../datasource.js';
import { User } from '../entities/User.js';
import { Plugin } from '../entities/Plugin.js';
import { Workflow } from '../entities/Workflow.js';
import { Log } from '../entities/Log.js';

type SeedResult = {
  users: User[];
  plugins: Plugin[];
  workflows: Workflow[];
};

const createUsers = async (): Promise<User[]> => {
  const repo = AppDataSource.getRepository(User);
  const admin = repo.create({
    name: 'Admin User',
    email: 'admin@aura.local',
    hashedPassword: 'hashed-admin-password',
    role: 'admin',
  });

  const builder = repo.create({
    name: 'Workflow Builder',
    email: 'builder@aura.local',
    hashedPassword: 'hashed-builder-password',
    role: 'user',
  });

  return repo.save([admin, builder]);
};

const createPlugins = async (): Promise<Plugin[]> => {
  const repo = AppDataSource.getRepository(Plugin);

  const github = repo.create({
    name: 'github',
    description: 'GitHub integration for issues and pull requests',
    version: '1.0.0',
    author: 'AURA Team',
  });

  const slack = repo.create({
    name: 'slack',
    description: 'Send notifications to Slack channels',
    version: '1.0.0',
    author: 'AURA Team',
  });

  return repo.save([github, slack]);
};

const createWorkflows = async (users: User[], plugins: Plugin[]): Promise<Workflow[]> => {
  const repo = AppDataSource.getRepository(Workflow);

  const [admin] = users;
  const githubPlugin = plugins.find(plugin => plugin.name === 'github');
  const slackPlugin = plugins.find(plugin => plugin.name === 'slack');

  const workflow = repo.create({
    name: 'GitHub to Slack Notifications',
    description: 'Notify Slack when a GitHub issue is created',
    owner: admin,
    nodes: {
      githubTrigger: { type: 'trigger', options: { event: 'issue.created' } },
      slackNotifier: { type: 'action', options: { channel: '#alerts' } },
    },
    connections: {
      githubTrigger: ['slackNotifier'],
    },
    settings: {
      retry: { maxAttempts: 3 },
    },
    plugins: [githubPlugin, slackPlugin].filter(Boolean) as Plugin[],
  });

  const savedWorkflow = await repo.save(workflow);

  const logRepo = AppDataSource.getRepository(Log);
  await logRepo.save([
    logRepo.create({
      workflow: savedWorkflow,
      level: 'info',
      message: 'Workflow seeded for demo purposes',
      metadata: { environment: 'development' },
    }),
  ]);

  return [savedWorkflow];
};

const seed = async (): Promise<SeedResult> => {
  await initializeDataSource();

  const users = await createUsers();
  const plugins = await createPlugins();
  const workflows = await createWorkflows(users, plugins);

  console.log('✅ Seed complete');
  return { users, plugins, workflows };
};

seed()
  .catch(error => {
    console.error('❌ Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });
