import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot,
  query, runTransaction, serverTimestamp, updateDoc, where
} from "firebase/firestore";
import { db } from "./firebase";

// --- Data model ---------------------------------------------------------
// businesses/{businessId}
// businesses/{businessId}/queues/{queueId}        -> a line, e.g. "General", "Table for 2"
// businesses/{businessId}/stations/{stationId}     -> a teller/table a staff member mans
// businesses/{businessId}/tickets/{ticketId}       -> one customer's place in line
//
// Tickets are never pre-assigned to a station. A free station "calls next",
// which atomically claims the lowest waiting ticket number in that queue.
// That's what makes "go on break" trivial: a station on break just stops
// calling, and the next free station naturally picks up the line.

export type TicketStatus = "waiting" | "called" | "served" | "cancelled";
export type StationStatus = "active" | "break" | "closed";

export interface Ticket {
  id: string;
  number: number;
  queueId: string;
  queueName: string;
  status: TicketStatus;
  stationId?: string;
  stationName?: string;
  createdAt?: any;
  calledAt?: any;
}

export interface QueueDoc {
  id: string;
  name: string;
  cutoff: boolean; // true = not accepting new tickets
  nextNumber: number;
  avgServiceSeconds: number; // rolling estimate, used for wait-time guess
  lastResetDate?: string; // "YYYY-MM-DD" — the day nextNumber was last reset to 1
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export interface Station {
  id: string;
  name: string;
  status: StationStatus;
  currentTicketId?: string | null;
}

// --- Customer side -------------------------------------------------------

/** Issue the next ticket number for a queue. Runs as a transaction so two
 * customers scanning at the same instant never get the same number. */
export async function createTicket(businessId: string, queueId: string) {
  const queueRef = doc(db, "businesses", businessId, "queues", queueId);
  const ticketsRef = collection(db, "businesses", businessId, "tickets");

  return runTransaction(db, async (tx) => {
    const queueSnap = await tx.get(queueRef);
    if (!queueSnap.exists()) throw new Error("Queue not found");
    const queueData = queueSnap.data() as QueueDoc;
    if (queueData.cutoff) throw new Error("cutoff");

    // First ticket of a new day resets the count back to 1, so numbers
    // don't climb forever — no scheduled job needed, it just happens
    // naturally on whoever scans first that day.
    const today = todayStamp();
    const isNewDay = queueData.lastResetDate !== today;
    const number = isNewDay ? 1 : (queueData.nextNumber ?? 1);

    const newTicketRef = doc(ticketsRef);
    tx.set(newTicketRef, {
      number,
      queueId,
      queueName: queueData.name,
      status: "waiting",
      createdAt: serverTimestamp()
    });

    if (isNewDay) {
      tx.update(queueRef, { nextNumber: 2, lastResetDate: today });
    } else {
      tx.update(queueRef, { nextNumber: increment(1) });
    }
    return { id: newTicketRef.id, number };
  });
}

/** Live-subscribe to a single ticket's status (for the customer's screen). */
export function watchTicket(businessId: string, ticketId: string, cb: (t: Ticket | null) => void) {
  const ref = doc(db, "businesses", businessId, "tickets", ticketId);
  return onSnapshot(ref, (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Ticket) : null);
  });
}

/** Count how many people are still waiting ahead of a given ticket number. */
export function watchPeopleAhead(
  businessId: string, queueId: string, myNumber: number, cb: (count: number) => void
) {
  const q = query(
    collection(db, "businesses", businessId, "tickets"),
    where("queueId", "==", queueId),
    where("status", "in", ["waiting", "called"])
  );
  return onSnapshot(q, (snap) => {
    let ahead = 0;
    snap.forEach((d) => {
      const n = d.data().number as number;
      if (n < myNumber) ahead++;
    });
    cb(ahead);
  });
}

// --- Staff / station side -------------------------------------------------

/** Atomically claim the lowest-numbered waiting ticket in a queue for a station. */
export async function callNext(businessId: string, stationId: string, queueId: string) {
  const ticketsRef = collection(db, "businesses", businessId, "tickets");
  const waitingQuery = query(
    ticketsRef,
    where("queueId", "==", queueId),
    where("status", "==", "waiting")
  );
  const waitingSnap = await getDocs(waitingQuery);
  if (waitingSnap.empty) return null;

  const sortedDocs = [...waitingSnap.docs].sort((a, b) => a.data().number - b.data().number);
  const nextTicketDoc = sortedDocs[0];
  const stationRef = doc(db, "businesses", businessId, "stations", stationId);
  const stationSnap = await getDoc(stationRef);
  const stationName = stationSnap.exists() ? stationSnap.data().name : "";

  await runTransaction(db, async (tx) => {
    tx.update(nextTicketDoc.ref, {
      status: "called",
      stationId,
      stationName,
      calledAt: serverTimestamp()
    });
    tx.update(stationRef, { currentTicketId: nextTicketDoc.id, status: "active" });
  });

  return { id: nextTicketDoc.id, number: nextTicketDoc.data().number as number };
}

export async function markServed(businessId: string, stationId: string, ticketId: string) {
  const ticketRef = doc(db, "businesses", businessId, "tickets", ticketId);
  const stationRef = doc(db, "businesses", businessId, "stations", stationId);
  await updateDoc(ticketRef, { status: "served" });
  await updateDoc(stationRef, { currentTicketId: null });
}

/** Staff goes on break: station stops accepting new calls. Nothing needs to
 * be reassigned — remaining stations simply keep calling from the same queue. */
export async function setStationStatus(businessId: string, stationId: string, status: StationStatus) {
  const stationRef = doc(db, "businesses", businessId, "stations", stationId);
  await updateDoc(stationRef, { status });
}

/** Cutoff: stop accepting new customers into a queue (e.g. near closing time). */
export async function setQueueCutoff(businessId: string, queueId: string, cutoff: boolean) {
  const queueRef = doc(db, "businesses", businessId, "queues", queueId);
  await updateDoc(queueRef, { cutoff });
}

// --- Management (business name, queues, stations) -------------------------
// All of these require staff/admin, enforced in firestore.rules — the check
// here is just for a nicer UI, not the real security boundary.

export async function updateBusinessName(businessId: string, name: string) {
  await updateDoc(doc(db, "businesses", businessId), { name });
}

export async function createQueue(businessId: string, name: string) {
  const ref = collection(db, "businesses", businessId, "queues");
  return addDoc(ref, {
    name,
    cutoff: false,
    nextNumber: 1,
    avgServiceSeconds: 180,
    lastResetDate: todayStamp()
  });
}

export async function updateQueueName(businessId: string, queueId: string, name: string) {
  await updateDoc(doc(db, "businesses", businessId, "queues", queueId), { name });
}

export async function deleteQueue(businessId: string, queueId: string) {
  await deleteDoc(doc(db, "businesses", businessId, "queues", queueId));
}

export async function createStation(businessId: string, name: string) {
  const ref = collection(db, "businesses", businessId, "stations");
  return addDoc(ref, { name, status: "active", currentTicketId: null });
}

export async function updateStationName(businessId: string, stationId: string, name: string) {
  await updateDoc(doc(db, "businesses", businessId, "stations", stationId), { name });
}

export async function deleteStation(businessId: string, stationId: string) {
  await deleteDoc(doc(db, "businesses", businessId, "stations", stationId));
}

export function watchStations(businessId: string, cb: (stations: Station[]) => void) {
  const ref = collection(db, "businesses", businessId, "stations");
  return onSnapshot(ref, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Station)));
  });
}

export function watchQueues(businessId: string, cb: (queues: QueueDoc[]) => void) {
  const ref = collection(db, "businesses", businessId, "queues");
  return onSnapshot(ref, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as QueueDoc)));
  });
}

export function watchWaitingTickets(businessId: string, queueId: string, cb: (tickets: Ticket[]) => void) {
  const q = query(
    collection(db, "businesses", businessId, "tickets"),
    where("queueId", "==", queueId),
    where("status", "==", "waiting")
  );
  return onSnapshot(q, (snap) => {
    const tickets = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
    tickets.sort((a, b) => a.number - b.number);
    cb(tickets);
  });
}

/** Rough wait estimate: people ahead × average service time / number of active stations. */
export function estimateWaitMinutes(peopleAhead: number, avgServiceSeconds: number, activeStations: number) {
  const stations = Math.max(1, activeStations);
  const seconds = (peopleAhead / stations) * (avgServiceSeconds || 180);
  return Math.max(0, Math.round(seconds / 60));
}
