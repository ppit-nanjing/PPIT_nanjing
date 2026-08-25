// Builds an `alipays://` deep link that opens the Alipay app straight to a
// transfer screen with the amount + memo pre-filled, targeting a specific
// recipient by their numeric Alipay member ID (2088...).
//
// This is NOT the real Alipay payment API - it's a reverse-engineered scheme
// (appId 20000123, actionType=scan) that's widely used by individuals/small
// orgs in China for exactly this "no merchant account" situation, but it is
// undocumented by Alipay and can stop working without notice. It also only
// opens the Alipay app itself (not embedded browsers like WeChat's, which
// block cross-app scheme launches) and needs Alipay installed. Payment
// confirmation is still 100% manual: this just saves the participant from
// having to type the amount and a matching memo themselves.
export function buildAlipayTransferLink(alipayUid: string, amountCny: number, memo: string) {
  const bizData = JSON.stringify({
    s: "money",
    u: alipayUid.trim(),
    a: amountCny.toFixed(2),
    // Alipay truncates long memos in the UI; keep it short so it's still
    // legible and still enough for the bendahara to match against the bill.
    m: memo.slice(0, 40),
  });
  return `alipays://platformapi/startapp?appId=20000123&actionType=scan&biz_data=${encodeURIComponent(bizData)}`;
}
