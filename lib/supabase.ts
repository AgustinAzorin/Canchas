import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../Canchas/Server/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type CanchaCercana = Database['public']['Functions']['get_canchas_cercanas']['Returns'][number];

type GetCanchasCercanasParams = {
  lat: number;
  lng: number;
  radiusM?: number;
  tipos?: number[];
};

export async function getCanchasCercanas({ lat, lng, radiusM = 5000, tipos = [] }: GetCanchasCercanasParams) {
  const { data, error } = await supabase.rpc('get_canchas_cercanas', {
    lat,
    lng,
    radius_m: radiusM,
    tipos: tipos.length > 0 ? tipos : null,
  });

  if (error) {
    throw error;
  }

  return data ?? [];
}