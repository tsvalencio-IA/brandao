import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit as fbLimit,
  onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where
} from 'firebase/firestore';
import { db } from '../config/firebase';

const convert = (snap) => {
  const data = snap.data();
  const out = { id: snap.id, ...data };
  Object.keys(out).forEach((key) => {
    if (out[key]?.toDate) out[key] = out[key].toDate().toISOString();
  });
  return out;
};

const buildQuery = (name, options = {}) => {
  const constraints = [];
  Object.entries(options.filters || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') constraints.push(where(k, '==', v));
  });
  if (options.orderBy) constraints.push(orderBy(options.orderBy, options.direction || 'desc'));
  if (options.limit) constraints.push(fbLimit(options.limit));
  return constraints.length ? query(collection(db, name), ...constraints) : collection(db, name);
};

export const firebaseRepository = {
  mode: 'firebase',
  async list(name, options) {
    const snap = await getDocs(buildQuery(name, options));
    return snap.docs.map(convert);
  },
  async get(name, id) {
    const snap = await getDoc(doc(db, name, id));
    return snap.exists() ? convert(snap) : null;
  },
  async findOne(name, filters) {
    const snap = await getDocs(buildQuery(name, { filters, limit: 1 }));
    return snap.empty ? null : convert(snap.docs[0]);
  },
  async create(name, data, forcedId = null) {
    const payload = { ...data, created_at: serverTimestamp(), updated_at: serverTimestamp() };
    if (forcedId) {
      const ref = doc(db, name, forcedId);
      await setDoc(ref, payload, { merge: true });
      return { id: forcedId, ...data };
    }
    const ref = await addDoc(collection(db, name), payload);
    return { id: ref.id, ...data };
  },
  async update(name, id, patch) {
    await updateDoc(doc(db, name, id), { ...patch, updated_at: serverTimestamp() });
    return { id, ...patch };
  },
  async remove(name, id) { await deleteDoc(doc(db, name, id)); },
  subscribe(name, options, callback, onError) {
    return onSnapshot(buildQuery(name, options), (snap) => callback(snap.docs.map(convert)), onError);
  },
};
