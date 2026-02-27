import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`🚀 ReleaseHub360 Backend running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV ?? 'development'}`);
});
