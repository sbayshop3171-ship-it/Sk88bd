/* ============================================================
   Bangla → English copy migration.

   The cashier and the banner slides are admin-editable and live in
   `.data/*.json` on the server, so switching the shipped defaults to English
   is not enough on its own: a server that already has a saved config would
   keep serving the Bangla copy it stored months ago.

   This maps every Bangla string the site ever shipped as a default onto its
   English replacement, and the two stores run saved values through it on
   read. Anything the operator typed themselves is left exactly as it is —
   only strings that came from a shipped default are recognised.

   Once every live `.data/` file has been re-saved through the panel this
   module is dead weight and can go.
   ============================================================ */

/** Shipped default → its English replacement. */
export const BANGLA_COPY: Record<string, string> = {
  "পেমেন্ট": "Payment",
  "ক্যাশ আউট": "Cash Out",
  "সেন্ড মানি": "Send Money",
  "ট্রান্সফার": "Transfer",
  "+10% বোনাস": "+10% Bonus",
  "মোট ওয়ালেট ব্যালেন্সের উপর": "On the total wallet balance",
  "শুধু উত্তোলনের পরিমাণের উপর": "On the withdrawal amount only",
  "24 ঘন্টা": "24 hours",
  "এজেন্ট ক্যাশআউট চার্জ": "Agent Cash-Out Charge",
  "ডিপোজিট মেথড": "Deposit Method",
  "পেমেন্ট চ্যানেল": "Payment Channel",
  "ডিপোজিট পরিমাণ": "Deposit Amount",
  "এই নাম্বারে শুধুমাত্র নির্ধারিত মেথডে পেমেন্ট গ্রহণ করা হয়": "This number accepts payments through the selected method only",
  "কম বা বেশি পাঠাবেন না": "Do not send more or less",
  "আপনি যদি টাকার পরিমাণ পরিবর্তন করেন, আপনি ক্রেডিট পেতে সক্ষম হবেন না।": "If you change the amount you will not be able to receive the credit.",
  "ওয়ালেট নাম্বার": "Wallet Number",
  "কিভাবে পাঠাবেন": "How to send",
  "অ্যাপ খুলুন\nউপরের মেনু বেছে নিন\nনাম্বার দিন\nAmount দিন\nReference দিন\nPIN দিয়ে নিশ্চিত করুন\nTrxID কপি করুন": "Open the app\nPick the menu above\nEnter the number\nEnter the amount\nEnter the reference\nConfirm with your PIN\nCopy the TrxID",
  "পেমেন্টের TrxID নাম্বারটি লিখুন": "Enter the TrxID of your payment",
  "কিভাবে TrxID পেতে হয় তা দেখতে ক্লিক করুন": "Click to see how to find your TrxID",
  "যেমন: 9F2K4L8M": "e.g. 9F2K4L8M",
  "নিশ্চিত করুন": "Confirm",
  "এই অর্ডার একবারই জমা দেওয়া যাবে। আপনার ট্রানজেকশন আইডি সঠিক কিনা নিশ্চিত করুন:": "This order can only be submitted once. Make sure your transaction ID is correct:",
  "সতর্কতা:": "Caution:",
  "লেনদেন আইডি সঠিকভাবে পূরণ করতে হবে, অন্যথায় অর্ডার ব্যর্থ হবে! অনুগ্রহ করে নিশ্চিত হয়ে নিন যে আপনি দেখানো নাম্বারেই টাকা পাঠিয়েছেন। অন্য কোনো নাম্বারে পাঠালে সেই টাকা পাওয়ার কোনো সম্ভাবনা নেই।": "The transaction ID must be filled in correctly or the order will fail. Please make sure you sent the money to the number shown here — money sent to any other number cannot be recovered.",
  "সফলভাবে জমা হয়েছে!": "Submitted successfully!",
  "আপনার ডিপোজিট অর্ডার সফলভাবে জমা দেওয়া হয়েছে। সিস্টেম ৫ মিনিটের মধ্যে যাচাই করা শুরু করবে।": "Your deposit order has been submitted. The system starts verifying it within 5 minutes.",
  "প্রমোশন": "Promotion",
  "সর্বনিম্ন ডিপোজিট {min}": "Minimum deposit {min}",
  "একবারে {min} টাকার কম পাঠাবেন না। এর চেয়ে কম পাঠালে সেই টাকা অ্যাকাউন্টে যোগ করা হবে না এবং ফেরতও দেওয়া হবে না। একবারে সর্বোচ্চ {max} পাঠানো যাবে।": "Do not send less than {min} in one transaction. Anything below that is not credited to your account and cannot be refunded. The most you can send at once is {max}.",
  "অ্যাকাউন্ট নাম্বার": "Account number",
  "TRC20 অ্যাড্রেস": "TRC20 address",
  "২৪ ঘন্টা": "24 hours",
  "উত্তোলনের আগে অনুগ্রহ করে নিশ্চিত করুন যে আপনার ই-ওয়ালেট (bKash, Nagad) সঠিকভাবে যুক্ত আছে। তথ্য ভুল হলে লেনদেন বিলম্বিত হতে পারে বা ব্যর্থ হতে পারে।": "Before withdrawing, please make sure your e-wallet (bKash, Nagad) is added correctly. Wrong details can delay or fail the transaction.",
  "নিবন্ধিত ই-ওয়ালেট": "Registered E-Wallets",
  "খালি ই-ওয়ালেট": "No e-wallet yet",
  "উত্তোলন পরিমাণ": "Withdrawal Amount",
  "লেনদেন পাসওয়ার্ড": "Transaction Password",
  "আপনার লগইন পাসওয়ার্ডটি দিন": "Enter your login password",
  "রিকোয়েস্ট করার সাথে সাথে টাকা ব্যালেন্স থেকে সরিয়ে রাখা হবে। অ্যাডমিন অনুমোদন করলে পাঠানো হবে, বাতিল করলে ব্যালেন্সে ফেরত আসবে।": "The amount is held aside the moment you request it. It is sent once an admin approves, and returned to your balance if the request is rejected.",
  "উত্তোলন চার্জ": "Withdrawal Charge",
  "প্রতি ১,০০০ টাকায় {rate} হারে এজেন্ট ক্যাশআউট চার্জ দিতে হবে।": "An agent cash-out charge of {rate} per ৳1,000 applies.",
  "চার্জ পরিশোধ না করলে উত্তোলনের টাকা ছাড় করা হবে না।": "The withdrawal is not released until the charge is paid.",
  "উত্তোলন সারাংশ": "Withdrawal Summary",
  "শুধুমাত্র আমাদের দেওয়া এজেন্ট নাম্বারে চার্জ পাঠাবেন, অন্যথায় উত্তোলন সফল হবে না।": "Send the charge only to the agent number we give you, otherwise the withdrawal will not go through.",
  "উত্তোলন নিয়মাবলী": "Withdrawal Rules",
  "নিজের নামে থাকা সঠিক অ্যাকাউন্ট নাম্বার দিন": "Give a correct account number held in your own name",
  "এক রিকোয়েস্টে সর্বোচ্চ {max} তোলা যাবে": "You can withdraw up to {max} in a single request",
  "!এজেন্ট ক্যাশআউট চার্জ মোট ওয়ালেট ব্যালেন্সের উপর হিসাব করা হয়": "!The agent cash-out charge is calculated on your total wallet balance",
  "!প্রতি ১,০০০ টাকায় {rate} চার্জ": "!{rate} charge per ৳1,000",
  "!সম্পূর্ণ চার্জ একবারেই পরিশোধ করতে হবে": "!The full charge must be paid in one go",
  "উত্তোলনের জন্য আবেদন করুন": "Apply for withdrawal",
  "চার্জ পরিশোধ": "Pay the charge",
  "নিচের এজেন্ট নাম্বারে চার্জ পাঠিয়ে TrxID দিন — তবেই উত্তোলন প্রক্রিয়া শুরু হবে।": "Send the charge to the agent number below and enter the TrxID — only then does the withdrawal start processing.",
  "এই নাম্বারে শুধুমাত্র ক্যাশ আউট গ্রহণ করা হয়": "This number accepts cash out only",
  "ঠিক এই পরিমাণ পাঠাতে হবে — কম বা বেশি নয়": "Send exactly this amount — no more, no less",
  "গুরুত্বপূর্ণ নির্দেশনা": "Important instructions",
  "পুরো চার্জ {charge} এক ট্রানজেকশনেই ক্যাশ আউট করুন": "Cash out the whole {charge} charge in a single transaction",
  "উপরে দেখানো এজেন্ট নাম্বার ছাড়া অন্য কোথাও পাঠাবেন না": "Do not send it anywhere but the agent number shown above",
  "চার্জ পেমেন্টের TrxID লিখুন": "Enter the TrxID of the charge payment",
  "লেনদেন আইডি সঠিকভাবে দিতে হবে, না হলে উত্তোলন বাতিল হয়ে যাবে।": "The transaction ID must be correct, or the withdrawal is cancelled.",
  "মোবাইল রিচার্জ": "Mobile Recharge",
  "+১০% বোনাস": "+10% Bonus",
  "সবুজ": "Green",
  "বেগুনি": "Purple",
  "নীল": "Blue",
  "কমলা": "Orange",
  "সাইন আপ বোনাস": "Sign Up Bonus",
  "১৮৳ ফ্রি বোনাস": "৳18 Free Bonus",
  "৳১৮": "৳18",
  "এখনই নিন": "Claim Now",
  "প্রতিবার ডিপোজিট": "Every Deposit",
  "৫% ডিপোজিট বোনাস": "5% Deposit Bonus",
  "৫%": "5%",
  "ডিপোজিট করুন": "Deposit Now",
  "মাসিক ক্যাশব্যাক": "Monthly Cashback",
  "১% রিবেট ক্যাশব্যাক": "1% Rebate Cashback",
  "১%": "1%",
  "বিস্তারিত": "Details",
  "রেফার প্রোগ্রাম": "Refer Programme",
  "বন্ধু আনুন, কমিশন নিন": "Bring a friend, earn commission",
  "৪০%": "40%",
  "রেফার করুন": "Refer Now",
  "অ্যাপ ডাউনলোড করলেই বোনাস": "Download the app for a bonus",
  "সাইন আপ করে নাম্বার ভেরিফাই করুন": "Sign up and verify your number",
  "প্রতিবার ডিপোজিট বোনাস": "Bonus on every deposit",
  "আজীবন, প্রতিটি ডিপোজিটে": "For life, on every single deposit",
  "মাসিক রিবেট ক্যাশব্যাক": "Monthly rebate cashback",
  "প্রতি মাসে অটোমেটিক জমা": "Credited automatically each month",
  "চার্জ যাচাই হলে {time} এর মধ্যে টাকা পাঠানো হবে":
    "The money is sent within {time} once the charge is verified",
  "মেম্বারশিপ": "Membership",
  "ভিআইপি মেম্বারশিপ সুবিধা": "VIP Membership Benefits",
};

/** The per-channel deposit note was a template, so it needs its own rule. */
const DEPOSIT_NOTE =
  /^এই (.+?) নাম্বারে টাকা পাঠিয়ে ট্রানজেকশন আইডি দিন। অ্যাডমিন যাচাই করলে ব্যালেন্সে যোগ হবে।$/;

/** The tile badge used to carry Bengali digits: "+১০% বোনাস". */
const BONUS_BADGE = /^\+([০-৯\d]+)% বোনাস$/;
const BN_DIGIT = '০১২৩৪৫৬৭৮৯';
const latinDigits = (s: string) =>
  s.replace(/[০-৯]/g, (d) => String(BN_DIGIT.indexOf(d)));

/** One string. Multi-line values (the how-to steps, the withdrawal rules) are
    translated a line at a time, since an operator may have edited one line of
    a shipped list and left the rest alone. */
export function englishLine(value: string): string {
  const hit = BANGLA_COPY[value];
  if (hit !== undefined) return hit;

  const note = DEPOSIT_NOTE.exec(value);
  if (note) {
    return `Send the money to this ${note[1]} number and enter the transaction ID. `
      + 'It is credited to your balance once an admin verifies it.';
  }

  const badge = BONUS_BADGE.exec(value);
  if (badge) return `+${latinDigits(badge[1])}% Bonus`;

  if (value.includes('\n')) {
    const lines = value.split('\n');
    const next = lines.map((line) => englishLine(line));
    if (next.some((line, i) => line !== lines[i])) return next.join('\n');
  }

  return value;
}

