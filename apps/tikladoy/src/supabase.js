import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wdimzayfvtlrxljpsvza.supabase.co'
const supabasePublishableKey = 'sb_publishable_FZwX09JGrJt3Q9WXW3V1dQ_-g9aegh4'

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
