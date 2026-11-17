import { PAYMENT } from "../lib/contact";

// M-Pesa till and bank details, with the booking reference to quote. Used in checkout and on the confirmation.
export default function PaymentDetails({ reference }: { reference?: string }) {
  const ref = reference ? <strong>{reference}</strong> : "your booking reference";
  return (
    <div className="grid gap-3 text-sm [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
      <div className="rounded-lg border border-[#e5e5e5] bg-white px-3.5 py-3">
        <div className="text-[13px] font-bold uppercase tracking-[1px] text-[#595959]">M-Pesa</div>
        <div className="mt-1">
          Lipa na M-Pesa, <strong>Buy Goods and Services</strong>
        </div>
        <div className="mt-0.5">
          Till number <strong className="text-lg tracking-[0.04em]">{PAYMENT.mpesaTill}</strong>
        </div>
        <div className="mt-1 text-[13px] text-[#595959]">Then send us the M-Pesa code, quoting {ref}.</div>
      </div>
      <div className="rounded-lg border border-[#e5e5e5] bg-white px-3.5 py-3">
        <div className="text-[13px] font-bold uppercase tracking-[1px] text-[#595959]">Bank transfer</div>
        <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
          <dt className="text-[#595959]">Bank</dt>
          <dd>{PAYMENT.bankName}</dd>
          <dt className="text-[#595959]">Name</dt>
          <dd>{PAYMENT.accountName}</dd>
          <dt className="text-[#595959]">Branch</dt>
          <dd>{PAYMENT.branch}</dd>
          <dt className="text-[#595959]">Account</dt>
          <dd>
            <strong>{PAYMENT.accountNumber}</strong>
          </dd>
          <dt className="text-[#595959]">Swift</dt>
          <dd>{PAYMENT.swift}</dd>
        </dl>
        <div className="mt-1 text-[13px] text-[#595959]">Use {ref} as the payment reference.</div>
      </div>
    </div>
  );
}
