<?php

namespace Tests\Feature;

use App\Support\SlotEngine;
use Tests\TestCase;

/**
 * The house edge, guarded by simulation.
 *
 * Every reel weight and payout in SlotEngine moves these numbers, and none of
 * them can be read off the constants by eye — a change that looks like a small
 * tweak to a paytable row can hand the game away. So the maths is played out
 * here against fixed seeds: the runs are deterministic, and the bounds are set
 * wide enough that only a real shift in the edge trips them.
 *
 * Measured over two million spins the game returns 95.22%, pays on 26.8% of
 * spins, opens the free spins every 230th spin, and a bought round is worth 93
 * of the 100 stakes it costs. The bounds below bracket those.
 */
class ZeusRtpTest extends TestCase
{
    /** Enough for the paid spin to settle; the bonus is sampled separately. */
    private const SPINS = 25_000;

    private const SEED = 'rtp-regression';

    public function test_the_paid_spin_keeps_the_house_ahead(): void
    {
        [$paid, $hits, $triggers] = $this->paidSpins();

        $rtp = 100 * $paid / self::SPINS;

        $this->assertGreaterThan(45.0, $rtp, 'the paid spin has gone cold — check the paytable');
        $this->assertLessThan(62.0, $rtp, 'the paid spin alone is close to giving the stake back');

        $hitRate = 100 * $hits / self::SPINS;
        $this->assertGreaterThan(22.0, $hitRate, 'too few spins pay anything to feel playable');
        $this->assertLessThan(32.0, $hitRate);

        $this->assertGreaterThan(0, $triggers);
    }

    public function test_the_free_spins_open_about_once_in_two_hundred_and_fifty_spins(): void
    {
        [, , $triggers] = $this->paidSpins();

        $oneIn = self::SPINS / $triggers;

        $this->assertGreaterThan(150, $oneIn, 'the bonus is triggering far too often');
        $this->assertLessThan(400, $oneIn, 'the bonus has become unreachable');
    }

    public function test_a_bought_round_is_worth_less_than_it_costs(): void
    {
        $rounds = 3_000;
        $total = 0.0;

        for ($i = 0; $i < $rounds; $i++) {
            $total += SlotEngine::spin(self::SEED, 'buy', $i, true)['win_units'];
        }

        $average = $total / $rounds;

        // A bought round is a long-tailed draw, so this sample is loose on
        // purpose: it is here to catch a buy that pays for itself, not to pin
        // the return to a decimal.
        $this->assertGreaterThan(55.0, $average, 'the buy has become a trap');
        $this->assertLessThan(SlotEngine::BUY_COST, $average, 'the buy pays for itself — the house is losing on it');
    }

    public function test_no_round_pays_past_the_cap(): void
    {
        for ($i = 0; $i < 2_000; $i++) {
            $this->assertLessThanOrEqual(SlotEngine::MAX_WIN, SlotEngine::spin(self::SEED, 'cap', $i, true)['win_units']);
        }
    }

    public function test_a_seed_replays_the_same_round_every_time(): void
    {
        $first = SlotEngine::spin('fixed-server', 'fixed-client', 7);
        $again = SlotEngine::spin('fixed-server', 'fixed-client', 7);

        $this->assertEquals($first, $again);

        // and the nonce is what separates one spin from the next
        $this->assertNotEquals($first, SlotEngine::spin('fixed-server', 'fixed-client', 8));
        $this->assertNotEquals($first, SlotEngine::spin('fixed-server', 'other-client', 7));
    }

    public function test_a_paid_spin_and_a_bought_round_are_shaped_as_the_client_expects(): void
    {
        $paid = SlotEngine::spin(self::SEED, 'shape', 1);

        $this->assertIsArray($paid['base']);
        $this->assertCount(SlotEngine::ROWS, $paid['base']['grid']);
        $this->assertCount(SlotEngine::COLS, $paid['base']['grid'][0]);
        $this->assertSame([], array_diff(array_keys($paid['base']['grid']), range(0, SlotEngine::ROWS - 1)));

        $bought = SlotEngine::spin(self::SEED, 'shape', 1, true);

        $this->assertNull($bought['base']);
        $this->assertCount($bought['free_spins'], $bought['free']);
        $this->assertGreaterThanOrEqual(SlotEngine::FREE_SPINS, $bought['free_spins']);
    }

    /**
     * Paid spins only: what they returned, how many paid, how many opened the
     * bonus. The bonus itself is deliberately not followed here.
     *
     * @return array{0: float, 1: int, 2: int}
     */
    private function paidSpins(): array
    {
        $paid = 0.0;
        $hits = 0;
        $triggers = 0;

        for ($i = 0; $i < self::SPINS; $i++) {
            $round = SlotEngine::spin(self::SEED, 'paid', $i);

            $paid += $round['base']['win_units'];

            if ($round['base']['win_units'] > 0) {
                $hits++;
            }

            if ($round['free_spins'] > 0) {
                $triggers++;
            }
        }

        return [$paid, $hits, $triggers];
    }
}
