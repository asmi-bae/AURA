import 'reflect-metadata';
import { initializeDataSource, AppDataSource } from '../datasource.js';

const revertMigrations = async () => {
  await initializeDataSource();
  await AppDataSource.undoLastMigration();
  console.log('↩️  Last migration reverted');
};

revertMigrations()
  .catch(error => {
    console.error('❌ Migration revert failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });
