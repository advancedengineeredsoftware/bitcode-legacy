/**
 * /oauth/authorize — consent for connecting an MCP client (Claude) to Bitcode
 * (V49 Claude External law C-3). Requires a Bitcode session; shows the client
 * name, redirect host, and scopes; Allow / Deny post to /api/oauth/authorize,
 * which re-validates and redirects with a single-use code (PKCE S256).
 */

import React from 'react';

import { createClient } from '@bitcode/supabase/ssr/server';

import { getOAuthService } from '@/lib/oauth/oauth-http';
import { OAuthError } from '@/lib/oauth/oauth-service';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

const SCOPE_COPY: Record<string, string> = {
  deposits: 'Synthesize deposit DataPack options from repositories you connected',
  reads: 'Synthesize read DataPack options against your Evaluations',
  packs: 'View your owned and sold DataPacks, measurements, and account panes',
};

function toQuery(searchParams: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') params.set(key, value);
  }
  return params;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-12 text-white">
      <section className="w-full max-w-md border border-white/10 bg-white/[0.035] px-6 py-6" data-testid="oauth-consent">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-orange-200/80">Bitcode</p>
        {children}
      </section>
    </main>
  );
}

export default async function OAuthAuthorizePage({ searchParams }: { searchParams: SearchParams }) {
  const query = toQuery(searchParams);
  let request;
  try {
    request = await getOAuthService().validateAuthorizeRequest(query);
  } catch (error) {
    const message = error instanceof OAuthError ? error.description : 'This authorization request is invalid.';
    return (
      <Shell>
        <h1 className="mt-2 text-lg font-semibold">Can&apos;t connect this app</h1>
        <p className="mt-2 text-sm text-neutral-400" data-testid="oauth-consent-error">
          {message}
        </p>
      </Shell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const redirectHost = new URL(request.redirectUri).host;

  if (!user) {
    return (
      <Shell>
        <h1 className="mt-2 text-lg font-semibold">Sign in to Bitcode</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          <strong className="text-white">{request.client.clientName}</strong> wants to connect to your Bitcode
          account. Sign in first, then continue here.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/?auxillary-open-to=profile"
            target="_blank"
            rel="noreferrer"
            className="border border-orange-300/40 bg-orange-300/10 px-3 py-1.5 text-sm text-orange-100"
          >
            Sign in
          </a>
          <a href={`/oauth/authorize?${query.toString()}`} className="border border-white/15 px-3 py-1.5 text-sm text-neutral-200">
            Continue
          </a>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mt-2 text-lg font-semibold">Connect {request.client.clientName} to Bitcode</h1>
      <p className="mt-2 text-sm leading-6 text-neutral-400">
        Signed in as {user.email ?? 'your account'}. After you allow access, you&apos;ll return to{' '}
        <span className="font-mono text-neutral-200">{redirectHost}</span>.
      </p>
      <ul className="mt-4 grid gap-2 text-sm" data-testid="oauth-consent-scopes">
        {request.scopes.map((scope) => (
          <li key={scope} className="border border-white/10 bg-black/30 px-3 py-2">
            <span className="font-mono text-xs text-orange-100">{scope}</span>
            <span className="mt-0.5 block text-neutral-300">{SCOPE_COPY[scope]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-neutral-500">
        Bitcode never receives your Anthropic credentials. You can revoke access anytime in Auxillaries → Externals.
      </p>
      <form method="post" action="/api/oauth/authorize" className="mt-4 flex gap-2">
        <input type="hidden" name="query" value={query.toString()} />
        <button
          type="submit"
          name="decision"
          value="allow"
          data-testid="oauth-consent-allow"
          className="border border-emerald-300/40 bg-emerald-300/10 px-4 py-1.5 text-sm text-emerald-100"
        >
          Allow
        </button>
        <button
          type="submit"
          name="decision"
          value="deny"
          data-testid="oauth-consent-deny"
          className="border border-white/15 px-4 py-1.5 text-sm text-neutral-200"
        >
          Deny
        </button>
      </form>
    </Shell>
  );
}
