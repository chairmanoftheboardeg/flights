import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "https://pxhdjwlquhkkwrcytpuc.supabase.co";
export const SUPABASE_ANON_KEY = "YeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4aGRqd2xxdWhra3dyY3l0cHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDg1NzksImV4cCI6MjA4NTUyNDU3OX0.QidPisPUGyhZF2dZl7xN5Ju9QQIjqU4HVwZTU8F2rLA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
