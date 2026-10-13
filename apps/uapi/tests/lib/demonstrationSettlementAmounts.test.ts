/**
 * @jest-environment node
 *
 * Demonstration settlement amounts: every catalog read DataPack — even at the
 * strongest possible need-fit — settles for less than 0.00009 Sepolia ETH, so
 * demos spend tiny testnet amounts. Live mode keeps the standard mock board.
 */

import { buildDemonstrationReadImplementationOptions } from '@bitcode/asset-packs-pipelines-syntheses-domain/demonstration';
import { quoteReadSettlementSelection, resolveSettlementSpotBoard } from '@/lib/read-settlement-checkout';

const MAX_DEMO_WEI = 90_000_000_000_000n; // 0.00009 ETH

/** A Need that strongly matches every pack's core signals at once. */
const EVERYTHING_NEED =
  'retry backoff timeout flaky webhook hmac signature duplicate replay audit tamper integrity ' +
  'text-to-sql generation eval evaluation benchmark accuracy migration ddl lock downtime schema ' +
  'rate limit throttle quota token bucket';

function ethWei(quote: ReturnType<typeof quoteReadSettlementSelection>, index = 0): bigint {
  return BigInt(quote.perOption[index].rails.find((rail) => rail.payAsset === 'ETH')!.payAmount);
}

describe('demonstration settlement amounts', () => {
  const demoEnv = { ...process.env, BITCODE_DEMONSTRATION_MODE: '1' } as NodeJS.ProcessEnv;

  it('prices every catalog read pack under 0.00009 ETH', () => {
    for (const language of ['TypeScript', 'Python']) {
      const options = buildDemonstrationReadImplementationOptions({
        need: EVERYTHING_NEED,
        catalogPaths: [],
        repositoryLanguage: language,
        optionCount: 6,
      });
      for (const [index, option] of options.entries()) {
        const quote = quoteReadSettlementSelection(
          [{ index, option: option as never }],
          resolveSettlementSpotBoard(demoEnv),
        );
        const wei = ethWei(quote);
        expect(wei).toBeGreaterThan(0n);
        expect(wei).toBeLessThan(MAX_DEMO_WEI);
      }
    }
  });

  it('keeps the standard mock board outside demonstration mode', () => {
    expect(resolveSettlementSpotBoard({ BITCODE_DEMONSTRATION_MODE: '0' } as NodeJS.ProcessEnv).btdUsd).toBe(1.4);
    expect(resolveSettlementSpotBoard(demoEnv).btdUsd).toBe(0.3);
    expect(
      resolveSettlementSpotBoard({ ...demoEnv, BITCODE_DEMONSTRATION_BTD_USD: '0.1' } as NodeJS.ProcessEnv).btdUsd,
    ).toBe(0.1);
  });
});
