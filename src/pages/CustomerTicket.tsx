import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import {
  createTicket, estimateWaitMinutes, getBusinessBySlug, watchPeopleAhead, watchQueues,
  watchStations, watchTicket, type Business, type QueueDoc, type Station, type Ticket
} from "../lib/queue";
import { LANGUAGE_NAMES, LOCALES, useI18n, type LocaleCode } from "../i18n";
import { getTheme } from "../lib/themes";

// One customer session = one ticket. We remember it in localStorage so a
// refresh (or reopening the installed PWA) doesn't lose their place in line.
function storageKey(businessId: string) {
  return `q-ticket-${businessId}`;
}

export default function CustomerTicket() {
  const { businessSlug } = useParams();
  const { t, locale, setLocale } = useI18n();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [business, setBusiness] = useState<Business | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [queues, setQueues] = useState<QueueDoc[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [myTicketId, setMyTicketId] = useState<string | null>(null);
  const [myTicket, setMyTicket] = useState<Ticket | null>(null);
  const [peopleAhead, setPeopleAhead] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Resolve the business from its slug in the QR link.
  useEffect(() => {
    if (!businessSlug) return;
    (async () => {
      const biz = await getBusinessBySlug(businessSlug);
      if (!biz) { setNotFound(true); return; }
      setBusinessId(biz.id);
      setBusinessName(biz.name ?? "");
      setBusiness(biz);
      const saved = localStorage.getItem(storageKey(biz.id));
      if (saved) setMyTicketId(saved);
    })();
  }, [businessSlug]);

  useEffect(() => {
    if (!businessId) return;
    const unsubQ = watchQueues(businessId, setQueues);
    const unsubS = watchStations(businessId, setStations);
    return () => { unsubQ(); unsubS(); };
  }, [businessId]);

  useEffect(() => {
    if (!businessId || !myTicketId) return;
    const unsub = watchTicket(businessId, myTicketId, (ticket) => {
      setMyTicket(ticket);
      if (!ticket) { localStorage.removeItem(storageKey(businessId)); setMyTicketId(null); }
    });
    return unsub;
  }, [businessId, myTicketId]);

  useEffect(() => {
    if (!businessId || !myTicket || myTicket.status !== "waiting") { setPeopleAhead(0); return; }
    return watchPeopleAhead(businessId, myTicket.queueId, myTicket.number, setPeopleAhead);
  }, [businessId, myTicket?.queueId, myTicket?.number, myTicket?.status]);

  async function handlePickQueue(q: QueueDoc) {
    if (!businessId) return;
    setError(null);
    try {
      const ticket = await createTicket(businessId, q.id);
      localStorage.setItem(storageKey(businessId), ticket.id);
      setMyTicketId(ticket.id);
    } catch (e: any) {
      setError(e.message === "cutoff" ? t.lineClosed : "Something went wrong — try again.");
    }
  }

  if (notFound) {
    return <div className="screen"><div className="ticket"><div className="ticket-label">Q</div>
      <p>We couldn't find that business. Check the QR code and try again.</p></div></div>;
  }
  if (!businessId) return <div className="screen" />;

  const activeStations = stations.filter((s) => s.status === "active").length;
  const currentQueue = myTicket ? queues.find((q) => q.id === myTicket.queueId) : undefined;
  const waitMinutes = currentQueue
    ? estimateWaitMinutes(peopleAhead, currentQueue.avgServiceSeconds, activeStations)
    : 0;

  const theme = getTheme(business?.theme);
  const themeStyle = theme.vars as CSSProperties;

  return (
    <div className="screen" style={themeStyle}>
      <select className="lang-picker" value={locale}
        onChange={(e) => setLocale(e.target.value as LocaleCode)}>
        {Object.keys(LOCALES).map((code) => (
          <option key={code} value={code}>{LANGUAGE_NAMES[code as LocaleCode]}</option>
        ))}
      </select>

      {business?.logoUrl && <img src={business.logoUrl} alt={businessName} className="biz-logo" />}

      {!myTicket && (
        <>
          <h2 style={{ marginBottom: 4 }}>{businessName}</h2>
          <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 18 }}>{t.chooseQueue}</p>
          <div className="queue-list">
            {queues.map((q) => (
              <button key={q.id} className="queue-option" disabled={q.cutoff}
                onClick={() => handlePickQueue(q)}>
                {q.name}{q.cutoff ? ` — ${t.lineClosed}` : ""}
              </button>
            ))}
          </div>
          {error && <p style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p>}
        </>
      )}

      {myTicket && myTicket.status === "waiting" && (
        <div className="ticket">
          <div className="ticket-label">{businessName} · {myTicket.queueName}</div>
          <div className="ticket-number">{String(myTicket.number).padStart(3, "0")}</div>
          <div className="ticket-row"><span>{t.peopleAhead}</span><span>{peopleAhead}</span></div>
          <div className="ticket-row"><span>{t.estimatedWait}</span><span>~{waitMinutes} {t.minutes}</span></div>
          <div className="wait-bar" />
        </div>
      )}

      {myTicket && myTicket.status === "called" && (
        <div className="ticket is-called">
          <div className="called-banner">{t.calledTitle}</div>
          <div className="ticket-label">{t.yourNumber}</div>
          <div className="ticket-number">{String(myTicket.number).padStart(3, "0")}</div>
          <div className="ticket-row"><span>{t.goTo}</span></div>
          <div className="station-name">{myTicket.stationName}</div>
        </div>
      )}

      {myTicket && myTicket.status === "served" && (
        <div className="ticket"><p>{t.served}</p></div>
      )}
    </div>
  );
}
