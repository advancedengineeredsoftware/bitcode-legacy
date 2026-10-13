#!/usr/bin/env node
/**
 * Provision the demonstration account (operator tooling, not product law).
 *
 * Verifies that the account behind BITCODE_DEMONSTRATION_ACCOUNT_ADDRESS (the
 * wallet-email principal Bitcode wallet sign-in resolves to) is demo-ready:
 *   - wallet binding verified for that address,
 *   - active GitHub App connection with an installation + repository inventory,
 *   - Auxillaries onboarding complete.
 * With --apply it completes onboarding (idempotent). It never fabricates a
 * wallet binding or GitHub installation — those require the real wallet
 * signature and App install, and are reported as presenter actions instead.
 *
 * Usage (from repo root; reads apps/uapi/.env.local):
 *   pnpm run demo:provision            # dry run
 *   pnpm run demo:provision -- --apply # complete onboarding
 *   node scripts/demonstration/provision-demonstration-account.mjs --address 0x… --apply
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const UAPI = path.join(ROOT, 'apps', 'uapi');
const require = createRequire(path.join(UAPI, 'package.json'));
const { createClient } = require('@supabase/supabase-js');

const WALLET_EMAIL_DOMAIN = 'ethereum.wallet.bitcode.local';
const ONBOARDING_STEPS = ['profile', 'wallet', 'externals', 'interfaces'];

function readEnvFile(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

const env = { ...readEnvFile(path.join(UAPI, '.env.local')), ...process.env };
const apply = process.argv.includes('--apply');
const address = String(argValue('--address') || env.BITCODE_DEMONSTRATION_ACCOUNT_ADDRESS || '')
  .trim()
  .toLowerCase();
if (!/^0x[0-9a-f]{40}$/.test(address)) {
  console.error('Set BITCODE_DEMONSTRATION_ACCOUNT_ADDRESS (or pass --address 0x…).');
  process.exit(2);
}
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('Supabase URL + service role key are required (apps/uapi/.env.local).');
  process.exit(2);
}
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function findWalletEmailUser(email) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((user) => (user.email || '').toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

function parseSteps(value) {
  try {
    const parsed = Array.isArray(value) ? value : JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter((step) => ONBOARDING_STEPS.includes(step)) : [];
  } catch {
    return [];
  }
}

const presenterActions = [];
const user = await findWalletEmailUser(`${address}@${WALLET_EMAIL_DOMAIN}`);
console.log(`Demonstration account ${address}`);
if (!user) {
  console.log('  account: not found');
  console.log('  → Presenter action: sign in once at /auxillaries with this wallet (Connect Ethereum wallet).');
  process.exit(1);
}
console.log('  account: found');

const { data: profile } = await admin.from('user_profiles').select('*').eq('id', user.id).maybeSingle();
const binding = profile?.settings?.bitcodeProfile?.walletBinding || profile?.settings?.walletBinding || null;
const walletReady = binding?.status === 'verified' && String(binding?.address || '').toLowerCase() === address;
console.log(`  wallet binding verified: ${walletReady}`);
if (!walletReady) presenterActions.push('Connect + sign with this wallet in Auxillaries → Wallet.');

const { data: github } = await admin
  .from('user_connections')
  .select('is_active, connection_data')
  .eq('user_id', user.id)
  .eq('provider', 'github')
  .maybeSingle();
const installationId = github?.connection_data?.connectionId || github?.connection_data?.installation_id || null;
const { count: repositoryCount } = await admin
  .from('vcs_repositories')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id);
const githubReady = Boolean(github?.is_active && installationId);
console.log(`  GitHub App connected: ${githubReady} (repositories: ${repositoryCount ?? 0})`);
if (!githubReady) presenterActions.push('Install the Bitcode GitHub App in Auxillaries → Externals.');

const steps = parseSteps(profile?.onboarded_steps);
const onboardingComplete = ONBOARDING_STEPS.every((step) => steps.includes(step));
console.log(`  onboarding complete: ${onboardingComplete} (${steps.join(', ') || 'none'})`);
if (!onboardingComplete) {
  if (apply) {
    const { error } = await admin
      .from('user_profiles')
      .update({ onboarded_steps: JSON.stringify(ONBOARDING_STEPS), updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) throw error;
    console.log('  ✓ onboarding marked complete');
  } else {
    console.log('  (dry run) would mark onboarding complete — re-run with --apply');
  }
}

const opening = env.BITCODE_DEMONSTRATION_OPENING_BTD || '1000 (default)';
console.log(`  opening BTD in demonstration mode: ${opening}`);
if (presenterActions.length) {
  console.log('Presenter actions required:');
  for (const action of presenterActions) console.log(`  → ${action}`);
  process.exit(1);
}
console.log(apply || onboardingComplete ? 'Demonstration account ready.' : 'Ready after --apply.');
