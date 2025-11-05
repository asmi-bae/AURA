import 'reflect-metadata';
import { initializeDataSource, AppDataSource } from '../datasource.js';

const runMigrations = async () => {
  await initializeDataSource();
  const pending = await AppDataSource.showMigrations();
  if (pending) {
    await AppDataSource.runMigrations();
    console.log('✅ Migrations executed successfully');
  } else {
    console.log('ℹ️  No pending migrations');
  }
};

runMigrations()
  .catch(error => {
    console.error('❌ Migration run failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });
