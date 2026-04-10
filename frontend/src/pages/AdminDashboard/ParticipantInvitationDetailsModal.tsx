import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { appendParticipantUid, normalizeShortLinkUrl, withoutUidParameter } from '../../utils/linkUrlUtils';

interface ParticipantInvitationDetailsModalProps {
  isOpen: boolean;
  invitationId: string | null;
  onClose: () => void;
}

function formatWhen(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' (ET)';
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="border-b border-slate-100 align-top last:border-b-0">
      <th
        scope="row"
        className="w-[min(11rem,36%)] py-2.5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}
      </th>
      <td className="min-w-0 py-2.5 text-sm text-slate-800 break-words">{value}</td>
    </tr>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/80 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="px-3 py-1">
        <table className="w-full table-fixed border-collapse">
          <tbody>{children}</tbody>
        </table>
      </div>
    </section>
  );
}

function Copyable({ text }: { text: string }) {
  if (!text) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex min-w-0 w-full max-w-full flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
      <span className="min-w-0 flex-1 font-mono text-[13px] leading-relaxed text-slate-900 break-all">
        {text}
      </span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(text);
        }}
        className="shrink-0 self-start rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        Copy
      </button>
    </div>
  );
}

const ParticipantInvitationDetailsModal: React.FC<ParticipantInvitationDetailsModalProps> = ({
  isOpen,
  invitationId,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inv, setInv] = useState<any>(null);
  const [hasGiftCard, setHasGiftCard] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isOpen || !invitationId) {
      setInv(null);
      setError(null);
      setHasGiftCard(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setInv(null);
    setHasGiftCard(null);

    const run = async () => {
      try {
        const [invitationData, giftCheck] = await Promise.all([
          api.get(`/api/admin/invitations/${invitationId}`),
          api.get(`/api/admin/gift-cards/check-invitation/${invitationId}`).catch(() => null),
        ]);
        if (cancelled) return;
        setInv(invitationData);
        if (giftCheck && typeof giftCheck.hasGiftCard === 'boolean') {
          setHasGiftCard(giftCheck.hasGiftCard);
        } else {
          setHasGiftCard(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load details');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, invitationId]);

  if (!isOpen) return null;

  const p = inv?.participant;
  const uid = p?.linkPublicUid as string | undefined;
  const baseLong = (inv?.linkUrl as string) || '';
  const baseShortRaw = inv?.shortLinkUrl as string | null | undefined;
  const baseShortNorm = normalizeShortLinkUrl(baseShortRaw || null);
  const shortAsTexted = baseShortNorm ? withoutUidParameter(baseShortNorm) : null;

  const titleName =
    p?.name && String(p.name).trim() ? String(p.name).trim() : p?.phone || 'Participant';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="participant-details-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-br from-blue-700 to-blue-800 px-6 py-5 text-white">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-blue-200/90">Participant details</p>
            <h2 id="participant-details-title" className="mt-1 text-xl font-semibold tracking-tight">
              {titleName}
            </h2>
            {p?.phone && (
              <p className="mt-1 font-mono text-sm text-blue-100">{p.phone}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/90 transition hover:bg-white/10"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-5 py-5">
          {loading && (
            <div className="flex justify-center py-16 text-slate-500">
              <div className="flex items-center gap-3 text-sm">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                Loading details…
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          {!loading && !error && inv && (
            <div className="flex flex-col gap-5">
              <Section title="Participant">
                <DetailRow label="Participant ID" value={<Copyable text={p?.id || ''} />} />
                <DetailRow label="Name" value={p?.name || '—'} />
                <DetailRow label="Phone" value={p?.phone || '—'} />
                <DetailRow label="Email" value={p?.email || '—'} />
                <DetailRow
                  label="Phone verified"
                  value={p?.phoneVerified === true ? 'Yes' : p?.phoneVerified === false ? 'No' : '—'}
                />
                <DetailRow label="Status" value={p?.status || '—'} />
                <DetailRow
                  label="Link public UID"
                  value={
                    p?.linkPublicUid ? (
                      <Copyable text={String(p.linkPublicUid)} />
                    ) : (
                      <span className="text-slate-500">Not set (legacy signup)</span>
                    )
                  }
                />
                <DetailRow label="Signup IP" value={p?.signupIp || '—'} />
                <DetailRow label="Consent at" value={formatWhen(p?.consentAt)} />
                <DetailRow label="Account created" value={formatWhen(p?.createdAt)} />
                <DetailRow label="Phone verified at" value={formatWhen(p?.verifiedAt)} />
              </Section>

              <Section title="Survey & SMS">
                <DetailRow label="Invitation ID" value={<Copyable text={inv?.id || ''} />} />
                <DetailRow label="Survey completed" value={formatWhen(inv?.completedAt)} />
                <DetailRow label="SMS status" value={inv?.messageStatus || '—'} />
                <DetailRow
                  label="Survey link sent (SMS)"
                  value={formatWhen(inv?.sentAt || inv?.queuedAt)}
                />
                <DetailRow
                  label="Survey link (long)"
                  value={
                    baseLong ? (
                      <Copyable text={appendParticipantUid(baseLong, uid) || baseLong} />
                    ) : (
                      '—'
                    )
                  }
                />
                <DetailRow
                  label="Survey link (short, as texted)"
                  value={
                    shortAsTexted ? (
                      <Copyable text={shortAsTexted} />
                    ) : (
                      <span className="text-slate-500">No short link</span>
                    )
                  }
                />
              </Section>

              <Section title="Gift card">
                <DetailRow
                  label="Gift card on file for this invitation"
                  value={
                    hasGiftCard === null
                      ? '—'
                      : hasGiftCard
                        ? 'Yes'
                        : 'No'
                  }
                />
                <DetailRow
                  label="Note"
                  value={
                    <p className="text-xs leading-relaxed text-slate-600">
                      Codes are usually sent in an end-of-day batch. &quot;No&quot; may mean not sent yet or not
                      eligible—confirm in your gift-card workflow if unsure.
                    </p>
                  }
                />
              </Section>
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 sm:w-auto"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ParticipantInvitationDetailsModal;
