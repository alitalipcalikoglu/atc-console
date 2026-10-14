import { redirect } from '@sveltejs/kit';
import { Runtime } from '#lib/server/runtime.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
  if (!locals.principal || !locals.session || locals.session.totpPending) redirect(303, '/login');
  // REQUIRE_TOTP: an account without a second factor can only reach the account page until it has one.
  const mustEnrol = Runtime.get().config.requireTotp && !locals.principal.totpEnabled;
  if (mustEnrol && url.pathname !== '/account') redirect(303, '/account');
  return { mustEnrol };
};
