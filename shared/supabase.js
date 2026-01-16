import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://tycesgqoyckjfntzzyvf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5Y2VzZ3FveWNramZudHp6eXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxOTU1NjMsImV4cCI6MjA4Mzc3MTU2M30.YGAEer_7NrK8Dy1dEU3G0oRWbrBoQTTfZSLdagdzG-E";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
<<<<<<< HEAD
export default supabase;
=======
export default supabase;
>>>>>>> 6a39cf2383a1d0d4905c489df7f1c36aeb42b6ba
