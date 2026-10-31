import dotenv from 'dotenv'

dotenv.config({path:'.env.local'})

export const env = {
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: Number(process.env.DB_PORT),
  DB_PASSWORD: process.env.DB_PASSWORD,
  API_PORT: Number(process.env.API_PORT),
  APP_PORT: Number(process.env.APP_PORT),
  JWT_SECRET: process.env.JWT_SECRET
};
