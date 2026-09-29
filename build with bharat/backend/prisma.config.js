import dotenv from 'dotenv';
dotenv.config();

export default {
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5435/nidusclean?schema=public',
  },
};
