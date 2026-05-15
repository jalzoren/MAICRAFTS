import 'dotenv/config';
import { supabaseAdmin } from './supabaseClient.js';
import { encrypt } from './utils/encryption.js';

async function migrate() {
  console.log('Fetching users with plaintext contact_number...');
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, contact_number')
    .not('contact_number', 'is', null);

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log(`Found ${users.length} users with phone numbers.`);
  for (const user of users) {
    if (user.contact_number && user.contact_number.trim() !== '') {
      const encrypted = encrypt(user.contact_number);
      const { error: updateErr } = await supabaseAdmin
        .from('users')
        .update({ contact_number_encrypted: encrypted })
        .eq('id', user.id);
      if (updateErr) {
        console.error(`Failed to update user ${user.id}:`, updateErr);
      } else {
        console.log(`✅ Migrated user ${user.id}`);
      }
    }
  }
  console.log('Migration complete.');
}

migrate();