/** Every string inside a stored config object, translated in place. */
export function englishCopy<T>(value: T): T {
  if (typeof value === 'string') return englishLine(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => englishCopy(v)) as unknown as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, englishCopy(v)]),
    ) as T;
  }
  return value;
}

/* ============================================================
   English → Bangla, for the pay screens only.

   The lobby and the cashier's first step are English, because that is what
   the reference shows and what players arriving from it expect. The screen
   where money actually leaves somebody's hand is not: there the reference
   writes Bangla, and so do we — a warning about losing a deposit has to be
   read, not decoded.

   This runs after englishCopy on the cashier store, so a server still
   holding the older Bangla defaults goes Bangla → English → this Bangla and
   lands on one wording either way. Only strings that were shipped defaults
   are listed; anything the operator typed is left alone.
   ============================================================ */
export const PAY_SCREEN_BANGLA: Record<string, string> = {
  'This number accepts payments through the selected method only':
    'এই নাম্বারে শুধুমাত্র নির্ধারিত মেথডে পেমেন্ট গ্রহণ করা হয়',
  'Do not send more or less': 'কম বা বেশি পাঠাবেন না',
  'If you change the amount you will not be able to receive the credit.':
    'আপনি যদি টাকার পরিমাণ পরিবর্তন করেন, আপনি ক্রেডিট পেতে সক্ষম হবেন না।',
  'How to send': 'কিভাবে পাঠাবেন',
  'Open the app\nPick the menu above\nEnter the number\nEnter the amount\nEnter the reference\nConfirm with your PIN\nCopy the TrxID':
    'অ্যাপ খুলুন\nউপরের মেনু বেছে নিন\nনাম্বার দিন\nটাকার পরিমাণ দিন\nPIN দিয়ে নিশ্চিত করুন\nTrxID কপি করুন',
  'Enter the TrxID of your payment': 'পেমেন্টের TrxID নাম্বারটি লিখুন',
  'Click to see how to find your TrxID': 'কিভাবে TrxID পাবেন দেখে নিন',
  'e.g. 9F2K4L8M': 'TrxID অবশ্যই পূরণ করতে হবে!',
  Confirm: 'নিশ্চিত করুন',
  'This order can only be submitted once. Make sure your transaction ID is correct:':
    'এই অর্ডারটি একবারই জমা দেওয়া যাবে। আপনার লেনদেন আইডি ঠিক আছে কিনা দেখে নিন:',
  'Caution:': 'সতর্কতাঃ',
  'The transaction ID must be filled in correctly or the order will fail. Please make sure you sent the money to the number shown here — money sent to any other number cannot be recovered.':
    'লেনদেন আইডি সঠিকভাবে পূরণ করতে হবে, অন্যথায় অর্ডারটি ব্যর্থ হবে। অনুগ্রহ করে নিশ্চিত হয়ে নিন যে এখানে দেখানো নাম্বারেই টাকা পাঠিয়েছেন — অন্য কোনো নাম্বারে পাঠানো টাকা ফেরত পাওয়ার সুযোগ নেই।',
  'Submitted successfully!': 'সফলভাবে জমা হয়েছে!',

  // Step one, but it is the warning that decides whether a player loses a
  // deposit by sending the wrong amount — so it reads in their language.
  'Minimum deposit {min}': 'সর্বনিম্ন ডিপোজিট {min}',
  'Do not send less than {min} in one transaction. Anything below that is not credited to your account and cannot be refunded. The most you can send at once is {max}.':
    'একবারে {min} টাকার কম পাঠাবেন না। এর চেয়ে কম পাঠালে সেই টাকা অ্যাকাউন্টে যোগ করা হবে না এবং ফেরতও দেওয়া হবে না। একবারে সর্বোচ্চ {max} পাঠানো যাবে।',
  'Your deposit order has been submitted. The system starts verifying it within 5 minutes.':
    'আপনার ডিপোজিট অর্ডারটি জমা হয়েছে। ৫ মিনিটের মধ্যে যাচাই শুরু হবে।',

  'Withdrawal Summary': 'উত্তোলনের বিবরণ',
  'Send the charge only to the agent number we give you, otherwise the withdrawal will not go through.':
    'চার্জটি শুধুমাত্র আমাদের দেওয়া এজেন্ট নাম্বারেই পাঠাবেন, নাহলে উত্তোলনটি হবে না।',
  'Agent Cash-Out Charge': 'এজেন্ট ক্যাশআউট চার্জ',
  'Withdrawal Rules': 'উত্তোলনের নিয়ম',
  'Give a correct account number held in your own name':
    'নিজের নামে থাকা সঠিক অ্যাকাউন্ট নাম্বার দিন',
  'You can withdraw up to {max} in a single request':
    'এক রিকোয়েস্টে সর্বোচ্চ {max} তোলা যাবে',
  '!The agent cash-out charge is calculated on your total wallet balance':
    '!এজেন্ট ক্যাশআউট চার্জ মোট ওয়ালেট ব্যালেন্সের উপর হিসাব করা হয়',
  '!{rate} charge per ৳1,000': '!প্রতি ১,০০০ টাকায় {rate} চার্জ',
  '!The full charge must be paid in one go': '!সম্পূর্ণ চার্জ একবারেই পরিশোধ করতে হবে',
  'The money is sent within {time} once the charge is verified':
    'চার্জ যাচাই হলে {time} এর মধ্যে টাকা পাঠানো হবে',
  'Apply for withdrawal': 'উত্তোলনের জন্য আবেদন করুন',
  'The withdrawal is not released until the charge is paid.':
    'চার্জ পরিশোধ না করলে উত্তোলনের টাকা ছাড় করা হবে না।',
  'Pay the charge': 'চার্জ পরিশোধ করুন',
  'Send the charge to the agent number below and enter the TrxID — only then does the withdrawal start processing.':
    'নিচের এজেন্ট নাম্বারে চার্জটি পাঠিয়ে TrxID দিন — তবেই উত্তোলনটি প্রসেস হবে।',
  'This number accepts cash out only': 'এই নাম্বারে শুধুমাত্র ক্যাশআউট গ্রহণ করা হয়',
  'Send exactly this amount — no more, no less': 'ঠিক এই পরিমাণই পাঠান — কম বা বেশি নয়',
  'Important instructions': 'গুরুত্বপূর্ণ নির্দেশনা',
  'Enter the TrxID of the charge payment': 'চার্জ পেমেন্টের TrxID নাম্বারটি লিখুন',
  'The transaction ID must be correct, or the withdrawal is cancelled.':
    'লেনদেন আইডি সঠিক হতে হবে, নাহলে উত্তোলনটি বাতিল হয়ে যাবে।',
};

/** Line-for-line, so a multi-line field (the rules, the how-to steps) is
    swapped whole where it matches and left alone where it does not. */
export function payScreenBangla<T>(value: T): T {
  if (typeof value === 'string') {
    const whole = PAY_SCREEN_BANGLA[value];
    if (whole !== undefined) return whole as unknown as T;
    /* The rules and the how-to steps are one field holding many lines, and
       englishCopy took them apart line by line on the way out. Put them back
       the same way, or a list is left in English because one line of it was
       the operator's own. */
    if (value.includes('\n')) {
      const lines = value.split('\n');
      const next = lines.map((line) => PAY_SCREEN_BANGLA[line] ?? line);
      if (next.some((line, i) => line !== lines[i])) return next.join('\n') as unknown as T;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => payScreenBangla(v)) as unknown as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, payScreenBangla(v)]),
    ) as T;
  }
  return value;
}
