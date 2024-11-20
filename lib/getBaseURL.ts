const getBaseURL = () =>
  process.env.mode === "development"
    ? "http://localhost:3000"
    : `https://${process.env.VERCEL_URL}`;

export default getBaseURL;
