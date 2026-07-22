import { testConnection } from './client';

testConnection()
  .then((result) => {
    console.log('Database connected. Server time:', result.now);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });