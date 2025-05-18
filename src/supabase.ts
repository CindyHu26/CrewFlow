import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lfkzvyaoecpqizykgory.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxma3p2eWFvZWNwcWl6eWtnb3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MjY2NzIsImV4cCI6MjA2MzEwMjY3Mn0.tQQMg2vTkhzqSG9He-5bmu0zI3GIoJMijFNt9u1lp5I'; 

export const supabase = createClient(supabaseUrl, supabaseKey);
