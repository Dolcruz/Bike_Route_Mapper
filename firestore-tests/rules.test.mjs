// Emulator tests for ../firestore.rules (run with: npm test)
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, where, increment } from 'firebase/firestore';

const rules = readFileSync(process.argv[2], 'utf8');
const env = await initializeTestEnvironment({ projectId: 'demo-bike-rules', firestore: { rules, host: '127.0.0.1', port: 8187 } });

const alice = env.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true }).firestore();
const bob = env.authenticatedContext('bob', { email: 'bob@example.com', email_verified: true }).firestore();
const admin = env.authenticatedContext('falk', { email: 'pfistererfalk@gmail.com', email_verified: true }).firestore();
const fakeAdmin = env.authenticatedContext('mallory', { email: 'pfistererfalk@gmail.com', email_verified: false }).firestore();
const anon = env.unauthenticatedContext().firestore();

let pass = 0, fail = 0;
async function t(name, p) {
  try { await p; pass++; console.log('ok   ', name); }
  catch (e) { fail++; console.log('FAIL ', name, '\n      ', String(e.message || e).split('\n')[0]); }
}

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'routes', 'aliceApproved'), { userId: 'alice', name: 'A', points: [], isApproved: true, isAdminRoute: false, ratings: { carol: 4 }, rating: 4, ratingCount: 1 });
  await setDoc(doc(db, 'routes', 'alicePrivate'), { userId: 'alice', name: 'P', points: [], isApproved: false, isAdminRoute: false });
  await setDoc(doc(db, 'routes', 'aliceNav'), { userId: 'alice', name: 'N', points: [], type: 'navigation', isPublic: false });
  await setDoc(doc(db, 'userStats', 'alice'), { userId: 'alice', totalDistance: 1, xp: 5 });
  await setDoc(doc(db, 'bikeStands', 'aliceStand'), { createdBy: 'alice', position: { lat: 1, lng: 2 }, isApproved: false, verifications: 0 });
  await setDoc(doc(db, 'repairStations', 'aliceRepair'), { createdBy: 'alice', position: { lat: 1, lng: 2 } });
  await setDoc(doc(db, 'nextbike_stations', 's1'), { name: 'x' });
  await setDoc(doc(db, 'routes', 'toApprove'), { userId: 'alice', name: 'T', points: [], isApproved: false, isAdminRoute: false });
  await setDoc(doc(db, 'bikeStands', 'standToApprove'), { createdBy: 'alice', position: { lat: 1, lng: 2 }, isApproved: false });
});

// --- App flows that must keep working
await t('owner creates route (normal user flags false)', assertSucceeds(addDoc(collection(alice, 'routes'), { userId: 'alice', points: [], name: 'neu', isAdminRoute: false, isApproved: false })));
await t('owner creates navigation route (no flags)', assertSucceeds(addDoc(collection(alice, 'routes'), { userId: 'alice', points: [], name: 'nav', type: 'navigation', isPublic: false, status: 'planned' })));
await t('admin creates auto-approved route', assertSucceeds(addDoc(collection(admin, 'routes'), { userId: 'falk', points: [], isAdminRoute: true, isApproved: true })));
await t('query own routes', assertSucceeds(getDocs(query(collection(alice, 'routes'), where('userId', '==', 'alice')))));
await t('query approved routes as other user', assertSucceeds(getDocs(query(collection(bob, 'routes'), where('isApproved', '==', true)))));
await t('admin queries unapproved routes', assertSucceeds(getDocs(query(collection(admin, 'routes'), where('isAdminRoute', '==', false), where('isApproved', '==', false)))));
await t('owner edits route points', assertSucceeds(updateDoc(doc(alice, 'routes', 'alicePrivate'), { points: [{ lat: 1, lng: 1 }] })));
await t('owner marks route completed', assertSucceeds(updateDoc(doc(alice, 'routes', 'aliceNav'), { status: 'completed', completedAt: new Date() })));
await t('other user rates approved route', assertSucceeds(updateDoc(doc(bob, 'routes', 'aliceApproved'), { ratings: { carol: 4, bob: 5 }, rating: 4.5, ratingCount: 2 })));
await t('admin approves route', assertSucceeds(updateDoc(doc(admin, 'routes', 'toApprove'), { isApproved: true })));
await t('owner reads/writes own stats', assertSucceeds(updateDoc(doc(alice, 'userStats', 'alice'), { totalDistance: increment(3), xp: increment(10) })));
await t('owner creates own stats', assertSucceeds(setDoc(doc(bob, 'userStats', 'bob'), { userId: 'bob', totalDistance: 0 })));
await t('signed-in reads all bike stands', assertSucceeds(getDocs(collection(bob, 'bikeStands'))));
await t('create bike stand via BikeStandDialog shape', assertSucceeds(addDoc(collection(bob, 'bikeStands'), { createdBy: 'bob', position: { lat: 1, lng: 2 }, isRoofed: false, isFree: true, isLighted: false, description: null, capacity: null, rating: null })));
await t('other user verifies bike stand (+1)', assertSucceeds(updateDoc(doc(bob, 'bikeStands', 'aliceStand'), { verifications: 1, isVerified: false })));
await t('admin approves bike stand', assertSucceeds(updateDoc(doc(admin, 'bikeStands', 'standToApprove'), { isApproved: true })));
await t('create repair station', assertSucceeds(addDoc(collection(bob, 'repairStations'), { createdBy: 'bob', position: { lat: 1, lng: 2 }, hasTools: true })));
await t('owner deletes repair station', assertSucceeds(deleteDoc(doc(alice, 'repairStations', 'aliceRepair'))));
await t('read nextbike cache', assertSucceeds(getDoc(doc(bob, 'nextbike_stations', 's1'))));

