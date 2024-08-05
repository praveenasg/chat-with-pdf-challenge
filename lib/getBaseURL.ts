const getBaseURL = () =>
  process.env.mode === "development"
    ? "http://localhost:3000"
    : process.env.VERCEL_URL;

export default getBaseURL;
