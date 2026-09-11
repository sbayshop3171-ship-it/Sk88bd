import LinkEWallet from '@/components/LinkEWallet';

/** My Account → Bank Account: the reference's own screen for the same
    wallets, under its own title and with the + docked at the foot. */
export default function BankAccountPage() {
  return <LinkEWallet title="Bank Account" docked />;
}
