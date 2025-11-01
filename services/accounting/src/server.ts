import app from './app';

const port = process.env.PORT || 3007;

app.listen(port, () => {
  console.log(`🚀 Accounting Service is running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💰 Database: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`🔧 Health check available at: http://localhost:${port}/health`);
  console.log(`📋 API documentation at: http://localhost:${port}/api/v1/accounting`);
});