// --- Attacks that the old rules allowed
await t('BLOCK anonymous read', assertFails(getDocs(collection(anon, 'bikeStands'))));
await t('BLOCK reading someone else\'s private route', assertFails(getDoc(doc(bob, 'routes', 'alicePrivate'))));
await t('BLOCK reading someone else\'s navigation route', assertFails(getDoc(doc(bob, 'routes', 'aliceNav'))));
await t('BLOCK listing all routes unfiltered', assertFails(getDocs(collection(bob, 'routes'))));
await t('BLOCK self-approving a new route', assertFails(addDoc(collection(bob, 'routes'), { userId: 'bob', points: [], isApproved: true })));
await t('BLOCK creating route in another user\'s name', assertFails(addDoc(collection(bob, 'routes'), { userId: 'alice', points: [] })));
await t('BLOCK owner self-approving existing route', assertFails(updateDoc(doc(alice, 'routes', 'aliceNav'), { isApproved: true })));
await t('BLOCK other user editing route content', assertFails(updateDoc(doc(bob, 'routes', 'aliceApproved'), { name: 'vandalised' })));
await t('BLOCK other user overwriting someone else\'s rating', assertFails(updateDoc(doc(bob, 'routes', 'aliceApproved'), { ratings: { carol: 1 }, rating: 1, ratingCount: 1 })));
await t('BLOCK rating out of range', assertFails(updateDoc(doc(bob, 'routes', 'aliceApproved'), { ratings: { carol: 4, bob: 99 }, rating: 50, ratingCount: 2 })));
await t('BLOCK other user deleting route', assertFails(deleteDoc(doc(bob, 'routes', 'aliceApproved'))));
await t('BLOCK reading another user\'s stats', assertFails(getDoc(doc(bob, 'userStats', 'alice'))));
await t('BLOCK writing another user\'s stats', assertFails(updateDoc(doc(bob, 'userStats', 'alice'), { xp: 999999 })));
await t('BLOCK other user deleting bike stand', assertFails(deleteDoc(doc(bob, 'bikeStands', 'aliceStand'))));
await t('BLOCK other user editing bike stand', assertFails(updateDoc(doc(bob, 'bikeStands', 'aliceStand'), { description: 'weg' })));
await t('BLOCK verification jump', assertFails(updateDoc(doc(bob, 'bikeStands', 'aliceStand'), { verifications: 50, isVerified: true })));
await t('BLOCK owner self-approving bike stand', assertFails(updateDoc(doc(alice, 'bikeStands', 'aliceStand'), { isApproved: true })));
await t('BLOCK unverified email claiming admin', assertFails(updateDoc(doc(fakeAdmin, 'routes', 'alicePrivate'), { isApproved: true })));
await t('BLOCK other user deleting repair station', assertFails(deleteDoc(doc(bob, 'repairStations', 'aliceRepair'))));
await t('BLOCK writing nextbike cache as user', assertFails(setDoc(doc(bob, 'nextbike_stations', 's1'), { name: 'y' })));
await t('BLOCK unknown collection', assertFails(setDoc(doc(bob, 'whatever', 'x'), { a: 1 })));

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
await env.cleanup();
process.exit(fail ? 1 : 0);
